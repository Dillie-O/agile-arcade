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

const { roomId } = await (
  await fetch(`${base}/api/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deckType: "fibonacci" }),
  })
).json();

const socket = io(base, { transports: ["websocket"] });
socket.on("room_state", (state) => console.log(state));
socket.emit("join_room", { roomId, name: "Robo Rita", emoji: "🤖", participantId: crypto.randomUUID() });
socket.emit("cast_vote", { roomId, value: "5" });
```

## HTTP

### `POST /api/create-room`

Request body (JSON, optional, at most 1 KB):

| Field | Type | Default | Notes |
|---|---|---|---|
| `deckType` | `"fibonacci"` \| `"tshirt"` | `"fibonacci"` | Unknown values and invalid JSON fall back to `"fibonacci"`. |

Response `200`:

```json
{ "roomId": "K7QX2M" }
```

Room ids are six characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. Events
accept them in any case; the server upper-cases them. A body over 1 KB gets
`413`.

Creating a room does not join it. The room exists until it has been idle for
two hours, or until its last participant is removed.

## Socket.IO

Connect to the same origin as the web app (default path `/socket.io`). The
server pings every 10 s and drops a socket after 30 s without a pong.

All client events take a single object payload. `roomId` may be omitted on
every event except `join_room` and `join_viewer`; the server then uses the room
the socket last joined.

### Client → server

| Event | Payload | Who | Effect |
|---|---|---|---|
| `join_room` | `{ roomId, name, emoji?, participantId? }` | anyone | Joins (or rejoins) as a participant. See [Joining](#joining). |
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
| `room_not_found` | none | The room id does not exist or has expired. |
| `not_authorized` | none | A host-only event came from a non-host, or from a socket that has not joined. |
| `error` | `string` message | The payload was invalid, or the action is not allowed (see below). |
| `removed_from_room` | none | Sent to a participant the host removed. The socket has left the room. |
| `kiosk_occupied` | none | `join_viewer` was refused because the room already has a viewer. |

`error` messages sent today:

| Event | Message |
|---|---|
| `join_room` | `Invalid room or name` |
| `join_viewer` | `Invalid room` |
| `cast_vote` | `Invalid vote payload`, `Invalid vote value`, `Join the room before voting` |
| `change_emoji` | `Invalid emoji payload` |
| `update_profile` | `Invalid profile payload` |
| `start_timer` | `Invalid timer duration` |
| `remove_participant` | `Invalid participant removal payload`, `Host cannot remove themselves`, `Participant not found` |

Successful events have no direct reply: watch for the next `room_state`.

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
  every reconnect; if you omit it the socket id is used, and you cannot reclaim
  the seat later.
- If `participantId` is already in the room and its socket is disconnected,
  joining with it reclaims the seat — votes and host status included — and
  updates the name and emoji.
- If `participantId` belongs to a socket that is still connected, the server
  ignores it and seats you under your socket id instead.

### Disconnects

When a socket drops, its participant stays in the room with
`isDisconnected: true` for a grace period (30 s by default,
`DISCONNECT_GRACE_MS`). Rejoining within it restores the seat. After it, the
participant is removed. Eviction runs every 10 s and is not broadcast on its
own: the removal shows up in the next `room_state`.

## Host rules

- The first participant to join a room is the host.
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
- A socket's votes are throttled to one per 500 ms. **A vote sent sooner is
  silently dropped** — space out vote changes.
- **Auto-reveal:** as soon as every participant has `hasVoted: true`, the
  server reveals the round. Disconnected participants count, so a participant
  who dropped without voting holds the round open until the host reveals or the
  grace period evicts them.
- The host can reveal at any time with `reveal_votes`, or start a timer that
  reveals when it ends.
- `reset_round` starts a new round: votes, story and timer are cleared.

## Kiosk viewers

`join_viewer` subscribes a socket to `room_state` without adding a participant.
A room allows one viewer at a time; a second one gets `kiosk_occupied`. A socket
that later sends `join_room` stops being the viewer.
