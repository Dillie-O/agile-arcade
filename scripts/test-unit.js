const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const {
  rooms,
  createRoom,
  getRoom,
  addParticipant,
  removeParticipant,
  markParticipantDisconnected,
  reconnectParticipant,
  evictStalledParticipants,
  setParticipantVote,
  setParticipantProfile,
  setRoomStory,
  revealVotes,
  resetRound,
  roomToSnapshot,
  isValidVote,
  claimHost,
  secretsMatch,
} = require("../server/rooms");

// Mirror of toSafeHttpUrl from src/app/game/[roomId]/room-client.tsx
function toSafeHttpUrl(value) {
  if (!value) return null;
  if (!/^https?:\/\/\S+$/.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      if (parsed.username || parsed.password) {
        return null;
      }
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

// Mirror of ABSTAIN_VOTES / isUnanimousRound from src/lib/constants.ts
const ABSTAIN_VOTES = ["☕", "?"];

function isUnanimousRound(votes) {
  const estimates = votes.filter((vote) => Boolean(vote) && !ABSTAIN_VOTES.includes(vote));
  return estimates.length > 1 && new Set(estimates).size === 1;
}

// ─── rooms.js ────────────────────────────────────────────────────────────────

describe("createRoom", () => {
  beforeEach(() => rooms.clear());

  it("creates a room with a valid 6-char id", () => {
    const room = createRoom("fibonacci");
    assert.match(room.id, /^[A-Z0-9]{6}$/);
  });

  it("defaults deckType to fibonacci for unknown values", () => {
    const room = createRoom("unknown");
    assert.equal(room.deckType, "fibonacci");
  });

  it("creates a tshirt deck room", () => {
    const room = createRoom("tshirt");
    assert.equal(room.deckType, "tshirt");
  });

  it("stores the room so getRoom returns it", () => {
    const room = createRoom("fibonacci");
    assert.deepEqual(getRoom(room.id), room);
  });

  it("returns rooms with required fields", () => {
    const room = createRoom("fibonacci");
    assert.equal(Array.isArray(room.participants), true);
    assert.equal(room.revealed, false);
    assert.equal(room.story, "");
    assert.equal(room.timerEndsAt, null);
  });
});

describe("getRoom", () => {
  beforeEach(() => rooms.clear());

  it("returns undefined for unknown ids", () => {
    assert.equal(getRoom("DOESNT"), undefined);
  });

  it("is case-insensitive", () => {
    const room = createRoom();
    const lower = room.id.toLowerCase();
    assert.deepEqual(getRoom(lower), room);
  });
});

describe("addParticipant", () => {
  beforeEach(() => rooms.clear());

  it("first participant becomes host", () => {
    const room = createRoom();
    const entry = addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    assert.equal(entry.isHost, true);
  });

  it("second participant is not host", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    const entry = addParticipant(room.id, { id: "p2", name: "Bob", emoji: "🚀" });
    assert.equal(entry.isHost, false);
  });

  it("starts with no vote", () => {
    const room = createRoom();
    const entry = addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    assert.equal(entry.hasVoted, false);
    assert.equal(entry.vote, undefined);
  });
});

describe("removeParticipant", () => {
  beforeEach(() => rooms.clear());

  it("transfers host to next participant on host removal", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    addParticipant(room.id, { id: "p2", name: "Bob", emoji: "🚀" });
    removeParticipant(room.id, "p1");
    const updated = getRoom(room.id);
    assert.equal(updated.participants[0].isHost, true);
    assert.equal(updated.participants[0].id, "p2");
  });

  it("prefers a connected participant for host promotion", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    addParticipant(room.id, { id: "p2", name: "Bob", emoji: "🚀" });
    addParticipant(room.id, { id: "p3", name: "Carol", emoji: "🌸" });
    // p2 is marked disconnected; p3 is connected — host should go to p3
    markParticipantDisconnected(room.id, "p2");
    removeParticipant(room.id, "p1");
    const updated = getRoom(room.id);
    const host = updated.participants.find((p) => p.isHost);
    assert.equal(host.id, "p3");
  });

  it("deletes the room when last participant leaves", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    removeParticipant(room.id, "p1");
    assert.equal(getRoom(room.id), undefined);
  });

  it("keeps current host when removing a non-host participant", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    addParticipant(room.id, { id: "p2", name: "Bob", emoji: "🚀" });
    removeParticipant(room.id, "p2");
    const updated = getRoom(room.id);
    const host = updated.participants.find((p) => p.isHost);
    assert.equal(host.id, "p1");
    assert.equal(updated.participants.length, 1);
  });
});

