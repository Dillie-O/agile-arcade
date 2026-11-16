# Agile Arcade protocol

Everything the web UI does goes through one HTTP endpoint and a handful of
[Socket.IO](https://socket.io/) events, so any client — a script, a bot, a
dashboard — can play a full game without the browser. This document is the
contract; `server.js` and `server/rooms.js` are the implementation.

Reference clients:

- [`scripts/smoke-realtime.js`](../scripts/smoke-realtime.js) — exercises every
  event, including host transfer and reconnects. Run it with `npm run test:smoke`.
- [`scripts/bot-demo.js`](../scripts/bot-demo.js) — the shortest path to a full
  round: create a room, join N bots, set a story, vote, print the results.
  Run it with `npm run bot:demo -- --bots 3`.

Both need a running server (`npm run dev`) and honour `AGILE_ARCADE_BASE_URL`
(default `http://127.0.0.1:3000`).

## Quick start

```js
const { io } = require("socket.io-client");

const { roomId, hostKey } = await (
  await fetch(`${base}/api/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deckType: "fibonacci" }),
  })
).json();

const socket = io(base, { transports: ["websocket"] });
socket.on("room_state", (state) => console.log(state)); // every change, for everyone

// Every event accepts an ack callback; emitWithAck turns it into a promise.
const joined = await socket.emitWithAck("join_room", {
  roomId, name: "Robo Rita", emoji: "🤖", participantId: crypto.randomUUID(), hostKey,
});
// keep joined.rejoinToken private: it is the only way back into this seat
const vote = await socket.emitWithAck("cast_vote", { roomId, value: "5" });
if (!vote.ok) console.error(vote.error.code, vote.error.message);
```

## HTTP

### `POST /api/create-room`

Request body (JSON, optional, at most 1 KB):

| Field | Type | Default | Notes |
|---|---|---|---|
| `deckType` | `"fibonacci"` \| `"tshirt"` | `"fibonacci"` | Unknown values and invalid JSON fall back to `"fibonacci"`. |

Response `200`:

```json
{ "roomId": "K7QX2M", "hostKey": "q3J0…" }
```

`hostKey` is a secret. Whoever joins with it becomes host (see
[Host rules](#host-rules)); it never appears in a room snapshot. Keep it out of
logs and shared links.

Room ids are six characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. Events
accept them in any case; the server upper-cases them. A body over 1 KB gets
`413`.

Creating a room does not join it. The room exists until it has been idle for
two hours, or until its last participant is removed.

### `GET /api/rooms/:roomId`

Read-only view of a room, for bots and dashboards that do not want to hold a
socket open. Returns `200` with exactly the [snapshot](#room-snapshot) that
`room_state` broadcasts — votes hidden until revealed, no secrets. The room id
is case-insensitive. Reading a room does not count as activity, so polling it
does not keep an idle room alive.

Unknown or expired room: `404` with

```json
{ "error": { "code": "ROOM_NOT_FOUND", "message": "Room not found" } }
```

## Socket.IO

Connect to the same origin as the web app (default path `/socket.io`). The
server pings every 10 s and drops a socket after 30 s without a pong.

All client events take a single object payload, optionally followed by an
[ack callback](#acknowledgements). `roomId` may be omitted on every event except
`join_room` and `join_viewer`; the server then uses the room the socket last
joined.

### Client → server

| Event | Payload | Who | Effect |
|---|---|---|---|
| `join_room` | `{ roomId, name, emoji?, participantId?, hostKey?, rejoinToken?, isBot? }` | anyone | Joins (or rejoins) as a participant. See [Joining](#joining). |
| `join_viewer` | `{ roomId }` | anyone | Watches without a seat (kiosk mode). Only one viewer per room. |
| `cast_vote` | `{ roomId, value }` | participant | Records or changes your vote. See [Voting](#voting). |
| `change_emoji` | `{ roomId, emoji }` | participant | Changes your avatar. |
| `update_profile` | `{ roomId, name?, emoji? }` | participant | Changes your name (max 30 chars) and/or avatar. |
| `update_story` | `{ roomId, story }` | host | Sets the story text (truncated to 140 chars). |
| `start_timer` | `{ roomId, duration }` | host | Starts a countdown of 5, 10, 15, 20, 25 or 30 seconds; votes reveal when it ends. Ignored once revealed. |
| `reveal_votes` | `{ roomId }` | host | Reveals votes now and cancels any timer. |
| `reset_round` | `{ roomId }` | host | Clears votes, story, timer and the revealed flag. |
| `remove_participant` | `{ roomId, participantId }` | host | Removes another participant. The host cannot remove themselves. |

### Server → client

| Event | Payload | When |
|---|---|---|
| `room_state` | [snapshot](#room-snapshot) | Broadcast to everyone in the room after every change, including joins and disconnects. |
| `room_not_found` | [error object](#errors) | The room id does not exist or has expired (`ROOM_NOT_FOUND`). |
| `not_authorized` | [error object](#errors) | A host-only event came from a non-host (`NOT_HOST`) or from a socket that has not joined (`NOT_JOINED`). |
| `error` | `message: string`, [error object](#errors) | Any other failure. The human-readable message comes first, the structured error second. |
| `removed_from_room` | none | Sent to a participant the host removed. The socket has left the room. |
| `kiosk_occupied` | [error object](#errors) | `join_viewer` was refused because the room already has a viewer (`KIOSK_OCCUPIED`). |

The four failure events are only sent to clients that did **not** pass an ack
callback. With a callback, the failure arrives in the ack instead.

### Acknowledgements

Every client event accepts a Socket.IO ack callback as its last argument
(`socket.emit(event, payload, callback)`, or `await socket.emitWithAck(event,
payload)`). The server calls it exactly once:

```jsonc
// success: the room as it stands after your action
{ "ok": true, "state": { /* room snapshot */ } }

