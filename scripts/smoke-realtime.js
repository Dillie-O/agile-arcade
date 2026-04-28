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

(async () => {
  const base = process.env.AGILE_ARCADE_BASE_URL || "http://127.0.0.1:3000";

  const create = await fetch(`${base}/api/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deckType: "fibonacci" }),
  });

  const { roomId } = await create.json();
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

  reconnectedClient.disconnect();
  secondClient.disconnect();
  console.log("ALL INTERACTIVE CHECKS PASSED");
})().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exit(1);
});