describe("markParticipantDisconnected / reconnectParticipant", () => {
  beforeEach(() => rooms.clear());

  it("marks participant as disconnected", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    markParticipantDisconnected(room.id, "p1");
    const p = getRoom(room.id).participants[0];
    assert.ok(p.disconnectedAt !== null, "disconnectedAt should be set");
    assert.ok(typeof p.disconnectedAt === "number", "disconnectedAt should be a number");
  });

  it("does not remove the participant or the room on disconnect", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    markParticipantDisconnected(room.id, "p1");
    assert.ok(getRoom(room.id) !== undefined, "room should still exist");
    assert.equal(getRoom(room.id).participants.length, 1);
  });

  it("preserves isHost on disconnect", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    markParticipantDisconnected(room.id, "p1");
    const p = getRoom(room.id).participants[0];
    assert.equal(p.isHost, true);
  });

  it("clears disconnectedAt on reconnect", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    markParticipantDisconnected(room.id, "p1");
    reconnectParticipant(room.id, "p1");
    const p = getRoom(room.id).participants[0];
    assert.equal(p.disconnectedAt, null);
  });

  it("reconnected host retains isHost", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    addParticipant(room.id, { id: "p2", name: "Bob", emoji: "🚀" });
    markParticipantDisconnected(room.id, "p1");
    reconnectParticipant(room.id, "p1");
    const p1 = getRoom(room.id).participants.find((p) => p.id === "p1");
    assert.equal(p1.isHost, true);
    assert.equal(p1.disconnectedAt, null);
  });

  it("is a no-op for an already-connected participant", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    reconnectParticipant(room.id, "p1");
    const p = getRoom(room.id).participants[0];
    assert.equal(p.disconnectedAt, null);
  });
});

describe("evictStalledParticipants", () => {
  beforeEach(() => rooms.clear());

  it("removes participants whose grace period has expired", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    addParticipant(room.id, { id: "p2", name: "Bob", emoji: "🚀" });
    markParticipantDisconnected(room.id, "p1");
    // Simulate the grace period having elapsed by advancing the reference clock
    evictStalledParticipants(0, Date.now() + 60_000);
    const updated = getRoom(room.id);
    assert.equal(updated.participants.length, 1);
    assert.equal(updated.participants[0].id, "p2");
  });

  it("promotes the next connected participant to host after eviction", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    addParticipant(room.id, { id: "p2", name: "Bob", emoji: "🚀" });
    markParticipantDisconnected(room.id, "p1");
    evictStalledParticipants(0, Date.now() + 60_000);
    const updated = getRoom(room.id);
    assert.equal(updated.participants[0].isHost, true);
    assert.equal(updated.participants[0].id, "p2");
  });

  it("deletes the room when all participants are evicted", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    markParticipantDisconnected(room.id, "p1");
    evictStalledParticipants(0, Date.now() + 60_000);
    assert.equal(getRoom(room.id), undefined);
  });

  it("does not evict participants still within the grace period", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    markParticipantDisconnected(room.id, "p1");
    evictStalledParticipants(30_000);
    assert.equal(getRoom(room.id).participants.length, 1);
  });

  it("does not evict connected participants", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    evictStalledParticipants(0, Date.now() + 60_000);
    assert.equal(getRoom(room.id).participants.length, 1);
  });
});

