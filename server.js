const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const ngrok = require("@ngrok/ngrok");
const {
  createRoom,
  getRoom,
  roomToSnapshot,
  touchRoom,
  addParticipant,
  claimHost,
  removeParticipant,
  markParticipantDisconnected,
  reconnectParticipant,
  setParticipantVote,
  setParticipantEmoji,
  setParticipantProfile,
  setRoomStory,
  setRoomTimer,
  revealVotes,
  resetRound,
  isValidVote,
  getDeckValues,
  secretsMatch,
  startCleanupJob,
} = require("./server/rooms");
const { ERROR_CODES, normalizeArgs, createResponder } = require("./server/protocol");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);

// Maps participantId -> socketId to prevent impersonation
const activeParticipants = new Map();

// Maps roomId -> server-side timer handle for countdown
const roomTimers = new Map();

// Maps roomId -> socketId for the single active kiosk viewer per room
const kioskSockets = new Map();

// Minimum gap between two votes from the same socket.
const VOTE_INTERVAL_MS = 500;

const VALID_TIMER_DURATIONS = [5, 10, 15, 20, 25, 30];

// Rate-limit state for tunnel creation
let lastTunnelAttemptAt = 0;
const TUNNEL_RATE_LIMIT_MS = 5000;

let activeTunnel = null;

const app = next({ dev, hostname, port });
const nextHandler = app.getRequestHandler();

