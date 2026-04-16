const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const {
  rooms,
  createRoom,
  getRoom,
  addParticipant,
  removeParticipant,
  setParticipantVote,
  setParticipantProfile,
  setRoomStory,
  revealVotes,
  resetRound,
  roomToSnapshot,
  isValidVote,
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

  it("returns null for unknown ids", () => {
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

  it("deletes the room when last participant leaves", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    removeParticipant(room.id, "p1");
    assert.equal(getRoom(room.id), undefined);
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
    const { setParticipantProfile: spp } = require("../server/rooms");
    spp(room.id, "p1", { name: "Alicia", emoji: "🦄" });
    const p = getRoom(room.id).participants[0];
    assert.equal(p.name, "Alicia");
    assert.equal(p.emoji, "🦄");
  });

  it("truncates name to 30 characters", () => {
    const room = createRoom();
    addParticipant(room.id, { id: "p1", name: "Alice", emoji: "🎮" });
    const { setParticipantProfile: spp } = require("../server/rooms");
    spp(room.id, "p1", { name: "A".repeat(50) });
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