describe("setParticipantVote", () => {
  beforeEach(() => rooms.clear());

  it("records the vote and marks hasVoted", () => {
    const room = createRoom("fibonacci");
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    setParticipantVote(room.id, "p1", "5");
    const p = getRoom(room.id).participants[0];
    assert.equal(p.vote, "5");
    assert.equal(p.hasVoted, true);
  });
});

describe("revealVotes / resetRound", () => {
  beforeEach(() => rooms.clear());

  it("revealVotes sets revealed=true and clears timer", () => {
    const room = createRoom();
    revealVotes(room.id);
    const updated = getRoom(room.id);
    assert.equal(updated.revealed, true);
    assert.equal(updated.timerEndsAt, null);
  });

  it("resetRound clears votes and revealed flag", () => {
    const room = createRoom("fibonacci");
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    setParticipantVote(room.id, "p1", "5");
    revealVotes(room.id);
    resetRound(room.id);
    const updated = getRoom(room.id);
    assert.equal(updated.revealed, false);
    assert.equal(updated.story, "");
    assert.equal(updated.participants[0].hasVoted, false);
    assert.equal(updated.participants[0].vote, undefined);
  });
});

describe("setRoomStory", () => {
  beforeEach(() => rooms.clear());

  it("sets story text", () => {
    const room = createRoom();
    setRoomStory(room.id, "PROJ-123");
    assert.equal(getRoom(room.id).story, "PROJ-123");
  });

  it("truncates story to 140 characters", () => {
    const room = createRoom();
    setRoomStory(room.id, "x".repeat(200));
    assert.equal(getRoom(room.id).story.length, 140);
  });
});

describe("setParticipantProfile", () => {
  beforeEach(() => rooms.clear());

  it("updates name and emoji", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    setParticipantProfile(room.id, "p1", { name: "Alicia", emoji: "🦄" });
    const p = getRoom(room.id).participants[0];
    assert.equal(p.name, "Alicia");
    assert.equal(p.emoji, "🦄");
  });

  it("truncates name to 30 characters", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    setParticipantProfile(room.id, "p1", { name: "A".repeat(50) });
    const p = getRoom(room.id).participants[0];
    assert.equal(p.name.length, 30);
  });
});

describe("isValidVote", () => {
  it("accepts valid fibonacci votes", () => {
    for (const v of ["1", "2", "3", "5", "8", "13", "21", "☕"]) {
      assert.equal(isValidVote("fibonacci", v), true, `expected ${v} to be valid`);
    }
  });

  it("rejects invalid fibonacci votes", () => {
    assert.equal(isValidVote("fibonacci", "99"), false);
    assert.equal(isValidVote("fibonacci", ""), false);
    assert.equal(isValidVote("fibonacci", "<script>"), false);
  });

  it("accepts valid tshirt votes", () => {
    for (const v of ["XS", "S", "M", "L", "XL", "☕"]) {
      assert.equal(isValidVote("tshirt", v), true, `expected ${v} to be valid`);
    }
  });

  it("rejects invalid tshirt votes", () => {
    assert.equal(isValidVote("tshirt", "XXL"), false);
    assert.equal(isValidVote("tshirt", "5"), false);
  });

  it("rejects unknown deck types", () => {
    assert.equal(isValidVote("unknown", "5"), false);
  });
});

describe("roomToSnapshot", () => {
  beforeEach(() => rooms.clear());

  it("hides votes when not revealed", () => {
    const room = createRoom("fibonacci");
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    setParticipantVote(room.id, "p1", "5");
    const snap = roomToSnapshot(getRoom(room.id));
    assert.equal(snap.participants[0].vote, undefined);
  });

  it("exposes votes when revealed", () => {
    const room = createRoom("fibonacci");
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    setParticipantVote(room.id, "p1", "5");
    revealVotes(room.id);
    const snap = roomToSnapshot(getRoom(room.id));
    assert.equal(snap.participants[0].vote, "5");
  });
});

// ─── toSafeHttpUrl ───────────────────────────────────────────────────────────

