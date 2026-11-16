const { io } = require("socket.io-client");
const { randomUUID } = require("crypto");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(check, timeoutMs = 7000, stepMs = 50, label = "condition") {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const value = await check();
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

  // The host joins with an ack to receive its private rejoinToken; the peer
  // joins the original way, with no callback.
  const hostJoin = await request(firstClient, "join_room", {
    roomId,
    name: "HostUser",
    emoji: "🎮",
    participantId: hostParticipantId,
  });
  assert(hostJoin.ok && typeof hostJoin.rejoinToken === "string", "host join returns rejoinToken");
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
  reconnectedClient.emit("join_room", {
    roomId,
    name: "HostUser",
    emoji: "🎮",
    participantId: hostParticipantId,
    rejoinToken: hostJoin.rejoinToken,
  });

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

async function hostAndRejoinChecks(base) {
  const created = await createRoom(base);
  const { roomId, hostKey } = created;
  assert(typeof hostKey === "string" && hostKey.length >= 16, "create-room returns a hostKey");

  const early = await connect(base);
  const owner = await connect(base);
  const thief = await connect(base);
  let ownerAgain = null;

  try {
    // Without a host key, the first joiner is host — the fallback the UI relies on.
    const earlyJoin = await request(early, "join_room", { roomId, name: "EarlyBird", participantId: randomUUID() });
    assert(earlyJoin.ok && earlyJoin.isHost === true, "first joiner without hostKey becomes host");

    const wrongKey = await request(thief, "join_room", { roomId, name: "Thief", hostKey: "not-the-key" });
    assert(wrongKey.ok === false && wrongKey.error.code === "INVALID_HOST_KEY", "expected INVALID_HOST_KEY");

    const ownerId = randomUUID();
    const ownerJoin = await request(owner, "join_room", { roomId, name: "Owner", participantId: ownerId, hostKey });
    assert(ownerJoin.ok && ownerJoin.isHost === true, "hostKey join claims host");
    const hosts = ownerJoin.state.participants.filter((p) => p.isHost);
    assert(hosts.length === 1 && hosts[0].id === ownerId, "exactly one host after the claim");
    const stale = await request(early, "update_story", { roomId, story: "mine" });
    assert(stale.ok === false && stale.error.code === "NOT_HOST", "previous host lost host rights");
    console.log("hostKey: first-joiner fallback, INVALID_HOST_KEY, claim moves host: ok");

    const snapshotText = JSON.stringify(ownerJoin.state);
    assert(!snapshotText.includes(hostKey), "hostKey leaked into the snapshot");
    assert(!snapshotText.includes(ownerJoin.rejoinToken), "rejoinToken leaked into the snapshot");
    assert(ownerJoin.rejoinToken !== earlyJoin.rejoinToken, "rejoin tokens are per participant");
    console.log("secrets: hostKey and rejoinToken absent from room_state: ok");

    owner.disconnect();
    await sleep(300);

    const noToken = await request(thief, "join_room", { roomId, name: "Thief", participantId: ownerId });
    assert(noToken.ok === false && noToken.error.code === "INVALID_REJOIN_TOKEN", "reclaim without token rejected");
    const badToken = await request(thief, "join_room", {
      roomId,
      name: "Thief",
      participantId: ownerId,
      rejoinToken: earlyJoin.rejoinToken,
    });
    assert(badToken.ok === false && badToken.error.code === "INVALID_REJOIN_TOKEN", "reclaim with another seat's token rejected");

    ownerAgain = await connect(base);
    const reclaimed = await request(ownerAgain, "join_room", {
      roomId,
      name: "Owner",
      participantId: ownerId,
      rejoinToken: ownerJoin.rejoinToken,
    });
    assert(reclaimed.ok && reclaimed.participantId === ownerId, "reclaim with token keeps the seat");
    assert(reclaimed.isHost === true, "reclaimed seat keeps host");
    assert(reclaimed.rejoinToken === ownerJoin.rejoinToken, "rejoinToken is stable across reconnects");
    const ownerEntry = reclaimed.state.participants.find((p) => p.id === ownerId);
    assert(ownerEntry && !ownerEntry.isDisconnected, "reclaimed seat is connected");
    console.log("rejoinToken: rejected without/with wrong token, reclaim with token: ok");
  } finally {
    early.disconnect();
    owner.disconnect();
    thief.disconnect();
    ownerAgain?.disconnect();
  }
}

async function restBotAndRevealChecks(base) {
  const { roomId } = await createRoom(base);
  const bots = await Promise.all([connect(base), connect(base), connect(base)]);
  const [alpha, beta, crasher] = bots;

  try {
    const missing = await fetch(`${base}/api/rooms/ZZZZZZ`);
    assert(missing.status === 404, `expected 404 for unknown room, got ${missing.status}`);
    const missingBody = await missing.json();
    assert(missingBody.error?.code === "ROOM_NOT_FOUND", "404 body carries ROOM_NOT_FOUND");

    const empty = await fetch(`${base}/api/rooms/${roomId.toLowerCase()}`);
    assert(empty.status === 200, `expected 200 for room, got ${empty.status}`);
    assert((await empty.json()).id === roomId, "GET is case-insensitive");

    const alphaJoin = await request(alpha, "join_room", { roomId, name: "Alpha", isBot: true, participantId: randomUUID() });
    await request(beta, "join_room", { roomId, name: "Beta", participantId: randomUUID() });
    const crashJoin = await request(crasher, "join_room", { roomId, name: "Crasher", isBot: true, participantId: randomUUID() });
    const byName = Object.fromEntries(crashJoin.state.participants.map((p) => [p.name, p]));
    assert(byName.Alpha.isBot === true && byName.Crasher.isBot === true, "isBot: true in snapshot");
    assert(byName.Beta.isBot === false, "isBot defaults to false");
    console.log("isBot: flag in snapshot: ok");

    await request(alpha, "cast_vote", { roomId, value: "5" });
    await request(beta, "cast_vote", { roomId, value: "8" });

    const hidden = await (await fetch(`${base}/api/rooms/${roomId}`)).json();
    assert(hidden.revealed === false, "REST: not revealed yet");
    assert(hidden.participants.every((p) => p.vote === undefined), "REST: votes hidden before reveal");
    assert(hidden.participants.filter((p) => p.hasVoted).length === 2, "REST: hasVoted visible");
    assert(!JSON.stringify(hidden).includes(alphaJoin.rejoinToken), "REST: no rejoinToken");
    const socketView = alphaJoin.state;
    assert(Object.keys(hidden).sort().join() === Object.keys(socketView).sort().join(), "REST snapshot has room_state's shape");
    console.log("REST: GET /api/rooms/:roomId 404, case-insensitive, votes hidden: ok");

    // The crasher drops without voting. The round must not reveal at once (a
    // human refreshing gets a moment to come back) but must not stall either.
    crasher.disconnect();
    await sleep(1000);
    const stillOpen = await (await fetch(`${base}/api/rooms/${roomId}`)).json();
    assert(stillOpen.revealed === false, "no instant reveal when a player disconnects");
    assert(stillOpen.participants.find((p) => p.name === "Crasher")?.isDisconnected === true, "crasher marked disconnected");

    const revealed = await waitUntil(
      async () => {
        const state = await (await fetch(`${base}/api/rooms/${roomId}`)).json();
        return state.revealed ? state : null;
      },
      15000,
      250,
      "auto-reveal after a voter disconnected"
    );
    const votes = revealed.participants.filter((p) => p.vote).map((p) => p.vote).sort().join(",");
    assert(votes === "5,8", `unexpected revealed votes: ${votes}`);
    console.log("auto-reveal: disconnected non-voter no longer blocks the round: ok");
  } finally {
    bots.forEach((socket) => socket.disconnect());
  }
}

(async () => {
  const base = process.env.AGILE_ARCADE_BASE_URL || "http://127.0.0.1:3000";
  await legacyFlow(base);
  await ackChecks(base);
  await hostAndRejoinChecks(base);
  await restBotAndRevealChecks(base);
  console.log("ALL INTERACTIVE CHECKS PASSED");
})().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exit(1);
});
