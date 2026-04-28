const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const _graceMsParsed = parseInt(process.env.DISCONNECT_GRACE_MS, 10);
const DISCONNECT_GRACE_MS = Number.isNaN(_graceMsParsed) ? 30 * 1000 : _graceMsParsed;

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
  };

  room.participants.push(entry);
  touchRoom(roomId);
  return entry;
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
  roomToSnapshot,
  isValidVote,
  startCleanupJob,
};