# Implementation progress

- [x] M0 — workspaces, Compose, healthcheck, migrations, responsive shell.
- [x] M1 — genetics contracts, deterministic PRNG, pure engine + tests.
- [ ] M2 — procedural illustrated SVG renderer, exports, visual QA.
- [ ] M3 — lab editor, server persistence, breeding flow.
- [ ] M4 — gallery, provenance, UX polish, full acceptance.

## M0 — 2026-10-28

Implemented npm workspaces (`apps/web`, `apps/server`, and four pure package boundaries), shared strict TypeScript configuration, Vitest, and root development/build/typecheck/test/migration/seed commands. Installed compatible dependencies and generated `package-lock.json`.

Added React/Vite/Tailwind shell with router, TanStack Query health indicator, Zustand and shadcn prerequisites. Four routes have explicit M0 empty states, keyboard focus and skip navigation, responsive layout and reduced-motion support. Original static botanical SVG is shell decoration; no genetics or procedural renderer is claimed at M0.

Added Fastify API with uniform safe errors, DB-dependent `/health`, Zod runtime configuration, local/reverse-proxy public URL derivation, PostgreSQL pool and Drizzle schema. Checked-in initial SQL migration creates species, players, plants and breeding events with ownership/lineage references, uniqueness, indexes and basic data constraints. Transaction-locked migration tracking and idempotent catalog/player seeding run in a one-shot Compose bootstrap service before API startup.

Added non-root production Docker images, nginx history fallback and API/health reverse proxy, `.dockerignore`, local-only web publication and persistent PostgreSQL volume. Updated README and asset provenance. `.env` remains unchanged and ignored; requested values are `HOST_PORT=8155`, `PUBLIC_DOMAIN=http://localhost`.

### Verified acceptance

- `docker compose config --quiet`: passed.
- `docker compose up --build -d`: passed; API and PostgreSQL healthy; bootstrap exits successfully.
- `docker compose ps`: API/DB running healthy; web running at `127.0.0.1:8155`.
- `curl.exe -fsS http://localhost:8155/health`: HTTP 200, `{"status":"ok","database":"connected"}` through nginx.
- `npm run typecheck`: passed across all six workspaces.
- `npm run test`: 3 tests passed (DB health success, safe failure/404, local versus reverse-proxy URL configuration).
- `npm run build`: all workspaces passed; Vite generated production assets.
- Repeated `docker compose run --rm bootstrap node dist/migrate.js` and `node dist/seed.js`: passed; counts remain one player, one species, one migration.
- `docker compose down` then `docker compose up -d --wait`: passed without removing volumes. Player UUID and original `created_at` remained identical; velvetleaf catalog persisted.
- Docker inspection reports empty published port bindings for API and DB. Only web publishes a host port; it binds to loopback.
- Headless Chrome visited all four routes at 360px and 1440px, with zero JavaScript page errors and document width equal to viewport width. `/` redirects to `/lab`. Desktop and mobile screenshots visually inspected; see `artifacts/m0/1440.png`, `artifacts/m0/360.png`, and `artifacts/m0/browser-checks.json`.
- Git ignore verification confirms `.env` excluded; no live credentials in tracked source.

### Execution notes and limits

Initial Docker build started before npm finished writing the lockfile and failed; rebuilding with the completed lockfile succeeded. Initial typecheck found Fastify's unknown error type; handler now narrows it safely. Vitest's temporary-cache writes were blocked by the Windows sandbox; rerunning with approved expanded execution passed. Docker, npm network access and headless Chrome also required expanded execution in this environment.

No M1–M4 behavior is implemented. Domain packages intentionally establish empty module boundaries until their milestone. No ESLint was added; strict TypeScript and focused tests provide the M0 checks. This remains a local demo without authentication.

M0 gate complete. Stop here. Next: M1 genetics contracts, deterministic PRNG, inheritance engine and tests, after user instruction to proceed.


## M1 — 2026-10-28

Gate complete before starting M2. Implemented versioned catalog/Zod schemas, pure phenotype resolution, approved-pair compatibility, Mulberry32 v1 inheritance, allele/named mutation logs, provenance and derived rarity policy. Added shared DTOs and catalog/resolve API routes with safe validation errors. Workspace exports now use built JS/declarations in explicit dependency order, including production Docker runtime package links. Catalog seed enriches the existing v1 row; no plant data or ancestry is modified.

Verified `npm run test` (10 passed), `npm run typecheck`, `npm run build`, `docker compose config --quiet`, `docker compose up --build -d`, `docker compose ps`, and proxied HTTP health/catalog/resolve requests. 10,000 mutation-free PG crosses: PP=2499 (24.99%), PG=5041 (50.41%), GG=2460 (24.60%), all within ±2 percentage points. Exact replay tested in a separate Node process. Tests cover all dominance pairs, invalid/missing/extra alleles, unknown versions/species, compatibility/hybrid requirements, mutation probabilities 0/1, valid replacements and rarity reasons. Live invalid-allele POST returned 400; valid POST returned resolved phenotype and rarity.

A mutation-boundary test exposed coupling between mutation draw consumption and cosmetic seed generation; cosmetic child seeds now use a separately salted stream, documented in GENETICS_SPEC. No UI changes at M1: existing shell remains available at http://localhost:8155. Persistent breeding remains M3. Continuing to M2 under the user's instruction.
