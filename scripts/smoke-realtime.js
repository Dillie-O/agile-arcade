const { io } = require("socket.io-client");
const { randomUUID } = require("crypto");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(check, timeoutMs = 7000, stepMs = 50, label = "condition") {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const value = check();
    if (value) {
      return value;
    }
    await sleep(stepMs);
  }

  throw new Error(`timeout waiting for ${label}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function createRoom(base, deckType = "fibonacci") {
  const response = await fetch(`${base}/api/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deckType }),
  });
  assert(response.ok, `create-room failed with HTTP ${response.status}`);
  return response.json();
}

async function connect(base) {
  const socket = io(base, { transports: ["websocket"], reconnection: false });
  await waitUntil(() => socket.connected, 7000, 50, "socket connect");
  return socket;
}

// Emits with an ack callback and resolves with the server's reply.
const request = (socket, event, payload) => socket.timeout(5000).emitWithAck(event, payload);

// Original flow: no ack callbacks, so it also guards the legacy events the UI relies on.
async function legacyFlow(base) {
  const { roomId } = await createRoom(base);
  if (!/^[A-Z0-9]{6}$/.test(roomId)) {
    throw new Error(`invalid roomId: ${roomId}`);
  }

  console.log("room created:", roomId);

  const firstClient = io(base, { transports: ["websocket"] });
  const secondClient = io(base, { transports: ["websocket"] });

  let firstState = null;
  let secondState = null;
  let firstRoomNotFound = false;
  let secondRoomNotFound = false;
  let secondRemovedFromRoom = false;

  firstClient.on("room_state", (state) => {
    firstState = state;
  });
  secondClient.on("room_state", (state) => {
    secondState = state;
  });
  firstClient.on("room_not_found", () => {
    firstRoomNotFound = true;
  });
  secondClient.on("room_not_found", () => {
    secondRoomNotFound = true;
  });
  secondClient.on("removed_from_room", () => {
    secondRemovedFromRoom = true;
  });

  await Promise.all([
    waitUntil(() => firstClient.connected, 7000, 50, "first socket connect"),
    waitUntil(() => secondClient.connected, 7000, 50, "second socket connect"),
  ]);

  const hostParticipantId = randomUUID();
  const peerParticipantId = randomUUID();

  firstClient.emit("join_room", { roomId, name: "HostUser", emoji: "🎮", participantId: hostParticipantId });
  secondClient.emit("join_room", { roomId, name: "PeerUser", emoji: "🚀", participantId: peerParticipantId });

  await waitUntil(() => firstState?.participants?.length === 2, 7000, 50, "both participants in first state");
  await waitUntil(() => secondState?.participants?.length === 2, 7000, 50, "both participants in second state");

  if (firstRoomNotFound || secondRoomNotFound) {
    throw new Error("unexpected room_not_found during join");
  }

  const host = firstState.participants.find((participant) => participant.isHost);
  if (!host || host.name !== "HostUser") {
    throw new Error("first participant was not host");
  }
  console.log("join + host assignment: ok");

  firstClient.emit("cast_vote", { roomId, value: "5" });
  secondClient.emit("cast_vote", { roomId, value: "8" });

  await waitUntil(
    () => firstState && firstState.participants.every((participant) => participant.hasVoted),
    7000,
    50,
    "all votes cast"
  );
  console.log("cast vote: ok");

  firstClient.emit("reveal_votes", { roomId });
  await waitUntil(() => firstState?.revealed === true, 7000, 50, "revealed state");

  const votes = firstState.participants
    .map((participant) => participant.vote)
    .sort()
    .join(",");

  if (votes !== "5,8") {
    throw new Error(`unexpected revealed votes: ${votes}`);
  }
  console.log("reveal votes: ok");

  firstClient.emit("reset_round", { roomId });
  await waitUntil(
    () =>
      firstState &&
      !firstState.revealed &&
      firstState.participants.every((participant) => !participant.hasVoted && participant.vote === undefined),
    7000,
    50,
    "reset state"
  );
  console.log("reset round: ok");

  firstClient.disconnect();

  // With the grace period the host remains in the participant list but is
  // flagged as disconnected — no immediate host transfer should occur.
  await waitUntil(
    () => {
      const hostEntry = secondState?.participants?.find((p) => p.id === hostParticipantId);
      return hostEntry?.isDisconnected === true && hostEntry?.isHost === true;
    },
    7000,
    50,
    "host marked disconnected but still host"
  );
  console.log("grace period: host marked disconnected, host flag retained: ok");

  // Reconnect the host with the same participantId — they should be restored.
  const reconnectedClient = io(base, { transports: ["websocket"] });
  let reconnectedState = null;
  reconnectedClient.on("room_state", (state) => {
    reconnectedState = state;
  });

  await waitUntil(() => reconnectedClient.connected, 7000, 50, "reconnected socket connect");
  reconnectedClient.emit("join_room", { roomId, name: "HostUser", emoji: "🎮", participantId: hostParticipantId });

  await waitUntil(
    () => {
      const hostEntry = reconnectedState?.participants?.find((p) => p.id === hostParticipantId);
      return hostEntry?.isDisconnected === false && hostEntry?.isHost === true;
    },
    7000,
    50,
    "host restored after reconnect"
  );
  console.log("reconnect: host restored with isHost and isDisconnected cleared: ok");

  reconnectedClient.emit("remove_participant", { roomId, participantId: peerParticipantId });
  await waitUntil(() => secondRemovedFromRoom === true, 7000, 50, "peer removed notification");
  await waitUntil(
    () =>
      reconnectedState &&
      reconnectedState.participants.length === 1 &&
      reconnectedState.participants[0]?.id === hostParticipantId,
    7000,
    50,
    "peer removed from room state"
  );
  console.log("host remove participant: ok");

  reconnectedClient.disconnect();
  secondClient.disconnect();
}

