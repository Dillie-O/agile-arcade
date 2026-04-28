# Changelog

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

## [x.y.z] - YYYY-MM-DD

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
