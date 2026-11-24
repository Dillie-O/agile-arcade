const { randomBytes, timingSafeEqual } = require("crypto");

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const _graceMsParsed = parseInt(process.env.DISCONNECT_GRACE_MS, 10);
const DISCONNECT_GRACE_MS = Number.isNaN(_graceMsParsed) ? 30 * 1000 : Math.max(0, _graceMsParsed);
// How long a participant must be disconnected before auto-reveal stops waiting
// for their vote. Long enough to ride out a page refresh; negative restores the
// old rule of waiting for every participant, connected or not.
const _settleMsParsed = parseInt(process.env.AUTO_REVEAL_DISCONNECT_SETTLE_MS, 10);
const AUTO_REVEAL_DISCONNECT_SETTLE_MS = Number.isNaN(_settleMsParsed) ? 5 * 1000 : _settleMsParsed;

const rooms = new Map();

const validDeckTypes = ["fibonacci", "tshirt"];

const VALID_VOTES = {
  fibonacci: ["1", "2", "3", "5", "8", "13", "21", "☕"],
  tshirt: ["XS", "S", "M", "L", "XL", "?", "∞", "☕"],
};

const isValidVote = (deckType, value) => {
  const deck = VALID_VOTES[deckType];
  return deck ? deck.includes(value) : false;
};

// Unguessable secret for host keys and rejoin tokens. Never part of a snapshot.
const generateSecret = () => randomBytes(24).toString("base64url");