describe("toSafeHttpUrl (URL safety)", () => {
  it("returns null for null/undefined/empty", () => {
    assert.equal(toSafeHttpUrl(null), null);
    assert.equal(toSafeHttpUrl(undefined), null);
    assert.equal(toSafeHttpUrl(""), null);
  });

  it("accepts valid https URLs", () => {
    const url = "https://example.com/story/123";
    assert.equal(toSafeHttpUrl(url), url);
  });

  it("accepts valid http URLs", () => {
    const url = "http://localhost:8080/issue/42";
    assert.equal(toSafeHttpUrl(url), url);
  });

  it("rejects javascript: protocol (XSS vector)", () => {
    assert.equal(toSafeHttpUrl("javascript:alert(1)"), null);
  });

  it("rejects data: protocol", () => {
    assert.equal(toSafeHttpUrl("data:text/html,<h1>hi</h1>"), null);
  });

  it("rejects vbscript: protocol", () => {
    assert.equal(toSafeHttpUrl("vbscript:msgbox(1)"), null);
  });

  it("rejects bare text with no protocol", () => {
    assert.equal(toSafeHttpUrl("just a story title"), null);
  });

  it("rejects URLs with embedded credentials", () => {
    assert.equal(toSafeHttpUrl("https://user:pass@evil.com"), null);
  });

  it("rejects URLs with username only", () => {
    assert.equal(toSafeHttpUrl("https://user@evil.com"), null);
  });

  it("rejects malformed URLs", () => {
    assert.equal(toSafeHttpUrl("https://"), null);
  });

  it("rejects strings with whitespace around scheme", () => {
    assert.equal(toSafeHttpUrl(" https://example.com"), null);
  });

  it("accepts URLs with query strings and fragments", () => {
    const url = "https://jira.example.com/browse/PROJ-99?filter=open#comment-5";
    assert.equal(toSafeHttpUrl(url), url);
  });

  it("rejects file: protocol", () => {
    assert.equal(toSafeHttpUrl("file:///etc/passwd"), null);
  });
});


describe("isUnanimousRound (celebration rule)", () => {
  it("celebrates when every estimate matches", () => {
    assert.equal(isUnanimousRound(["8", "8", "8"]), true);
  });

  it("does not celebrate on a split vote", () => {
    assert.equal(isUnanimousRound(["8", "8", "13"]), false);
  });

  it("celebrates when only some players voted", () => {
    assert.equal(isUnanimousRound(["5", undefined, "5", undefined]), true);
  });

  it("ignores coffee voters when judging agreement", () => {
    assert.equal(isUnanimousRound(["3", "☕", "3"]), true);
  });

  it("ignores question-mark voters when judging agreement", () => {
    assert.equal(isUnanimousRound(["M", "?", "M"]), true);
  });

  it("does not celebrate when everyone abstained", () => {
    assert.equal(isUnanimousRound(["☕", "☕", "☕"]), false);
  });

  it("does not celebrate a lone estimate", () => {
    assert.equal(isUnanimousRound(["8"]), false);
    assert.equal(isUnanimousRound(["8", "☕", undefined]), false);
  });

  it("does not celebrate an empty round", () => {
    assert.equal(isUnanimousRound([]), false);
    assert.equal(isUnanimousRound([undefined, undefined]), false);
  });

  it("treats differing abstain-only rounds as no celebration", () => {
    assert.equal(isUnanimousRound(["☕", "?"]), false);
  });
});

// ─── protocol.js ─────────────────────────────────────────────────────────────

const { ERROR_CODES, normalizeArgs, createResponder } = require("../server/protocol");

const fakeSocket = () => {
  const emitted = [];
  return { emitted, emit: (...args) => emitted.push(args) };
};

describe("normalizeArgs", () => {
  it("accepts an ack in place of the payload", () => {
    const ack = () => {};
    const result = normalizeArgs(ack);
    assert.deepEqual(result.payload, {});
    assert.equal(result.ack, ack);
  });

  it("replaces non-object payloads with an empty object", () => {
    assert.deepEqual(normalizeArgs(null).payload, {});
    assert.deepEqual(normalizeArgs("ROOM").payload, {});
    assert.equal(normalizeArgs({ roomId: "A" }, "not a function").ack, null);
  });
});

