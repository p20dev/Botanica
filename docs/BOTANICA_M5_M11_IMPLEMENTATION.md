# Implementation plan M5–M11 — economical Codex execution

Read `docs/BOTANICA_M5_M11_AGENT_RULES.md` and `docs/BOTANICA_M5_M11_GAME_DESIGN.md`. This is an implementation task, not a proposal-writing exercise. Adapt names and directories to the actual repo after a single audit.

## Phase 0 — one-time repo reconnaissance (no coding detour)
Read root docs/BOTANICA_M5_M11_AGENT_RULES.md, README, package manifests, current schema/migrations, API entrypoints, authentication (if present), genetics/renderer service signatures, collection components, compose file and env.example. Write a **brief** mapping of existing primitives to needed game features in `docs/GAME_IMPLEMENTATION_NOTES.md`. Do not print huge file trees. Do not invent endpoints before checking existing ones. Preserve existing app behavior as needed.

## M5 — accounts + ownership foundation
- Introduce players, session/auth, recovery codes if feasible with existing dependencies; minimal register/login/logout UI.
- Add owner reference to every player-owned entity (plants, greenhouse, seed inventory, breeding events, discoveries). Existing demo data migrates safely to a demo namespace or a dedicated owner, never a shared account; preserve record IDs and provenance.
- Server query scoping, username normalization, hashed passwords, cookie sessions, login throttle, CSRF strategy, `GET /api/me` or equivalent.
- Add initial player creation transaction: 120 coins, 3 starter seeds, greenhouse (4 slots), starter quest; idempotent signup/bootstrap.
- Do not force authentication for health probe. Authenticated API routes should return 401 rather than expose demo data.
- Acceptance: two accounts have separate collections; forbidden access is 403/404; no plaintext credentials; existing samples are preserved.

## M6 — game shell + greenhouse home
- New default home route is illustrated greenhouse, not marketing page/lab. Keep original lab accessible from 'Advanced Lab'.
- Responsive sidebar / mobile bottom nav; coins, level/XP, seed count, current quest. SVG plant thumbnails from existing renderer.
- Functional plant slots and timers backed by server state; clear empty/growing/ready labels; growth and harvest feedback; reduced motion.
- Organize game CSS tokens and small reusable `Game*` components. No wholesale frontend rewrite.
- Acceptance: new account lands directly in a working greenhouse; buttons/timers reflect server state; mobile viewport usable.

## M7 — economy, inventory, shop
- Integer coins with atomic ledger; seed inventory quantities; per-item price table in server config; purchase/sell transactions.
- Crop harvest adds a specimen plus recycled starter seed, not money; sale credits money. Protect favorites and sale limits.
- Shop: starter/uncommon/rare seed and first upgrades, with prerequisite levels; meaningful disabled states.
- Add bounded pricing by species/rarity/traits; test one concurrent double-spend and double-sell case.
- Acceptance: buy costs exact amount, insufficient coins rejects without partial changes, sale credits exactly once.

## M8 — progression + additional greenhouses
- Server timestamps for planting, growth, ready-to-harvest; upgrade modifiers; greenhouse 2 unlock; slot expansion and grow lamp/irrigation. No frequent DB writes for ticking seconds.
- Quest/XP/level system and small research unlock set; a concise onboarding path; persist claim state.
- All timer calculations in UTC. Legacy grow objects retained or migrated without data loss.
- Acceptance: reloading or offline time progresses accurately; harvest cannot be repeated; player always has sustainable access to base seeds.

## M9 — breeding gameplay
- Wrap current genetic cross engine in game operation: eligible owned mature parents, compatibility checks, level, cost, time where supported; idempotent result and parent lineage.
- UI: two parent slots, probabilities only if calculated accurately, create child, discover and reveal; advanced editor preserved.
- Add species/trait discovery entries and at most 12 handcrafted achievements/quests.
- Acceptance: real child phenotype visible via renderer; only own parents; cost once; new discovery awarded once.

