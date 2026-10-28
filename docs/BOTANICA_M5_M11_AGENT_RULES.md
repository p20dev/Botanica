> Supplement to the existing repository root `AGENTS.md`. Do not replace root instructions.

# Botanica — Codex operating instructions (M5–M11)

## Mission
Turn the EXISTING Plant Laboratory into **Botanica**, a cozy, engaging single-currency idle/incremental greenhouse management and genetics-collection game. Preserve working M0–M4 genetics, renderer, collection, and infrastructure. The existing repository, not this package, is the source of truth for implementation details. Read `docs/BOTANICA_M5_M11_GAME_DESIGN.md` and `docs/BOTANICA_M5_M11_IMPLEMENTATION.md` first.

## Execution — avoid token waste
- Work autonomously through M5–M11 in sequence, preferably in one coding session. Do not ask for approval at every milestone. Report only meaningful blockers or architectural incompatibilities.
- Start with ONE brief repo audit: file tree, packages, schema/migrations, existing API routes, UI components, compose/env. Reuse everything practical. Do not rewrite or scaffold a second app.
- Make a concise internal checklist. Skip lengthy planning essays, repeated status messages, and speculative refactors.
- Implement vertical slices that are actually playable; do not produce screens with nonfunctional buttons or placeholder stats.
- Use few dependencies. No microservices, WebSockets, Redis, message brokers, queue clusters, game engines, paid APIs, AI generation, or multiplayer trading in v1.
- No large test suite or repeated full test passes. Add focused tests only for monetary integrity, player isolation, breeding ownership, and offline-worker idempotency. Run lint/typecheck/build when a milestone changes those surfaces, and one full smoke test at the end. Reuse existing test commands; do not install elaborate test frameworks.
- If errors arise, fix them locally and continue. Only stop when data-loss risk, missing secrets, or truly ambiguous migration ownership demands a decision.
- Preserve existing deployment and keep host port **8155**, domain default **http://localhost**; honor existing variable names and add compatibility mapping if needed.
- Keep all existing DB volumes and user data; additive migrations and backups before destructive operations. Never run `docker compose down -v`, never reset databases, never drop/rename columns without a migration plan.
- Incrementally update existing AGENTS instructions instead of blindly overwriting them if this file is being overlaid. Merge relevant instructions manually.
- Commit in coherent slices if git is configured; do not fabricate git status or deployment success.

## Architecture invariants
- React/Vite/TypeScript frontend; Fastify/Node backend; PostgreSQL; Docker Compose unless existing code shows a more specific compatible setup.
- Server authoritative for balances, prices, inventory, growth, breeding, ownership, time, rewards, and worker automation.
- Money stored as integer coins. Every mutation is transactional; require atomic `UPDATE ... WHERE balance >= cost` or row locking. Protect repeat requests with an idempotency key where operations can be retried.
- Passwords Argon2id; HTTP-only same-site sessions; Secure on HTTPS; throttled login/register; no email required. Generate one-time recovery codes or clearly document no recovery (prefer codes). No plaintext passwords or session tokens in logs.
- Every player-owned query checks authenticated player ID server-side. Never take a client-supplied owner ID as authority.
- Existing genetics and SVG renderer stay deterministic. Keep demo/sandbox data distinct from real player ownership.
- No real-money purchases, premium currency, gambling, daily login punishment, artificial FOMO, predatory notifications, or deceptive odds.
- All app routes/buttons must have real actions or be visibly disabled with explanatory state. Mobile responsive and accessible; reduced-motion support.

## Product priorities
1. First-time player can register, immediately plant, harvest, sell, and replant.
2. Greenhouse is home screen; game HUD is always accessible; existing laboratory becomes an advanced screen.
3. Automation enables overnight progress but never invents free plants, bypasses resources, or consumes protected plants.
4. Breeding produces meaningful inheritable visual changes; keep genes comprehensible through an optional advanced inspector.
5. Gameplay should be satisfying without long tutorial prose.

## Definition of done
- Fresh account and existing sandbox coexist safely.
- No cross-user data access, negative balance, double sale/harvest, or duplicate worker offline rewards.
- Register → plant → harvest → sell → purchase → breed → assign worker → return after offline interval works.
- Existing M0–M4 renderer/genetics regression remains functional.
- `docker compose up -d --build` works on configured host and exposed port 8155; report if environment cannot actually run Docker.
- Write a brief `docs/GAME_IMPLEMENTATION_NOTES.md` describing what shipped, migrations, env changes, smoke-test result and any incomplete feature.
