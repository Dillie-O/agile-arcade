<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Repository defaults

- For any user-facing UX change, update **both** changelogs in the same task: `CHANGELOG.md` (the technical record) and `src/lib/releases.ts` (the plain-language notes players read on `/changelog`). They are written for different audiences, so summarize rather than copy.
- For any user-facing UX change, provide updated screenshots in the PR comments or PR description (do not commit screenshot files).
- Keep release metadata in sync whenever version/date changes are made (`package.json`, `CHANGELOG.md`, and the newest entry in `src/lib/releases.ts`, which the footer version text reads from).

## Realtime protocol

- [`docs/PROTOCOL.md`](docs/PROTOCOL.md) is the contract for `POST /api/create-room` and every Socket.IO event. Read it instead of reverse-engineering `server.js`, and update it in the same change whenever an event, payload, error, or game rule changes.
- [`scripts/smoke-realtime.js`](scripts/smoke-realtime.js) is the reference client (`npm run test:smoke`); [`scripts/bot-demo.js`](scripts/bot-demo.js) plays a full round with bots (`npm run bot:demo`). Both need a running server.
