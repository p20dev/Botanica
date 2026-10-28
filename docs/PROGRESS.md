# Implementation progress

- [x] M0 — workspaces, Compose, healthcheck, migrations, responsive shell.
- [x] M1 — genetics contracts, deterministic PRNG, pure engine + tests.
- [x] M2 — procedural illustrated SVG renderer, exports, visual QA.
- [x] M3 — lab editor, server persistence, breeding flow.
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


## M2 — 2026-10-28

Gate complete. Added 15 original CC0 botanical SVG primitives (three silhouettes, three branch grammars, soil stem and flower stalk, four blooms, two pots, shadow) with asset manifest and synchronized standalone sources. Added six curated palettes, deterministic species-specific layout, four stages, clipped variegation/marbling, restrained golden veins, stable per-instance SVG namespaces and strict scene/serializer validation. Geometry and domain packages remain independent of React, DOM and persistence.

Added memoized PlantPreview adapter, a usable `/lab` visual-study workbench (curated presets, seed, stage, clearly labeled manual mutation, derived phenotype/rarity, 64px icon, four 128px stage views), SVG/PNG exports, `/gallery` 12-variation atlas and 100-seed smoke study. These are explicit non-persistent render proofs; the full diploid editor and saved breeding remain M3. Added validated `/api/v1/preview`, using the same pure renderer as the client. Updated asset provenance, genetics/graphics/API documentation and README.

### Checks actually run

- `npm run test`: 16 tests passed across five suites; 16 asset files (15 SVG sources + manifest) verified in sync. Includes M1 regressions, exact render replay, cosmetic seed invariance, 3,600 shape/habit/stage/seed layout bounds, stage/density behavior, distinct 12-way output, clipped patterns, golden-vein geometry invariance, malicious namespace/asset/palette/NaN rejection and API/client SVG equivalence.
- `npm run typecheck`: passed all workspaces.
- `npm run build`: passed packages, API and Vite production bundle (about 129 kB gzip JS).
- `docker compose config --quiet`, `docker compose up --build -d`, `docker compose ps`: passed; API/DB healthy, web available at http://localhost:8155, only loopback web port published.
- `curl.exe -fsS http://localhost:8155/health`: 200 JSON with connected database. Live proxied preview POST returned 200 and a self-contained renderer-v1 SVG. Sandbox database remains one player and one species.
- `node scripts/verify-m2.cjs` with bundled Playwright and Chrome: passed desktop 1440px and mobile 360px checks, no horizontal overflow or JavaScript page errors. Verified seed edits leave the phenotype/rarity summary unchanged, exact 12/100 card counts and unique SVG IDs (1302/1302 in the smoke view).
- Actual UI downloads for warm/transparent SVG and PNG decode successfully. PNG dimensions are 512×512. All four downloads rasterize identically to the live SVG preview: mean pixel difference 0. Warm corner RGBA=246,243,232,255; transparent corner=0,0,0,0.
- 100-plant transition measured about 250 ms including browser interaction and two frames; largest observed frame gap about 67 ms, one 108 ms long task. This is a local headless desktop measurement, not a cross-device performance guarantee. The UI remained usable and toggled back successfully.
- Visually inspected desktop workbench, complete systematic atlas, mobile workbench, 512px hero, 64px icon and 100-seed overview. Original bloom stems looked detached during initial QA; added explicit connecting stalk geometry and repeated tests/build/browser/export checks after fixing it. No obvious leaf/pot clipping.

Screenshots, real exported SVG/PNG files and structured measurements are in `artifacts/m2/`. The optional browser script is checked in and documents its external Playwright/browser requirements in README.

No known M2 blockers. Local sandbox only; persistent plant creation, full genome editor, saved breeding and lineage navigation are intentionally not implemented before M3. `.env` values remain unchanged and excluded from Git. Stop at M2 as requested; next milestone is M3.

## M3 — 2026-10-28

Gate complete before starting M4. Added full diploid genome editor with live phenotype/rarity explanation, species selection, stage/cosmetic seed controls, manual-mutation preview labeling and saved founder creation. Added saved plant inspector with genotype, phenotype, provenance, parents and navigation. Added saved-parent breeding UI, compatibility messages, persistent offspring and paginated journal.

Server validates shared strict DTOs, generates initial/event seeds with crypto.randomBytes, scopes records to the sandbox owner, and persists canonical genome, mutation outcome, rarity score/tier/reasons, versions and lineage. Breeding takes only parent IDs and idempotency key. A transaction-scoped advisory lock serializes identical keys; child and event commit together; reuse with a different pair returns 409. Additive 0002 migration stores names, creation source and birth-time rarity explanations without rewriting genomes or ancestry. Cursor pagination preserves PostgreSQL microseconds to handle timestamp ties correctly. Seed creates two fixed demo parents idempotently. Manual mutation previews are excluded from saved designed founders and explicitly explained in the UI.

Checks run: `npm run typecheck`, `npm run test` (16 unit/domain/API tests passed; seven DB cases intentionally skipped without TEST_DATABASE_URL), `npm run build`, `docker compose config --quiet`, `docker compose up --build -d`, `docker compose ps`, and proxied curl health (200 connected). Separately ran `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from test`: all seven real PostgreSQL integration cases passed on a clean tmpfs DB. They cover repeated clean migration/seed, canonical persistence/claim rejection, tied-timestamp pagination, 12 simultaneous retries producing exactly one child/event with replayable seed, generation increments, incompatible and foreign-owned parent rejection, and forced event failure rolling back the child with a safe 500 response. Removed only the isolated test containers afterward.

`node scripts/verify-m3.cjs` passed live browser acceptance: editing a pigment allele changes visible phenotype/SVG; save excludes the manual mutation; founder and child survive reload; offspring has two persisted parents and generation 1; lineage navigates to the saved founder; laboratory, breeding and detail pages fit 360px. Desktop/mobile screenshots and result IDs are in artifacts/m3. The first browser attempt used a label-text locator that included select-option text; the actual accessible combobox names were verified and the test corrected. No app defect was suppressed. Visually reviewed laboratory and breeding screens.

URL: http://localhost:8155. Known limit: collection filtering/demo population belongs to M4; no auth or public release. The UI acceptance founder and its offspring are retained as evidence of persistence. Continuing to M4 under user authorization.