## M10 — workers + safe offline progress
- Implement Gardener hire + assign; plant/harvest/replant policy; implement Breeder hire + repeat-cross recipe; both use real inventory and prices.
- Persist worker cursor/assignment/limits; bounded catch-up and lock strategy; worker progress applied transactionally without duplicates.
- Autosale is opt-in and respects protect/favorite/unique safeguards. Start with OFF. Display last-run summary and constraints.
- In first release, avoid complicated workforce simulation and tick daemons. Calculate on authenticated relevant API requests / brief server reconciliation.
- Acceptance: 1h offline yields valid finite results and correct balances; repeating same catch-up cannot double grant; no rare protected plant sold.

## M11 — playability, polish, delivery
- Final screen polish: framed illustrated slots, satisfying rare discovery reveal, responsive compact HUD, sound optional, disabled controls explained, quest pin, empty states.
- First session should guide user without wizard. Balance early costs/times from game design as configurable constants.
- Verify registration, basic loop, worker catch-up and preservation of existing lab features.
- Run one final lint/typecheck/test/build plus Docker Compose smoke if Docker is available. Document any commands untestable in your environment; do not claim success without running them.
- Do not spend tokens building additional infra or exhaustive automated test suites.

## Suggested DB entities (adapt existing ones)
`players` (id, normalized_username, password_hash, created_at, xp, level, coin_balance)
`sessions` (id_hash, player_id, expires_at, revoked_at)
`greenhouses` (id, player_id, type, tier, slots, modifiers)
`plant_slots` (id, greenhouse_id, slot_no, planted_seed_id/genome, planted_at, ready_at, growth_rules_version)
`inventory_seeds` (player_id, seed_type/genome_reference, quantity)
`plants` (existing columns + player_id, location, is_favorite, is_protected, sold_at)
`shop_purchases`, `coin_ledger` (player_id, amount signed, type, reference, request_id UNIQUE per player/action)
`workers` (id, player_id, kind, assignment, policy_json, enabled, last_processed_at)
`worker_runs` (worker_id, interval_start, interval_end, summary_json, unique interval constraint)
`quests`, `player_quests`, `player_research`, `discoveries` (or adapt existing).
Do not store derived XP/rarity twice without a documented reason. Avoid duplicating existing lineage/genome tables.

## Server API contracts (adapt existing)
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`
- `GET /api/game/state` aggregated bootstrap (balances, greenhouses, quests, workers, unlocks, inventory)
- `POST /api/greenhouses/:id/slots/:slot/plant`, `POST .../harvest`
- `GET /api/shop`, `POST /api/shop/purchase`
- `POST /api/plants/:id/sell`, `PATCH /api/plants/:id` for favorite/protection
- `POST /api/breeding/cross`, `GET /api/collection`
- `POST /api/workers/hire`, `PATCH /api/workers/:id`, `POST /api/workers/reconcile`
- `GET /api/quests`, `POST /api/quests/:id/claim` where needed.
All mutations validate schema, CSRF, authenticated ownership, price/level and request-id idempotency. Return stable typed data and clear error codes. Prefer aggregated reads over dozens of requests. Endpoints above are conceptual; consolidate or rename to fit actual project conventions.

## Critical smoke script (manual or minimal e2e)
1. Fresh register, log in, log out/in. A second player cannot see first player's plant.
2. Seed → plant → wait/advance controlled clock in test → harvest → keep/sell → buy a new seed.
3. Double submit purchase/sell/harvest with same ID; no duplicate rewards and never negative coins.
4. Breed two compatible owned mature parents; correct mutation once; lineage persisted.
5. Hire gardener, configure, reconcile an elapsed interval twice; no duplicate coins/plants; protected plant is never autosold.
6. Advanced Lab still renders old genotype and saved records.
7. Production app opens on configured port 8155, production HTTPS session works with public reverse proxy if configured.

## Practical work batching (minimize stops)
Batch into 3 broad passes rather than seven interruptions:
- Pass A: M5–M7 (identity, shell, economy)
- Pass B: M8–M10 (idle, breeding, workers)
- Pass C: M11 (visual polish, single final verification)
You may implement all passes without asking for permission. At the end provide a short factual result, migrations, env changes, tests actually run, and remaining caveats. When an important blocker occurs, ask only the one needed question.
