const { io } = require("socket.io-client");

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

  firstClient.emit("join_room", { roomId, name: "HostUser", emoji: "🎮" });
  secondClient.emit("join_room", { roomId, name: "PeerUser", emoji: "🚀" });

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

  await waitUntil(
    () =>
      secondState &&
      secondState.participants.length === 1 &&
      secondState.participants[0].name === "PeerUser" &&
      secondState.participants[0].isHost,
    7000,
    50,
    "host transfer after disconnect"
  );
  console.log("host transfer on disconnect: ok");

  secondClient.disconnect();
  console.log("ALL INTERACTIVE CHECKS PASSED");
})().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exit(1);
});
