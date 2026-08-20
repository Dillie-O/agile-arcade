<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Repository defaults

- For any user-facing UX change, update **both** changelogs in the same task: `CHANGELOG.md` (the technical record) and `src/lib/releases.ts` (the plain-language notes players read on `/changelog`). They are written for different audiences, so summarize rather than copy.
- For any user-facing UX change, provide updated screenshots in the PR comments or PR description (do not commit screenshot files).
- Keep release metadata in sync whenever version/date changes are made (`package.json`, `CHANGELOG.md`, and the newest entry in `src/lib/releases.ts`, which the footer version text reads from).