const readBody = (req, maxBytes = 1024) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxBytes) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/api/create-room") {
      let raw;
      try {
        raw = await readBody(req);
      } catch {
        res.statusCode = 413;
        res.end("Payload too large");
        return;
      }

      let deckType = "fibonacci";
      try {
        const body = JSON.parse(raw || "{}");
        if (body.deckType === "fibonacci" || body.deckType === "tshirt") {
          deckType = body.deckType;
        }
      } catch {
        deckType = "fibonacci";
      }

      const room = createRoom(deckType);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      // hostKey is a secret: whoever joins with it becomes host. It is never
      // included in room snapshots.
      res.end(JSON.stringify({ roomId: room.id, hostKey: room.hostKey }));
      return;
    }

    if (req.method === "POST" && req.url === "/api/start-tunnel") {
      let raw;
      try {
        raw = await readBody(req);
      } catch {
        res.statusCode = 413;
        res.end("Payload too large");
        return;
      }

      let authtoken;
      try {
        ({ authtoken } = JSON.parse(raw || "{}"));
      } catch {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      if (!authtoken || typeof authtoken !== "string" || authtoken.length > 512) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "authtoken is required" }));
        return;
      }

      const now = Date.now();
      if (now - lastTunnelAttemptAt < TUNNEL_RATE_LIMIT_MS) {
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Too many requests, please wait a moment" }));
        return;
      }
      lastTunnelAttemptAt = now;

      try {
        if (activeTunnel) {
          await activeTunnel.close();
          activeTunnel = null;
        }
        activeTunnel = await ngrok.forward({ addr: port, authtoken });
        const url = activeTunnel.url();
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ url }));
      } catch (err) {
        res.statusCode = 502;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err.message || "Failed to start tunnel" }));
      }
      return;
    }

    if (req.method === "POST" && req.url === "/api/stop-tunnel") {
      try {
        if (activeTunnel) {
          await activeTunnel.close();
          activeTunnel = null;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err.message || "Failed to stop tunnel" }));
      }
      return;
    }

    nextHandler(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
    pingInterval: 10000,
    pingTimeout: 30000,
  });

  const emitRoom = (roomId) => {
    const room = getRoom(roomId);
    if (!room) {
      return;
    }

    io.to(roomId).emit("room_state", roomToSnapshot(room));
  };

  const snapshotOf = (roomId) => {
    const room = getRoom(roomId);
    return room ? roomToSnapshot(room) : null;
  };

  const clearRoomTimer = (roomId) => {
    if (roomTimers.has(roomId)) {
      clearTimeout(roomTimers.get(roomId));
      roomTimers.delete(roomId);
    }
  };

  io.on("connection", (socket) => {
    let lastVoteAt = 0;

    // Registers a handler that receives a normalised payload and a responder
    // (see server/protocol.js). Every event accepts an optional ack callback.
    const on = (event, handler) => {
      socket.on(event, (rawPayload, rawAck) => {
        const { payload, ack } = normalizeArgs(rawPayload, rawAck);
        const reply = createResponder(socket, ack);
        try {
          handler(payload, reply);
        } catch (err) {
          console.error(`Error handling ${event}:`, err);
          reply.fail(ERROR_CODES.INTERNAL_ERROR, "Something went wrong");
        }
      });
    };

    const replyWithState = (reply, roomId, extra = {}) => {
      reply.ok({ state: snapshotOf(roomId), ...extra });
    };

    const resolveRoomId = (payload) => String(payload.roomId || socket.data.roomId || "").toUpperCase();
    const currentParticipantId = () => socket.data.participantId || socket.id;

    const roomNotFound = (reply) => reply.fail(ERROR_CODES.ROOM_NOT_FOUND, "Room not found");

    // Returns the acting participant if they are the host; otherwise replies
    // with NOT_JOINED / NOT_HOST (both `not_authorized` without an ack).
    const requireHost = (room, reply) => {
      const participant = room.participants.find((item) => item.id === currentParticipantId());
      if (!participant) {
        reply.fail(ERROR_CODES.NOT_JOINED, "Join the room first", { legacyEvent: "not_authorized" });
        return null;
      }
      if (!participant.isHost) {
        reply.fail(ERROR_CODES.NOT_HOST, "Only the host can do that");
        return null;
      }
      return participant;
    };

    on("join_viewer", (payload, reply) => {
      const roomId = String(payload.roomId || "").toUpperCase();

      if (!roomId) {
        reply.fail(ERROR_CODES.INVALID_PAYLOAD, "Invalid room");
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        roomNotFound(reply);
        return;
      }

      const existingKioskId = kioskSockets.get(roomId);
      if (existingKioskId && existingKioskId !== socket.id) {
        const existingSocket = io.sockets.sockets.get(existingKioskId);
        if (existingSocket?.connected) {
          reply.fail(ERROR_CODES.KIOSK_OCCUPIED, "This room already has a kiosk viewer");
          return;
        }
        // Stale entry — the previous kiosk socket is no longer connected; clean it up.
        kioskSockets.delete(roomId);
      }

      if (socket.data.viewerRoomId && socket.data.viewerRoomId !== roomId) {
        const prevRoom = socket.data.viewerRoomId;
        if (kioskSockets.get(prevRoom) === socket.id) {
          kioskSockets.delete(prevRoom);
        }
        socket.leave(prevRoom);
      }

      socket.join(roomId);
      socket.data.viewerRoomId = roomId;
      kioskSockets.set(roomId, socket.id);
      touchRoom(roomId);
      emitRoom(roomId);
      replyWithState(reply, roomId);
    });

    on("join_room", (payload, reply) => {
      const roomId = String(payload.roomId || "").toUpperCase();
      const name = String(payload.name || "").trim();
      const emoji = String(payload.emoji || "🎮").trim() || "🎮";
      const clientId = String(payload.participantId || "").trim();
      const hostKey = payload.hostKey == null ? "" : String(payload.hostKey);
      const rejoinToken = payload.rejoinToken == null ? "" : String(payload.rejoinToken);

      // If the requested ID is already owned by a different active socket, don't
      // allow impersonation — fall back to socket.id for this connection.
      let participantId;
      if (clientId && activeParticipants.has(clientId) && activeParticipants.get(clientId) !== socket.id) {
        participantId = socket.id;
      } else {
        participantId = clientId || socket.id;
      }
      if (!roomId || !name) {
        reply.fail(ERROR_CODES.INVALID_PAYLOAD, "Invalid room or name");
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        roomNotFound(reply);
        return;
      }

      if (hostKey && !secretsMatch(hostKey, room.hostKey)) {
        reply.fail(ERROR_CODES.INVALID_HOST_KEY, "That host key does not match this room");
        return;
      }

      // Participant ids are public (every snapshot lists them), so reclaiming a
      // seat someone else is not actively holding takes that seat's private
      // rejoin token. A socket repeating its own join needs no token.
      const existing = room.participants.find((p) => p.id === participantId);
      const ownsSeat = activeParticipants.get(participantId) === socket.id;
      if (existing && !ownsSeat && !secretsMatch(rejoinToken, existing.rejoinToken)) {
        reply.fail(
          ERROR_CODES.INVALID_REJOIN_TOKEN,
          "That seat is taken. Rejoin with its rejoinToken, or join with a new participantId."
        );
        return;
      }

      if (socket.data.viewerRoomId) {
        const prevViewerRoom = socket.data.viewerRoomId;
        if (kioskSockets.get(prevViewerRoom) === socket.id) {
          kioskSockets.delete(prevViewerRoom);
        }
        socket.leave(prevViewerRoom);
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.participantId = participantId;
      activeParticipants.set(participantId, socket.id);
      socket.data.viewerRoomId = undefined;

      let seat = existing;
      if (seat) {
        seat.name = name;
        seat.emoji = emoji;
        reconnectParticipant(roomId, participantId);
      } else {
        seat = addParticipant(roomId, { id: participantId, name, emoji });
      }

      if (hostKey) {
        claimHost(roomId, participantId);
      }

      touchRoom(roomId);
      emitRoom(roomId);
      // rejoinToken goes to this socket only, never into a broadcast.
      replyWithState(reply, roomId, { participantId, rejoinToken: seat.rejoinToken, isHost: seat.isHost });
    });

    on("cast_vote", (payload, reply) => {
      const roomId = resolveRoomId(payload);
      const value = String(payload.value || "").trim();
      const participantId = currentParticipantId();

      if (!roomId || !value) {
        reply.fail(ERROR_CODES.INVALID_PAYLOAD, "Invalid vote payload");
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        roomNotFound(reply);
        return;
      }

      if (!isValidVote(room.deckType, value)) {
        reply.fail(ERROR_CODES.INVALID_VOTE, "Invalid vote value", {
          details: { allowed: getDeckValues(room.deckType) },
        });
        return;
      }

      const participant = room.participants.find((item) => item.id === participantId);
      if (!participant) {
        reply.fail(ERROR_CODES.NOT_JOINED, "Join the room before voting");
        return;
      }

      const now = Date.now();
      const sinceLastVote = now - lastVoteAt;
      if (sinceLastVote < VOTE_INTERVAL_MS) {
        reply.fail(ERROR_CODES.RATE_LIMITED, "Voting too fast. Try again in a moment.", {
          details: { retryAfterMs: VOTE_INTERVAL_MS - sinceLastVote },
        });
        return;
      }
      lastVoteAt = now;

      setParticipantVote(roomId, participantId, value);
      touchRoom(roomId);

      const updatedRoom = getRoom(roomId);
      const allVoted =
        updatedRoom &&
        updatedRoom.participants.length > 0 &&
        updatedRoom.participants.every((p) => p.hasVoted) &&
        !updatedRoom.revealed;

      if (allVoted) {
        clearRoomTimer(roomId);
        revealVotes(roomId);
      }

      emitRoom(roomId);
      replyWithState(reply, roomId);
    });

    on("change_emoji", (payload, reply) => {
      const roomId = resolveRoomId(payload);
      const emoji = String(payload.emoji || "").trim();
      const participantId = currentParticipantId();

      if (!roomId || !emoji) {
        reply.fail(ERROR_CODES.INVALID_PAYLOAD, "Invalid emoji payload");
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        roomNotFound(reply);
        return;
      }

      setParticipantEmoji(roomId, participantId, emoji);
      touchRoom(roomId);
      emitRoom(roomId);
      replyWithState(reply, roomId);
    });

    on("update_profile", (payload, reply) => {
      const roomId = resolveRoomId(payload);
      const name = String(payload.name || "").trim();
      const emoji = String(payload.emoji || "").trim();
      const participantId = currentParticipantId();

      if (!roomId) {
        reply.fail(ERROR_CODES.INVALID_PAYLOAD, "Invalid profile payload");
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        roomNotFound(reply);
        return;
      }

      setParticipantProfile(roomId, participantId, { name, emoji });
      touchRoom(roomId);
      emitRoom(roomId);
      replyWithState(reply, roomId);
    });

    on("update_story", (payload, reply) => {
      const roomId = resolveRoomId(payload);
      const story = String(payload.story || "");
      const room = getRoom(roomId);

      if (!room) {
        roomNotFound(reply);
        return;
      }

      if (!requireHost(room, reply)) {
        return;
      }

      setRoomStory(roomId, story);
      touchRoom(roomId);
      emitRoom(roomId);
      replyWithState(reply, roomId);
    });

    on("start_timer", (payload, reply) => {
      const roomId = resolveRoomId(payload);
      const duration = Number(payload.duration);
      const room = getRoom(roomId);

      if (!room) {
        roomNotFound(reply);
        return;
      }

      if (!requireHost(room, reply)) {
        return;
      }

      if (!VALID_TIMER_DURATIONS.includes(duration)) {
        reply.fail(ERROR_CODES.INVALID_TIMER_DURATION, "Invalid timer duration", {
          details: { allowed: VALID_TIMER_DURATIONS },
        });
        return;
      }

      if (room.revealed) {
        // Historically silent for clients without an ack.
        reply.fail(ERROR_CODES.ALREADY_REVEALED, "Votes are already revealed. Reset the round first.", {
          legacyEvent: null,
        });
        return;
      }

      // Cancel any existing timer for this room
      clearRoomTimer(roomId);

      const endsAt = Date.now() + duration * 1000;
      setRoomTimer(roomId, endsAt);
      touchRoom(roomId);
      emitRoom(roomId);
      replyWithState(reply, roomId);

      const handle = setTimeout(() => {
        try {
          const currentRoom = getRoom(roomId);
          if (currentRoom && !currentRoom.revealed) {
            revealVotes(roomId);
            touchRoom(roomId);
            emitRoom(roomId);
          }
        } finally {
          roomTimers.delete(roomId);
        }
      }, duration * 1000);
      roomTimers.set(roomId, handle);
    });

    on("reveal_votes", (payload, reply) => {
      const roomId = resolveRoomId(payload);
      const room = getRoom(roomId);

      if (!room) {
        roomNotFound(reply);
        return;
      }

      if (!requireHost(room, reply)) {
        return;
      }

      clearRoomTimer(roomId);
      revealVotes(roomId);
      touchRoom(roomId);
      emitRoom(roomId);
      replyWithState(reply, roomId);
    });

    on("reset_round", (payload, reply) => {
      const roomId = resolveRoomId(payload);
      const room = getRoom(roomId);

      if (!room) {
        roomNotFound(reply);
        return;
      }

      if (!requireHost(room, reply)) {
        return;
      }

      clearRoomTimer(roomId);
      resetRound(roomId);
      touchRoom(roomId);
      emitRoom(roomId);
      replyWithState(reply, roomId);
    });

    on("remove_participant", (payload, reply) => {
      const roomId = resolveRoomId(payload);
      const targetParticipantId = String(payload.participantId || "").trim();
      const participantId = currentParticipantId();
      const room = getRoom(roomId);

      if (!room) {
        roomNotFound(reply);
        return;
      }

      if (!targetParticipantId) {
        reply.fail(ERROR_CODES.INVALID_PAYLOAD, "Invalid participant removal payload");
        return;
      }

      if (!requireHost(room, reply)) {
        return;
      }

      if (targetParticipantId === participantId) {
        reply.fail(ERROR_CODES.CANNOT_REMOVE_SELF, "Host cannot remove themselves");
        return;
      }

      const target = room.participants.find((item) => item.id === targetParticipantId);
      if (!target) {
        reply.fail(ERROR_CODES.PARTICIPANT_NOT_FOUND, "Participant not found");
        return;
      }

      removeParticipant(roomId, targetParticipantId);
      touchRoom(roomId);

      const targetSocketId = activeParticipants.get(targetParticipantId);
      if (targetSocketId) {
        activeParticipants.delete(targetParticipantId);
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.leave(roomId);
          targetSocket.data.roomId = undefined;
          targetSocket.data.participantId = undefined;
          targetSocket.emit("removed_from_room");
        }
      }

      emitRoom(roomId);
      replyWithState(reply, roomId);
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId || socket.data.viewerRoomId;
      const participantId = socket.data.participantId || null;

      if (participantId) {
        activeParticipants.delete(participantId);
      }

      const viewerRoomId = socket.data.viewerRoomId;
      if (viewerRoomId && kioskSockets.get(viewerRoomId) === socket.id) {
        kioskSockets.delete(viewerRoomId);
      }

      if (!roomId || !participantId) {
        return;
      }

      markParticipantDisconnected(roomId, participantId);
      touchRoom(roomId);
      emitRoom(roomId);
    });
  });

  startCleanupJob();

  server.listen(port, hostname, () => {
    console.log(`> Agile Arcade running at http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
