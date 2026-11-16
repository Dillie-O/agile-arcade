#!/usr/bin/env node
/**
 * Bot demo: plays one full round of Agile Arcade with headless clients.
 *
 *   node scripts/bot-demo.js [--base URL] [--bots N] [--deck fibonacci|tshirt] [--story TEXT]
 *
 * It creates a room, joins N bots (the first one becomes host), has the host
 * set a story, has every bot vote, waits for the automatic reveal and prints
 * the results. It exits non-zero if any step fails, so it doubles as a test.
 *
 * See docs/PROTOCOL.md for the protocol this script speaks.
 */
const { io } = require("socket.io-client");
const { randomUUID } = require("crypto");

const DECKS = {
  fibonacci: ["1", "2", "3", "5", "8", "13", "21"],
  tshirt: ["XS", "S", "M", "L", "XL"],
};

const BOT_NAMES = ["Robo Rita", "Unit 42", "Beep Boop", "HAL-ish", "Clank", "Sprocket", "Widget", "Gizmo"];
const BOT_EMOJI = ["🤖", "👾", "🛸", "⚙️", "🔧", "🧪", "📡", "🔋"];

const parseArgs = (argv) => {
  const args = {
    base: process.env.AGILE_ARCADE_BASE_URL || "http://127.0.0.1:3000",
    bots: 3,
    deck: "fibonacci",
    story: "Bot demo: estimate the robot uprising",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--base") args.base = value;
    else if (key === "--bots") args.bots = Number(value);
    else if (key === "--deck") args.deck = value;
    else if (key === "--story") args.story = value;
    else if (key === "--help" || key === "-h") {
      console.log("usage: node scripts/bot-demo.js [--base URL] [--bots N] [--deck fibonacci|tshirt] [--story TEXT]");
      process.exit(0);
    } else continue;
    i += 1;
  }
  if (!Number.isInteger(args.bots) || args.bots < 1 || args.bots > BOT_NAMES.length) {
    throw new Error(`--bots must be between 1 and ${BOT_NAMES.length}`);
  }
  if (!DECKS[args.deck]) {
    throw new Error("--deck must be fibonacci or tshirt");
  }
  return args;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (check, label, timeoutMs = 7000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = check();
    if (value) return value;
    await sleep(50);
  }
  throw new Error(`timed out waiting for ${label}`);
};

const connectBot = async (base, index) => {
  const socket = io(base, { transports: ["websocket"], reconnection: false });
  const bot = {
    socket,
    name: BOT_NAMES[index],
    emoji: BOT_EMOJI[index],
    participantId: randomUUID(),
    state: null,
    errors: [],
  };
  socket.on("room_state", (state) => {
    bot.state = state;
  });
  socket.on("error", (message) => bot.errors.push(String(message)));
  socket.on("room_not_found", () => bot.errors.push("room_not_found"));
  socket.on("not_authorized", () => bot.errors.push("not_authorized"));
  await waitFor(() => socket.connected, `${bot.name} to connect`);
  return bot;
};

const assertNoErrors = (bots) => {
  for (const bot of bots) {
    if (bot.errors.length > 0) {
      throw new Error(`${bot.name} received errors: ${bot.errors.join(", ")}`);
    }
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  const response = await fetch(`${args.base}/api/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deckType: args.deck }),
  });
  if (!response.ok) {
    throw new Error(`create-room failed with HTTP ${response.status}`);
  }
  const { roomId } = await response.json();
  console.log(`room ${roomId} created (${args.deck}) — watch it at ${args.base}/game/${roomId}/kiosk`);

  const bots = [];
  for (let i = 0; i < args.bots; i += 1) {
    bots.push(await connectBot(args.base, i));
  }

  try {
    // Join one at a time so the first bot is reliably the first joiner, and
    // therefore the host.
    for (const bot of bots) {
      bot.socket.emit("join_room", {
        roomId,
        name: bot.name,
        emoji: bot.emoji,
        participantId: bot.participantId,
      });
      await waitFor(
        () => bot.state?.participants?.some((p) => p.id === bot.participantId),
        `${bot.name} to join`
      );
    }
    const host = bots[0];
    const last = bots[bots.length - 1];
    await waitFor(() => host.state?.participants?.length === bots.length, "all bots in the room");
    if (!host.state.participants.find((p) => p.id === host.participantId)?.isHost) {
      throw new Error(`${host.name} is not the host`);
    }
    console.log(`${bots.length} bot(s) joined; ${host.name} is host`);

    host.socket.emit("update_story", { roomId, story: args.story });
    await waitFor(() => last.state?.story === args.story, "story to propagate");
    console.log(`story set: ${args.story}`);

    const deck = DECKS[args.deck];
    for (const bot of bots) {
      const value = deck[Math.floor(Math.random() * deck.length)];
      bot.socket.emit("cast_vote", { roomId, value });
    }

    // The server reveals automatically once every participant has voted.
    await waitFor(() => host.state?.revealed === true, "automatic reveal");
    assertNoErrors(bots);

    console.log("revealed results:");
    for (const participant of host.state.participants) {
      console.log(`  ${participant.emoji} ${participant.name.padEnd(12)} ${participant.vote}`);
    }
    const missing = host.state.participants.filter((p) => !p.vote);
    if (missing.length > 0) {
      throw new Error(`no vote revealed for ${missing.map((p) => p.name).join(", ")}`);
    }
    console.log("BOT DEMO PASSED");
  } finally {
    for (const bot of bots) bot.socket.disconnect();
  }
};

main().catch((error) => {
  console.error("BOT DEMO FAILED:", error.message);
  process.exit(1);
});
