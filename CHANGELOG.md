# Changelog

## [1.2.7] - 2026-05-27

### Added
Hosts can now open a dedicated `/game/[roomId]/kiosk` view for screen sharing that shows the live room without voting cards or host controls.

### Changed
Kiosk tabs now subscribe as read-only viewers, so they do not join the participant list or affect vote completion logic.
All participants (not just the host) can now open or copy the kiosk link from the room view.
Only one kiosk view is allowed per room at a time; a clear message is shown if the kiosk slot is already taken.
The kiosk view now includes an "Exit Kiosk Mode" button to return to the normal room.
The separate kiosk row was removed; kiosk open/exit actions now appear inline in the top link bar next to the copy button.
Kiosk view now shows a disabled coffee card with "Voting..." while votes are in progress, then displays results when revealed.

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