async function ackChecks(base) {
  const { roomId } = await createRoom(base);
  const host = await connect(base);
  const peer = await connect(base);
  const outsider = await connect(base);

  try {
    const joined = await request(host, "join_room", { roomId, name: "AckHost", participantId: randomUUID() });
    assert(joined.ok === true, `join_room ack not ok: ${JSON.stringify(joined)}`);
    assert(joined.state?.id === roomId, "join_room ack missing room state");
    assert(typeof joined.participantId === "string", "join_room ack missing participantId");
    console.log("ack: join_room returns { ok, state, participantId }: ok");

    const peerJoin = await request(peer, "join_room", { roomId, name: "AckPeer", participantId: randomUUID() });
    assert(peerJoin.ok && peerJoin.state.participants.length === 2, "peer join ack");

    const missing = await request(outsider, "join_room", { roomId: "ZZZZZZ", name: "Lost" });
    assert(missing.ok === false && missing.error.code === "ROOM_NOT_FOUND", `expected ROOM_NOT_FOUND: ${JSON.stringify(missing)}`);
    const badJoin = await request(outsider, "join_room", { roomId });
    assert(badJoin.ok === false && badJoin.error.code === "INVALID_PAYLOAD", "expected INVALID_PAYLOAD");
    const notJoined = await request(outsider, "reveal_votes", { roomId });
    assert(notJoined.ok === false && notJoined.error.code === "NOT_JOINED", "expected NOT_JOINED");
    const notHost = await request(peer, "update_story", { roomId, story: "nope" });
    assert(notHost.ok === false && notHost.error.code === "NOT_HOST", "expected NOT_HOST");
    assert(typeof notHost.error.message === "string" && notHost.error.message.length > 0, "error message missing");
    console.log("ack: ROOM_NOT_FOUND, INVALID_PAYLOAD, NOT_JOINED, NOT_HOST: ok");

    const story = await request(host, "update_story", { roomId, story: "PROJ-1" });
    assert(story.ok && story.state.story === "PROJ-1", "update_story ack");
    const timer = await request(host, "start_timer", { roomId, duration: 30 });
    assert(timer.ok && typeof timer.state.timerEndsAt === "number", "start_timer ack");
    const badTimer = await request(host, "start_timer", { roomId, duration: 7 });
    assert(badTimer.ok === false && badTimer.error.code === "INVALID_TIMER_DURATION", "expected INVALID_TIMER_DURATION");

    const badVote = await request(host, "cast_vote", { roomId, value: "4" });
    assert(badVote.ok === false && badVote.error.code === "INVALID_VOTE", "expected INVALID_VOTE");
    assert(Array.isArray(badVote.error.allowed) && badVote.error.allowed.includes("5"), "INVALID_VOTE lists allowed values");

    const vote = await request(host, "cast_vote", { roomId, value: "3" });
    assert(vote.ok === true, `cast_vote ack not ok: ${JSON.stringify(vote)}`);
    const tooFast = await request(host, "cast_vote", { roomId, value: "5" });
    assert(tooFast.ok === false && tooFast.error.code === "RATE_LIMITED", `expected RATE_LIMITED: ${JSON.stringify(tooFast)}`);
    assert(tooFast.error.retryAfterMs > 0 && tooFast.error.retryAfterMs <= 500, "RATE_LIMITED retryAfterMs");
    await sleep(tooFast.error.retryAfterMs);
    const retried = await request(host, "cast_vote", { roomId, value: "5" });
    assert(retried.ok === true, "vote after retryAfterMs accepted");
    console.log("ack: cast_vote, INVALID_VOTE, RATE_LIMITED with retryAfterMs, retry: ok");

    // Without an ack, the rate limit arrives as an `error` event: the message
    // first (as before), the structured error second.
    const legacyErrors = [];
    peer.on("error", (message, detail) => legacyErrors.push({ message, detail }));
    peer.emit("cast_vote", { roomId, value: "8" });
    peer.emit("cast_vote", { roomId, value: "13" });
    await waitUntil(() => legacyErrors.length > 0, 7000, 50, "legacy RATE_LIMITED error event");
    assert(typeof legacyErrors[0].message === "string", "legacy error message is a string");
    assert(legacyErrors[0].detail?.code === "RATE_LIMITED", "legacy error carries RATE_LIMITED code");
    assert(legacyErrors[0].detail.retryAfterMs > 0, "legacy error carries retryAfterMs");
    console.log("event: RATE_LIMITED via error event: ok");

    // Both have voted, so the round auto-revealed on the peer's first vote.
    const reset = await request(host, "reset_round", { roomId });
    assert(reset.ok && reset.state.revealed === false, "reset_round ack");
    const reveal = await request(host, "reveal_votes", { roomId });
    assert(reveal.ok && reveal.state.revealed === true, "reveal_votes ack");
    const lateTimer = await request(host, "start_timer", { roomId, duration: 5 });
    assert(lateTimer.ok === false && lateTimer.error.code === "ALREADY_REVEALED", "expected ALREADY_REVEALED");

    const removeSelf = await request(host, "remove_participant", { roomId, participantId: joined.participantId });
    assert(removeSelf.ok === false && removeSelf.error.code === "CANNOT_REMOVE_SELF", "expected CANNOT_REMOVE_SELF");
    const removeGhost = await request(host, "remove_participant", { roomId, participantId: "nobody" });
    assert(removeGhost.ok === false && removeGhost.error.code === "PARTICIPANT_NOT_FOUND", "expected PARTICIPANT_NOT_FOUND");
    const removed = await request(host, "remove_participant", { roomId, participantId: peerJoin.participantId });
    assert(removed.ok && removed.state.participants.length === 1, "remove_participant ack");
    console.log("ack: update_story, start_timer, reveal_votes, reset_round, remove_participant: ok");
  } finally {
    host.disconnect();
    peer.disconnect();
    outsider.disconnect();
  }
}

(async () => {
  const base = process.env.AGILE_ARCADE_BASE_URL || "http://127.0.0.1:3000";
  await legacyFlow(base);
  await ackChecks(base);
  console.log("ALL INTERACTIVE CHECKS PASSED");
})().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exit(1);
});
