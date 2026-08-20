# Changelog

## [1.6.0] - 2026-08-20

### Added
A `/changelog` page, reachable from the version number in the footer, which is now a link. The page renders the player-facing release notes in `src/lib/releases.ts` — hand-written plain-language summaries kept deliberately separate from this file, which stays the technical record. Releases are listed newest-first and the top entry is tagged "Latest".

### Changed
Hover hints are now real tooltips (`react-tooltip`) styled to match the parchment theme, replacing the native `title` attributes. They open on hover, on keyboard focus, and on tap — the last of which native `title` never supported, so result-card voter names and unanimous-banner language names are finally reachable on phones. New tooltips were added to the participant status indicator, the Share Game / kiosk / tunnel controls, and the landing page deck buttons (which now list the cards in the deck).

The footer version string is derived from the newest entry in `src/lib/releases.ts` instead of being hardcoded in `layout.tsx`.

### Fixed
The participant status indicator announced only the raw emoji ("hourglass") to screen readers; it now carries a spoken status. The story link button, previously labelled only by its ↗ glyph, has an accessible name.

---

## [1.5.0] - 2026-08-18

### Added
When the players agree on a card, a burst of confetti falls across the screen and a banner appears above the results reading 🎉🎉 unánime 🎉 Unanimous 🎉 一致同意 🎉🎉 — the word in English flanked by two of 41 other languages, drawn at random each time (hover a word to see which language it is). It fires whenever everyone who put an estimate on the table picked the same card, so stragglers and ghost players who never voted cannot spoil it; ☕ and ? count as sitting the round out rather than as disagreement. The celebration shows on player screens and in kiosk mode, clears when the next round starts, and is skipped for anyone who prefers reduced motion.

Players can now change their avatar mid-game: hovering your own icon in the participant list reveals a pencil badge, and clicking it opens the same avatar picker used when joining. The host keeps the hover-to-remove ❌ on everyone else's icon, and can still change their own.

---

## [1.4.0] - 2026-08-14

### Added
A "Pick Your Own" button in the join modal opens an avatar picker, so players can choose a favorite icon instead of relying on the random roll. Icons are grouped into Arcade, Creatures, Cosmic, Fantasy, and Snacks sections, and the current selection is highlighted.

### Changed
The avatar icon set expanded from 16 to 74 options, so larger groups are far less likely to end up with duplicate avatars. Random rolls draw from the full set.

---

## [1.3.1] - 2026-06-24

### Changed
Participant status labels replaced with emoji indicators: ⏳ for waiting, ✅ for voted. The full name is now always visible without truncation.
The host's remove-participant control moved from a right-side floating button to the participant's avatar slot — hovering the avatar reveals a ❌ icon that can be clicked to remove the player.

---

## [1.3.0] - 2026-06-22

### Added
The app is now installable as a Progressive Web App on both Chrome and Safari. Users can add it to their home screen from any page — the installed app always opens at the root, not the game URL they happened to install from.

A "Share Game" button replaces the old inline copy controls in the room info bar. Clicking it opens a modal showing a scannable QR code, the full game URL, and a "Copy Link" button — making it easy for mobile players to join by scanning rather than typing.

---

## [1.2.9] - 2026-06-04

### Fixed
Kiosk mode could falsely report "already active" when the previous kiosk socket had disconnected uncleanly (e.g. tab closed abruptly or browser reconnect). The server now verifies that the registered kiosk socket is still connected before rejecting a new viewer; stale entries are cleared automatically.

---

## [1.2.8] - 2026-05-27

### Changed
The separate kiosk row was removed; kiosk open/exit actions now appear inline in the top link bar next to the copy button.
Kiosk view now shows a disabled coffee card with "Voting..." while votes are in progress, then displays results when revealed.

---

## [1.2.7] - 2026-05-27

### Added
Hosts can now open a dedicated `/game/[roomId]/kiosk` view for screen sharing that shows the live room without voting cards or host controls.

### Changed
Kiosk tabs now subscribe as read-only viewers, so they do not join the participant list or affect vote completion logic.
All participants (not just the host) can now open or copy the kiosk link from the room view.
Only one kiosk view is allowed per room at a time; a clear message is shown if the kiosk slot is already taken.
The kiosk view now includes an "Exit Kiosk Mode" button to return to the normal room.

---

## [1.2.6] - 2026-05-26

### Fixed
Improved host remove-participant button visibility/clickability by revealing it on participant hover/focus and keeping it visible on touch devices.

---

## [1.2.5] - 2026-05-11

### Added
Hosts can now remove participants from the room directly in the participant list.

### Changed
When a participant is removed by the host, they are shown a dedicated removal message and prompted to return home (the join modal no longer reopens automatically).

---

## [1.2.4] - 2026-05-11

### Changed
Refreshed the landing page with a larger "Choose your Quest" hero and direct-launch adventure buttons for Fibonacci and T-Shirt deck creation.

---

## [1.0.1] - 2026-04-09

### Added
Core functionality for app.

---

## [1.1.0] - 2026-04-10

### Added
Support to host games through ngrok.

---

## [1.1.1] - 2026-04-11

### Added
Included changelog and version details.

### Changed
Readme updates.

### Fixed
Fixed performance/stutter when host was typing in story text.

### Security
Updated NextJS version.

---

## [1.2.0] - 2026-04-15

### Added
Host-controlled countdown timer with auto-reveal. Host can select a duration (5–30 s), start the timer, and all participants see a live countdown banner. Cards auto-reveal when the timer expires.

---

## [1.2.1] - 2026-04-16

### Security
Fixed DOM-text-reinterpreted-as-HTML vulnerability (CodeQL alert #3) in `room-client.tsx`. Story URLs are now validated against an `http:`/`https:` allowlist via a `toSafeHttpUrl` helper before being bound to anchor `href` attributes, preventing tainted user input from reaching DOM sinks.

---

## [1.2.2] - 2026-04-28

### Fixed
CSS styling fixes.

---

## [1.2.3] - 2026-04-28

### Fixed
Reconnect grace period prevents host (and participants) from being permanently removed on a brief socket disconnect. Participants are now soft-deleted with a `disconnectedAt` timestamp; a background job evicts them after 30 s if they haven't rejoined. Hosts who reconnect within the grace window have their `isHost` flag fully restored.

### Changed
Socket.IO server now uses explicit `pingInterval: 10000` / `pingTimeout: 30000` to reduce spurious disconnects under Cloud Run's idle-connection handling.

---

Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
