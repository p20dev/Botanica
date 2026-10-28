# Ready-to-send Codex instruction

Implement **Botanica** game mode M5–M11 in the existing repository. Follow the repository root `AGENTS.md` and supplementary `docs/BOTANICA_M5_M11_AGENT_RULES.md`, `docs/BOTANICA_M5_M11_GAME_DESIGN.md`, and `docs/BOTANICA_M5_M11_IMPLEMENTATION.md`. You are authorized to work through all milestones autonomously, without stopping for approval at each step. This is a standard lean idle/incremental management game, not a new research project: favor pragmatic implementation and minimal dependencies, refactor only where necessary, keep tests targeted and run a single final end-to-end smoke/build check.

**First**, briefly inspect the actual repository and map the existing genetics, renderer, schema, API and UI. Preserve what works. Add account isolation and transactions safely, then build a real gameplay home screen, coin economy, shop, plant/harvest system, breeding costs/rewards, worker automation with safe offline catch-up, progression, and game-feeling UI. Keep the advanced genetics lab available. Never reset the database or Docker volumes.

**Product name stays Botanica.** Docker host port is **8155** and public domain default is **http://localhost** (keep existing `.env` names where possible). Work in batches: M5–M7, M8–M10, M11; keep going unless a genuine blocker requires clarification. Update `docs/GAME_IMPLEMENTATION_NOTES.md` with work performed, migrations, tested commands, known issues. Do not claim unexecuted tests succeeded.

Deliver working code, not merely a proposal. Do not add premium currency, real-money payments, multiplayer, separate game engine, Redis, or complex infrastructure. Favor a genuinely fun playable core over feature scaffolding.
