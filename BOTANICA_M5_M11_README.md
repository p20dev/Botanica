# Botanica game expansion pack — M5–M11

**Overlay files onto your EXISTING Botanica repository. Do not start a fresh project.** This is a handoff/spec pack, not a runnable replacement for the current application.

## Contents
- `docs/BOTANICA_M5_M11_AGENT_RULES.md` — Codex rules and guardrails. **Supplementary rules only: keep the repository’s existing root AGENTS.md unchanged.**
- `docs/BOTANICA_M5_M11_GAME_DESIGN.md` — complete game design specification.
- `docs/BOTANICA_M5_M11_IMPLEMENTATION.md` — specific milestones, data model, API outline, acceptance criteria.
- `BOTANICA_M5_M11_START.md` — single start prompt to paste in Codex.

## Use
1. Backup/commit existing project. Extract to repository root. Do not overwrite any existing root files. Keep root `AGENTS.md` and follow it alongside this add-on. In case of conflicting instructions, root `AGENTS.md` takes precedence except where you explicitly resolve the conflict.
2. In Codex, paste the content of `BOTANICA_M5_M11_START.md`, or ask Codex to read and execute it.
3. Codex should inspect actual source first. The current Forgejo repository could not be fetched directly from this environment; existing code paths and DB table names deliberately are NOT asserted.
4. Keep current compose and `.env` and any reverse proxy config. Required values: `HOST_PORT=8155`, `PUBLIC_DOMAIN=http://localhost` unless existing project names equivalents; do not overwrite actual production domain `https://botanica.p20.dev` unintentionally.

## Philosophy
No stop-start ritual at each milestone; batch broad passes and verify critical economics/security once. Build complete playable flows, preserve genetics/renderer and actual live data. No generated demo screenshots or speculative UI in place of functioning code.
