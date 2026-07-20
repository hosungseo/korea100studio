# Changelog

All notable changes to korea100studio are documented here. Versions follow
[semver](https://semver.org/).

## [0.1.2] - 2026-07-21

### Added
- Referential-integrity validation — `render`, `audit`, `validate`, and `motion`
  now report exactly which node references an unknown lane/stage, which edge has
  a dangling endpoint, and any duplicate node/edge id, instead of a raw layout
  error. Exposed programmatically as `checkReferentialIntegrity(board)`.
- `korea100studio --version` (`-v`).

## [0.1.1] - 2026-07-21

### Fixed
- `default` profile footer no longer carries the Korean-government disclaimer
  ("Not legal advice…"); it now reads a neutral, domain-agnostic note. The `gov`
  profile keeps its original disclaimer.

### Added
- `audit --json` — machine-readable composition metrics (score, metrics,
  violations) for CI and programmatic use.

## [0.1.0] - 2026-07-20

Initial release. Standalone Agent Skill (Claude Code + Codex) that turns any
process (lanes × stages × nodes × edges) into a vertical swimlane board.

- Render `board-v1` JSON to SVG (optional PNG via rsvg-convert / cairosvg)
- Composition-quality audit (node-piercings, crossings, bends, route stretch)
- Stage-ordered reveal animation as a self-contained SMIL SVG
- `default` (neutral) and `gov` (korea100 Korean-government) profiles
- CLI: `render` / `audit` / `validate` / `motion` / `check`
- Faithful port of korea100's renderer — the `gov` profile reproduces korea100's
  composition metrics bit-for-bit across all 509 boards (verified)