describe("createResponder", () => {
  it("replies through the ack and emits nothing when a callback is given", () => {
    const socket = fakeSocket();
    const replies = [];
    const reply = createResponder(socket, (r) => replies.push(r));
    reply.fail(ERROR_CODES.RATE_LIMITED, "Too fast", { details: { retryAfterMs: 120 } });
    assert.deepEqual(replies, [{ ok: false, error: { code: "RATE_LIMITED", message: "Too fast", retryAfterMs: 120 } }]);
    assert.equal(socket.emitted.length, 0);
  });

  it("replies only once", () => {
    const replies = [];
    const reply = createResponder(fakeSocket(), (r) => replies.push(r));
    reply.ok({ state: null });
    reply.fail(ERROR_CODES.INTERNAL_ERROR, "late");
    assert.deepEqual(replies, [{ ok: true, state: null }]);
  });

  it("falls back to the legacy events without a callback", () => {
    const socket = fakeSocket();
    createResponder(socket, null).fail(ERROR_CODES.INVALID_VOTE, "Invalid vote value");
    createResponder(socket, null).fail(ERROR_CODES.ROOM_NOT_FOUND, "Room not found");
    createResponder(socket, null).fail(ERROR_CODES.NOT_HOST, "Only the host can do that");
    createResponder(socket, null).fail(ERROR_CODES.NOT_JOINED, "Join first", { legacyEvent: "not_authorized" });
    createResponder(socket, null).fail(ERROR_CODES.ALREADY_REVEALED, "Revealed", { legacyEvent: null });
    createResponder(socket, null).ok({ state: null });
    assert.deepEqual(
      socket.emitted.map(([event]) => event),
      ["error", "room_not_found", "not_authorized", "not_authorized"]
    );
    const [, message, detail] = socket.emitted[0];
    assert.equal(message, "Invalid vote value");
    assert.equal(detail.code, "INVALID_VOTE");
  });
});

// ─── host keys and rejoin tokens ─────────────────────────────────────────────

describe("host keys and rejoin tokens", () => {
  beforeEach(() => rooms.clear());

  it("gives each room a host key and each participant a distinct rejoin token", () => {
    const room = createRoom("fibonacci");
    assert.equal(typeof room.hostKey, "string");
    assert.ok(room.hostKey.length >= 16);
    const a = addParticipant(room.id, { id: "a", name: "A", emoji: "🎮" });
    const b = addParticipant(room.id, { id: "b", name: "B", emoji: "🎮" });
    assert.ok(a.rejoinToken && b.rejoinToken);
    assert.notEqual(a.rejoinToken, b.rejoinToken);
  });

  it("keeps secrets out of snapshots and across round resets", () => {
    const room = createRoom("fibonacci");
    const a = addParticipant(room.id, { id: "a", name: "A", emoji: "🎮" });
    const token = a.rejoinToken;
    const text = JSON.stringify(roomToSnapshot(getRoom(room.id)));
    assert.ok(!text.includes(room.hostKey));
    assert.ok(!text.includes(token));
    resetRound(room.id);
    assert.equal(getRoom(room.id).participants[0].rejoinToken, token);
  });

  it("claimHost makes exactly one host", () => {
    const room = createRoom("fibonacci");
    addParticipant(room.id, { id: "a", name: "A", emoji: "🎮" });
    addParticipant(room.id, { id: "b", name: "B", emoji: "🎮" });
    assert.equal(claimHost(room.id, "b"), true);
    assert.deepEqual(
      getRoom(room.id).participants.map((p) => p.isHost),
      [false, true]
    );
    assert.equal(claimHost(room.id, "missing"), false);
  });

  it("secretsMatch only accepts equal non-empty strings", () => {
    assert.equal(secretsMatch("abc", "abc"), true);
    assert.equal(secretsMatch("abc", "abd"), false);
    assert.equal(secretsMatch("abc", "abcd"), false);
    assert.equal(secretsMatch("", ""), false);
    assert.equal(secretsMatch(undefined, "abc"), false);
  });
});
