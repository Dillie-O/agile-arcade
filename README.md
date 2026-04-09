# Agile Arcade

Agile Arcade is a Dockerized planning poker app with a retro terminal UI, built with Next.js + TypeScript + Socket.IO.

## Features

- Room creation with 6-character IDs
- Host + participant roles
- Fibonacci and T-Shirt decks
- Hidden voting, reveal, and reset round controls
- Random emoji identity (name + emoji), persisted per room in localStorage
- In-memory room state with 2-hour inactivity cleanup
- Single container runtime (Next.js + WebSocket server in one Node process)

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Socket.IO
- Custom Node server (`server.js`)

## Theme System (Retro Terminal)

The UI theme is centralized in [src/app/globals.css](src/app/globals.css) using design tokens and primitive classes.

### Design Tokens

- **Color tokens**: terminal palette, muted/dim text, accent, danger, borders
- **Typography tokens**: body + heading fonts, text scales, line heights
- **Spacing tokens**: `--space-*` scale used for layout/padding/gaps
- **Border/radius tokens**: thin/strong borders and small radii
- **Effect tokens**: glow, card shadow, CRT scanline overlay
- **Layout tokens**: max widths, grid gap, base card size

### Primitive Class Conventions

- **Buttons**: `.button`, `.button-danger`, `.selected`
- **Cards**: `.card`, `.card-grid`, `.card.selected`
- **Panels**: `.panel`, `.nested-panel`
- **Participant UI**: `.participant-row`, `.participant-status`, `.participant-host-badge`

If you add new UI, prefer reusing these tokens/classes instead of introducing new hard-coded values.

## Run Locally (Manual Testing)

1. Install dependencies:

	```bash
	npm install
	```

2. Start the app:

	```bash
	npm run dev
	```

3. Open the app:

	- Main URL: `http://localhost:3000`
	- Join from a second browser/tab to simulate multiple participants.

4. Manual test checklist:

	- Create room from `/`
	- Join room with two users
	- Cast votes from both users
	- Reveal votes (host only)
	- Reset round (host only)
	- Disconnect host and verify host promotion

## Automated Smoke Test (Realtime Flow)

With the app running, execute:

```bash
npm run test:smoke
```

Optional custom base URL:

```bash
AGILE_ARCADE_BASE_URL=http://127.0.0.1:3000 npm run test:smoke
```

The smoke test validates room creation, join, hidden voting, reveal, reset, and host transfer.

## Production Build (Non-Docker)

```bash
npm run build
npm run start
```

## Docker

Build and run locally:

```bash
docker build -t agile-arcade .
docker run --rm -p 3000:3000 agile-arcade
```

Or with compose:

```bash
docker compose up --build
```

## Deploy

This project is designed for any Docker-friendly host (Render, Fly.io, Railway, VPS, Kubernetes).

Deployment checklist:

1. Build and push the Docker image from `Dockerfile`.
2. Expose container port `3000`.
3. Set `NODE_ENV=production`.
4. Run command is already defined in the image as `node server.js`.

Platform notes:

- Use a single instance for predictable in-memory room behavior.
- Room state is ephemeral and stored in memory only.
- Inactive rooms are cleaned up after 2 hours.

## Known Limitations

- **In-Memory State Only**: All room data is stored in memory and will be lost if the process restarts or crashes. No database persistence.
- **Single Instance**: Room state is not shared across multiple app instances. Deploy as a single container (not horizontally scaled) unless you implement a shared state store (Redis, etc.).
- **No Authentication**: Users are identified by name + emoji only. There is no account system, login, or permission/role model beyond host/participant.
- **No Data Export**: Voted results are not stored; they are lost when the round is reset or the room expires.
- **Ephemeral Cleanup**: Rooms inactive for > 2 hours are automatically deleted. Users will see "Room Not Found" if they rejoin after expiry.

## WebSocket Events
- `join_room` `{ roomId, name, emoji }`
- `cast_vote` `{ roomId, value }`
- `change_emoji` `{ roomId, emoji }`
- `reveal_votes` `{ roomId }`
- `reset_round` `{ roomId }`

### Server → Client

- `room_state`
- `error`
- `room_not_found`
- `not_authorized`
