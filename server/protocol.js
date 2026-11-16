/**
 * Shared plumbing for Socket.IO handlers: stable error codes, payload
 * normalisation and acknowledgement replies. See docs/PROTOCOL.md.
 */

const ERROR_CODES = Object.freeze({
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  NOT_JOINED: "NOT_JOINED",
  NOT_HOST: "NOT_HOST",
  INVALID_VOTE: "INVALID_VOTE",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_TIMER_DURATION: "INVALID_TIMER_DURATION",
  ALREADY_REVEALED: "ALREADY_REVEALED",
  PARTICIPANT_NOT_FOUND: "PARTICIPANT_NOT_FOUND",
  CANNOT_REMOVE_SELF: "CANNOT_REMOVE_SELF",
  KIOSK_OCCUPIED: "KIOSK_OCCUPIED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
});

// Events a client without an ack callback has always received for these
// failures. Every other code goes out as `error`.
const LEGACY_EVENTS = Object.freeze({
  ROOM_NOT_FOUND: "room_not_found",
  NOT_HOST: "not_authorized",
  KIOSK_OCCUPIED: "kiosk_occupied",
});

/**
 * Socket.IO passes (payload, ack), but a client may send only an ack, or a
 * non-object payload. Normalise both so handlers never crash on bad input.
 */
const normalizeArgs = (payload, ack) => {
  if (typeof payload === "function") {
    return { payload: {}, ack: payload };
  }
  return {
    payload: payload && typeof payload === "object" ? payload : {},
    ack: typeof ack === "function" ? ack : null,
  };
};

/**
 * Builds the reply helpers for one incoming event.
 *
 * With an ack callback, the outcome goes through the ack only:
 *   { ok: true, ...result } or { ok: false, error: { code, message, ...details } }
 * Without one, failures go out as the event the client has always received
 * (`room_not_found`, `not_authorized`, `kiosk_occupied` or `error`), and
 * successes stay silent apart from the room_state broadcast.
 *
 * `legacyEvent` overrides the event used without an ack; `null` keeps the
 * failure silent, for cases that never produced an event before.
 */
const createResponder = (socket, ack) => {
  let replied = false;

  return {
    get replied() {
      return replied;
    },
    ok(result = {}) {
      if (replied) return;
      replied = true;
      if (ack) ack({ ok: true, ...result });
    },
    fail(code, message, { details, legacyEvent } = {}) {
      if (replied) return;
      replied = true;
      const error = { code, message, ...details };
      if (ack) {
        ack({ ok: false, error });
        return;
      }
      const event = legacyEvent !== undefined ? legacyEvent : LEGACY_EVENTS[code] || "error";
      if (event === null) return;
      if (event === "error") {
        // The message stays the first argument so existing `error` listeners
        // keep working; the structured error rides along as the second.
        socket.emit("error", message, error);
      } else {
        socket.emit(event, error);
      }
    },
  };
};

module.exports = {
  ERROR_CODES,
  LEGACY_EVENTS,
  normalizeArgs,
  createResponder,
};