// failure
{ "ok": false, "error": { "code": "RATE_LIMITED", "message": "Voting too fast. Try again in a moment.", "retryAfterMs": 320 } }
```

`join_room` also returns:

| Field | Meaning |
|---|---|
| `participantId` | The id you were seated under. |
| `rejoinToken` | Private secret for this seat; send it to reclaim the seat after a disconnect. Only ever sent to you, in this ack. |
| `isHost` | Whether you are the host. |

Without a callback, nothing changes from the original protocol: successes are
silent (watch `room_state`) and failures arrive as the events above. With a
callback, the room still receives its `room_state` broadcast as usual.

### Errors

Every failure carries a stable `code` and a human-readable `message`. Branch on
the code; the message is for people and may change.

| Code | Sent by | Meaning | Without an ack |
|---|---|---|---|
| `INVALID_PAYLOAD` | `join_room`, `join_viewer`, `cast_vote`, `change_emoji`, `update_profile`, `remove_participant` | A required field is missing or empty. | `error` |
| `ROOM_NOT_FOUND` | all | The room does not exist or has expired. | `room_not_found` |
| `NOT_JOINED` | `cast_vote`, host-only events | The socket has not joined the room as a participant. | `error` from `cast_vote`; `not_authorized` from host-only events |
| `NOT_HOST` | host-only events | You are a participant, but not the host. | `not_authorized` |
| `INVALID_VOTE` | `cast_vote` | The value is not in the room's deck. `allowed` lists the valid values. | `error` |
| `RATE_LIMITED` | `cast_vote` | Less than 500 ms since this socket's last accepted vote. `retryAfterMs` says how long to wait. The vote was **not** recorded. | `error` |
| `INVALID_TIMER_DURATION` | `start_timer` | `duration` is not one of `allowed` (5, 10, 15, 20, 25, 30). | `error` |
| `ALREADY_REVEALED` | `start_timer` | The round is already revealed; reset it first. | none (silently ignored, as before) |
| `PARTICIPANT_NOT_FOUND` | `remove_participant` | No participant with that id in the room. | `error` |
| `CANNOT_REMOVE_SELF` | `remove_participant` | The host tried to remove themselves. | `error` |
| `KIOSK_OCCUPIED` | `join_viewer` | The room already has a viewer. | `kiosk_occupied` |
| `INVALID_HOST_KEY` | `join_room` | `hostKey` was sent but does not match the room. You were not seated. | `error` |
| `INVALID_REJOIN_TOKEN` | `join_room` | `participantId` belongs to a seat you are not holding, and `rejoinToken` is missing or wrong. You were not seated. | `error` |
| `INTERNAL_ERROR` | all | Unexpected server failure. | `error` |

Extra fields (`retryAfterMs`, `allowed`) sit next to `code` and `message` in the
error object.

### Room snapshot

`room_state` carries the whole room every time; there are no deltas.

```jsonc
{
  "id": "K7QX2M",
  "deckType": "fibonacci",          // "fibonacci" | "tshirt"
  "story": "PROJ-123 Login page",   // "" when unset; may be a URL
  "revealed": false,
  "timerEndsAt": null,              // epoch ms while a countdown runs, else null
  "createdAt": 1763251200000,       // epoch ms
  "lastActivityAt": 1763251260000,  // epoch ms
  "participants": [
    {
      "id": "0b6c…",                // participantId
      "name": "Robo Rita",
      "emoji": "🤖",
      "hasVoted": true,
      "isHost": true,
      "isDisconnected": false,      // true during the reconnect grace period
      "isBot": true,                // joined with isBot: true
      "vote": "5"                   // only present once revealed
    }
  ]
}
```

Votes are hidden until `revealed` is `true`: before that, `vote` is absent and
only `hasVoted` tells you who is done.

## Joining

- `name` is required (trimmed). `emoji` defaults to `🎮`.
- `participantId` is your stable identity. Generate a UUID and reuse it for
  every reconnect; if you omit it the socket id is used.
- Joining with a new `participantId` creates a seat and returns its
  `rejoinToken` in the ack.
- Participant ids are public — every snapshot lists them — so they are not
  enough to take a seat. To reclaim a disconnected seat (votes and host status
  included), send its `participantId` **and** `rejoinToken`. Without the right
  token the join fails with `INVALID_REJOIN_TOKEN`. The token stays the same
  for the life of the seat. A socket repeating `join_room` for the seat it
  already holds needs no token.
- If `participantId` belongs to a socket that is still connected, the server
  ignores it and seats you under your socket id instead.
- `isBot: true` (optional) marks you as an automated player: the snapshot
  carries `isBot: true` and the web UI shows a 🤖 badge next to your name.
  Please set it for anything that is not a person at a keyboard.
- `hostKey` (optional) must match the room's key or the join fails with
  `INVALID_HOST_KEY`. With the right key you become host.

### Disconnects

When a socket drops, its participant stays in the room with
`isDisconnected: true` for a grace period (30 s by default,
`DISCONNECT_GRACE_MS`). Rejoining within it restores the seat. After it, the
participant is removed. Eviction runs every 10 s and is not broadcast on its
own: the removal shows up in the next `room_state`.

## Host rules

- Joining with the room's `hostKey` makes you host, taking the role from
  whoever had it. The key can be used again — for example by a bot that
  reconnects under a new `participantId`.
- Without a `hostKey`, the first participant to join a room is the host. (The
  web UI sends the creator's key automatically on their first join.)
- Only the host may `update_story`, `start_timer`, `reveal_votes`,
  `reset_round` and `remove_participant`. Anyone else gets `not_authorized`.
- A disconnected host keeps the role during the grace period. When the host is
  removed (by eviction), the role passes to the first connected participant,
  or to the first participant if none is connected.

## Voting

### Decks

| `deckType` | Values the UI shows | Also accepted by the server |
|---|---|---|
| `fibonacci` | `1` `2` `3` `5` `8` `13` `21` `☕` | — |
| `tshirt` | `XS` `S` `M` `L` `XL` `☕` | `?` `∞` |

Values are matched exactly (case-sensitive strings). `☕` (and `?`) mean "sitting
this one out".

### Rules

- You can vote or change your vote at any time. A vote cast after the reveal
  is shown immediately, since votes are no longer hidden.
- A socket's votes are throttled to one per 500 ms. A vote sent sooner is
  rejected with `RATE_LIMITED` and `retryAfterMs`; resend it after that delay
  if you still want it. (The web UI does this for you: the last card clicked
  wins.)
- **Auto-reveal:** as soon as every participant still at the table has
  `hasVoted: true`, the server reveals the round. A participant who has been
  disconnected for 5 seconds or more (`AUTO_REVEAL_DISCONNECT_SETTLE_MS`) is no
  longer waited for, so a crashed client cannot stall the round; the reveal
  happens as soon as that window passes. The short wait means a person
  refreshing their page does not get skipped. Setting the variable to a
  negative number restores the old rule of waiting for everyone. Disconnects,
  votes and removals by the host can all trigger the reveal.
- The host can reveal at any time with `reveal_votes`, or start a timer that
  reveals when it ends.
- `reset_round` starts a new round: votes, story and timer are cleared.

## Kiosk viewers

`join_viewer` subscribes a socket to `room_state` without adding a participant.
A room allows one viewer at a time; a second one gets `kiosk_occupied`. A socket
that later sends `join_room` stops being the viewer.
