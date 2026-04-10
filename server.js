const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const {
  createRoom,
  getRoom,
  roomToSnapshot,
  touchRoom,
  addParticipant,
  removeParticipant,
  setParticipantVote,
  setParticipantEmoji,
  setParticipantProfile,
  setRoomStory,
  revealVotes,
  resetRound,
  isValidVote,
  startCleanupJob,
} = require("./server/rooms");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const nextHandler = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/api/create-room") {
      let raw = "";
      let tooLarge = false;

      req.on("data", (chunk) => {
        raw += chunk;
        if (raw.length > 1024) {
          tooLarge = true;
          res.statusCode = 413;
          res.end("Payload too large");
          req.destroy();
        }
      });

      req.on("end", () => {
        if (tooLarge) return;
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
        res.end(JSON.stringify({ roomId: room.id }));
      });

      return;
    }

    nextHandler(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  const emitRoom = (roomId) => {
    const room = getRoom(roomId);
    if (!room) {
      return;
    }

    io.to(roomId).emit("room_state", roomToSnapshot(room));
  };

  io.on("connection", (socket) => {
    let lastVoteAt = 0;

    socket.on("join_room", (payload = {}) => {
      const roomId = String(payload.roomId || "").toUpperCase();
      const name = String(payload.name || "").trim();
      const emoji = String(payload.emoji || "🎮").trim() || "🎮";
      const participantId = String(payload.participantId || socket.id).trim() || socket.id;

      if (!roomId || !name) {
        socket.emit("error", "Invalid room or name");
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        socket.emit("room_not_found");
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.participantId = participantId;

      const existing = room.participants.find((p) => p.id === participantId);
      if (existing) {
        existing.name = name;
        existing.emoji = emoji;
      } else {
        addParticipant(roomId, { id: participantId, name, emoji });
      }

      touchRoom(roomId);
      emitRoom(roomId);
    });

    socket.on("cast_vote", (payload = {}) => {
      const roomId = String(payload.roomId || socket.data.roomId || "").toUpperCase();
      const value = String(payload.value || "").trim();
      const participantId = socket.data.participantId || socket.id;

      if (!roomId || !value) {
        socket.emit("error", "Invalid vote payload");
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        socket.emit("room_not_found");
        return;
      }

      if (!isValidVote(room.deckType, value)) {
        socket.emit("error", "Invalid vote value");
        return;
      }

      const now = Date.now();
      if (now - lastVoteAt < 500) {
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
        revealVotes(roomId);
      }

      emitRoom(roomId);
    });

    socket.on("change_emoji", (payload = {}) => {
      const roomId = String(payload.roomId || socket.data.roomId || "").toUpperCase();
      const emoji = String(payload.emoji || "").trim();
      const participantId = socket.data.participantId || socket.id;

      if (!roomId || !emoji) {
        socket.emit("error", "Invalid emoji payload");
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        socket.emit("room_not_found");
        return;
      }

      setParticipantEmoji(roomId, participantId, emoji);
      touchRoom(roomId);
      emitRoom(roomId);
    });

    socket.on("update_profile", (payload = {}) => {
      const roomId = String(payload.roomId || socket.data.roomId || "").toUpperCase();
      const name = String(payload.name || "").trim();
      const emoji = String(payload.emoji || "").trim();
      const participantId = socket.data.participantId || socket.id;

      if (!roomId) {
        socket.emit("error", "Invalid profile payload");
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        socket.emit("room_not_found");
        return;
      }

      setParticipantProfile(roomId, participantId, { name, emoji });
      touchRoom(roomId);
      emitRoom(roomId);
    });

    socket.on("update_story", (payload = {}) => {
      const roomId = String(payload.roomId || socket.data.roomId || "").toUpperCase();
      const story = String(payload.story || "");
      const participantId = socket.data.participantId || socket.id;
      const room = getRoom(roomId);

      if (!room) {
        socket.emit("room_not_found");
        return;
      }

      const participant = room.participants.find((item) => item.id === participantId);
      if (!participant || !participant.isHost) {
        socket.emit("not_authorized");
        return;
      }

      setRoomStory(roomId, story);
      touchRoom(roomId);
      emitRoom(roomId);
    });

    socket.on("reveal_votes", (payload = {}) => {
      const roomId = String(payload.roomId || socket.data.roomId || "").toUpperCase();
      const participantId = socket.data.participantId || socket.id;
      const room = getRoom(roomId);

      if (!room) {
        socket.emit("room_not_found");
        return;
      }

      const participant = room.participants.find((item) => item.id === participantId);
      if (!participant || !participant.isHost) {
        socket.emit("not_authorized");
        return;
      }

      revealVotes(roomId);
      touchRoom(roomId);
      emitRoom(roomId);
    });

    socket.on("reset_round", (payload = {}) => {
      const roomId = String(payload.roomId || socket.data.roomId || "").toUpperCase();
      const participantId = socket.data.participantId || socket.id;
      const room = getRoom(roomId);

      if (!room) {
        socket.emit("room_not_found");
        return;
      }

      const participant = room.participants.find((item) => item.id === participantId);
      if (!participant || !participant.isHost) {
        socket.emit("not_authorized");
        return;
      }

      resetRound(roomId);
      touchRoom(roomId);
      emitRoom(roomId);
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      const participantId = socket.data.participantId || socket.id;

      if (!roomId || !participantId) {
        return;
      }

      removeParticipant(roomId, participantId);
      touchRoom(roomId);
      emitRoom(roomId);
    });
  });

  startCleanupJob();

  server.listen(port, hostname, () => {
    console.log(`> Agile Arcade running at http://${hostname}:${port}`);
  });
});