// Constant-time comparison of two secrets; false for anything but two equal,
// non-empty strings.
const secretsMatch = (provided, expected) => {
  if (typeof provided !== "string" || typeof expected !== "string" || !provided || !expected) {
    return false;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

const getDeckValues = (deckType) => [...(VALID_VOTES[deckType] || [])];

const generateRoomId = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";

  while (id.length < 6) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return id;
};

const createRoom = (deckType = "fibonacci") => {
  const normalizedDeckType = validDeckTypes.includes(deckType) ? deckType : "fibonacci";
  let roomId = generateRoomId();

  while (rooms.has(roomId)) {
    roomId = generateRoomId();
  }

  const now = Date.now();
  const room = {
    id: roomId,
    deckType: normalizedDeckType,
    hostKey: generateSecret(),
    participants: [],
    story: "",
    revealed: false,
    timerEndsAt: null,
    createdAt: now,
    lastActivityAt: now,
  };

  rooms.set(roomId, room);
  return room;
};

const getRoom = (roomId) => {
  return rooms.get(String(roomId || "").toUpperCase());
};

const touchRoom = (roomId) => {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  room.lastActivityAt = Date.now();
};

const addParticipant = (roomId, participant) => {
  const room = getRoom(roomId);
  if (!room) {
    return null;
  }

  const entry = {
    id: participant.id,
    name: participant.name,
    emoji: participant.emoji,
    vote: undefined,
    hasVoted: false,
    isHost: room.participants.length === 0,
    disconnectedAt: null,
    isBot: participant.isBot === true,
    rejoinToken: generateSecret(),
  };

  room.participants.push(entry);
  touchRoom(roomId);
  return entry;
};

// Makes the given participant the only host.
const claimHost = (roomId, participantId) => {
  const room = getRoom(roomId);
  if (!room || !room.participants.some((item) => item.id === participantId)) {
    return false;
  }

  for (const item of room.participants) {
    item.isHost = item.id === participantId;
  }
  return true;
};

const removeParticipant = (roomId, participantId) => {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  const removed = room.participants.find((item) => item.id === participantId);
  room.participants = room.participants.filter((item) => item.id !== participantId);

  if (removed?.isHost && room.participants.length > 0) {
    const nextHost = room.participants.find((p) => p.disconnectedAt === null) ?? room.participants[0];
    nextHost.isHost = true;
  }

  if (room.participants.length === 0) {
    rooms.delete(room.id);
    return;
  }

  touchRoom(roomId);
};

const markParticipantDisconnected = (roomId, participantId) => {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  const participant = room.participants.find((item) => item.id === participantId);
  if (!participant) {
    return;
  }

  participant.disconnectedAt = Date.now();
};

const reconnectParticipant = (roomId, participantId) => {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  const participant = room.participants.find((item) => item.id === participantId);
  if (!participant) {
    return;
  }

  participant.disconnectedAt = null;
};

const evictStalledParticipants = (graceMs = DISCONNECT_GRACE_MS, referenceNow = Date.now()) => {
  for (const room of [...rooms.values()]) {
    const staleIds = room.participants
      .filter((p) => p.disconnectedAt !== null && referenceNow - p.disconnectedAt > graceMs)
      .map((p) => p.id);

    for (const id of staleIds) {
      removeParticipant(room.id, id);
    }
  }
};

const setParticipantVote = (roomId, participantId, value) => {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  const participant = room.participants.find((item) => item.id === participantId);
  if (!participant) {
    return;
  }

  participant.vote = value;
  participant.hasVoted = true;
};

const setParticipantEmoji = (roomId, participantId, emoji) => {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  const participant = room.participants.find((item) => item.id === participantId);
  if (!participant) {
    return;
  }

  participant.emoji = emoji;
};

const setParticipantProfile = (roomId, participantId, profile = {}) => {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  const participant = room.participants.find((item) => item.id === participantId);
  if (!participant) {
    return;
  }

  const nextName = String(profile.name || "").trim();
  const nextEmoji = String(profile.emoji || "").trim();

  if (nextName) {
    participant.name = nextName.slice(0, 30);
  }

  if (nextEmoji) {
    participant.emoji = nextEmoji;
  }
};

const setRoomStory = (roomId, story = "") => {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  room.story = String(story).slice(0, 140);
};

const revealVotes = (roomId) => {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  room.revealed = true;
  room.timerEndsAt = null;
};

const resetRound = (roomId) => {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  room.revealed = false;
  room.story = "";
  room.timerEndsAt = null;
  room.participants = room.participants.map((item) => ({
    ...item,
    vote: undefined,
    hasVoted: false,
  }));
};

/**
 * True when the round should reveal on its own: every participant still at the
 * table has voted. Someone disconnected for at least `settleMs` is no longer
 * waited for, so a crashed client cannot hold the round open. At least one
 * present participant must have voted.
 */
const shouldAutoReveal = (room, now = Date.now(), settleMs = AUTO_REVEAL_DISCONNECT_SETTLE_MS) => {
  if (!room || room.revealed) {
    return false;
  }

  const present = room.participants.filter(
    (p) => settleMs < 0 || p.disconnectedAt === null || now - p.disconnectedAt < settleMs
  );
  return present.length > 0 && present.every((p) => p.hasVoted);
};

const setRoomTimer = (roomId, endsAt) => {
  const room = getRoom(roomId);
  if (!room) {
    return;
  }

  room.timerEndsAt = endsAt;
};

const roomToSnapshot = (room) => ({
  id: room.id,
  deckType: room.deckType,
  participants: room.participants.map((item) => ({
    id: item.id,
    name: item.name,
    emoji: item.emoji,
    hasVoted: item.hasVoted,
    isHost: item.isHost,
    vote: room.revealed ? item.vote : undefined,
    isDisconnected: item.disconnectedAt !== null,
    isBot: Boolean(item.isBot),
  })),
  story: room.story,
  revealed: room.revealed,
  timerEndsAt: room.timerEndsAt,
  createdAt: room.createdAt,
  lastActivityAt: room.lastActivityAt,
});

const startCleanupJob = () => {
  const ttlInterval = setInterval(() => {
    const now = Date.now();

    for (const [roomId, room] of rooms.entries()) {
      if (now - room.lastActivityAt > ROOM_TTL_MS) {
        rooms.delete(roomId);
      }
    }
  }, 5 * 60 * 1000);

  const evictInterval = setInterval(() => {
    evictStalledParticipants();
  }, 10 * 1000);

  return { ttlInterval, evictInterval };
};

module.exports = {
  rooms,
  createRoom,
  getRoom,
  touchRoom,
  addParticipant,
  claimHost,
  removeParticipant,
  markParticipantDisconnected,
  reconnectParticipant,
  evictStalledParticipants,
  setParticipantVote,
  setParticipantEmoji,
  setParticipantProfile,
  setRoomStory,
  setRoomTimer,
  revealVotes,
  resetRound,
  shouldAutoReveal,
  AUTO_REVEAL_DISCONNECT_SETTLE_MS,
  roomToSnapshot,
  isValidVote,
  getDeckValues,
  secretsMatch,
  startCleanupJob,
};