# Implementation plan — explicit Codex execution gates

## Working rules
Complete milestones sequentially. Finish one and validate it before moving on. Use `docs/PROGRESS.md` as execution log. Do not implement speculative game systems. In the event of a spec conflict, prioritize: `AGENTS.md`, then this plan, then narrower contracts. Document deviations instead of silently redefining requirements. Prefer small components, one implementation per responsibility and clear error states.

## M0 — infrastructure & bootable application
**Objective:** real running web + API + database through Docker Compose, before domain features.

Tasks:
1. Initialize npm workspace root with `apps/web`, `apps/server`, `packages/genetics`, `packages/renderer`, `packages/rules`, `packages/shared`. Configure shared TS config, ESLint if straightforward, testing via Vitest and root scripts `dev`, `build`, `typecheck`, `test`, `db:migrate`, `db:seed`.
2. Scaffold React/Vite + router + Tailwind, install shadcn/ui prerequisites only (add actual components as needed), Zustand and TanStack Query; a proper illustrated shell/header and top nav. Implement `/lab`, `/breed`, `/gallery`, `/about`; all pages may show clearly labeled empty states in M0.
3. Scaffold Fastify TypeScript API, Zod, Drizzle PostgreSQL connection, `/health` returning 200 if DB query succeeds. Implement uniform API errors.
4. Create DB schema and initial migration consistent with `docs/API_AND_DATA.md`, demo player + `velvetleaf` catalog seed; startup/bootstrap behavior must be repeatable. Seed operation idempotent.
5. Create production-quality Dockerfiles, nginx SPA/proxy config, .dockerignore. Make Compose from root work with provided .env (host 8155, public origin http://localhost).
6. Add simple README scripts, screenshots not mandatory yet. No credentials in Git.

Gate:
- `docker compose config` works.
- `docker compose up --build -d` produces healthy API/DB and reachable UI at `http://localhost:8155`.
- `curl -fsS http://localhost:8155/health` returns HTTP 200 JSON.
- Mobile page renders without horizontal overflow.
- `npm run typecheck`, `npm run test`, `npm run build` pass (root tooling installed and lockfile committed).
- Database survives `docker compose down` / `up` and cannot be reached via published Compose ports.

## M1 — genetics domain (pure package)
Tasks:
1. Create versioned catalogs/types, Zod validators, `validateGenome`, `resolvePhenotype`, `canBreed`, `breed`, `classifyRarity` as specified.
2. Implement a deterministic seeded PRNG with documented integer rules and deterministic cross-run results. Do not mix RNG into renderer.
3. Allele inheritance: 50/50 from each parent independently by locus; dominance policy per locus; named mutation logging; explicit exceptions for invalid/incompatible pairs.
4. Add proper unit tests on example cross, mutation boundaries, deterministic replay, phenotypes and rarity policy.
5. Implement `/api/v1/catalog/species` and `/api/v1/phenotype/resolve` with shared DTOs.

Gate:
- Example cross with mutations disabled yields 1:2:1 genotypes over 10k runs within ±2 percentage points.
- Same seed → exact same result, across calls.
- Cross-species breeding blocked unless compatibility is explicitly defined.
- Untrusted client alleles rejected by server.
- `npm run test`, `typecheck`, `build` pass.

## M2 — illustrated vector rendering
Tasks:
1. Create at least **original** handcrafted SVG primitive sources (see GRAPHICS_SPEC). Strong visual quality; use multiple paths, veins/shading, artistically composed plant silhouette.
2. Implement species-specific plant grammar and pure geometry layout with visualSeed, phenotype, 4 stages and stable IDs.
3. Render an isolated viewBox 512 SVG. Apply color palettes, silhouette switching, variegation/marbling and golden veins mutation. No unsafe injected XML.
4. Add export SVG and PNG with transparent or warm background selection, ensure rendered result matches preview.
5. Add gallery proof view showing at least 12 systematic variations and 100-seed smoke demo; perform browser visual QA and optimize if needed.

Gate:
- 3 leaf shapes, 2 pigments, 2 patterns visibly distinct.
- Same args produce same SVG geometry; same genotype with different visualSeed varies only cosmetically.
- 64px icon and 512px hero remain legible; no obvious clipping.
- SVG and PNG exports open and visually match.
- 100 plants render without noticeable frozen UI on typical desktop.
- Build/tests/typecheck pass.

## M3 — editor and persistent breeding
Tasks:
1. Build polished Lab: live plant preview, species selector, diploid allele editor, stage selector, visual seed control and mutation toggles (manual preview only, not falsely claimed as bred mutations), genotype/phenotype and score explanations.
2. Add server-side `POST /api/v1/plants`, `GET /api/v1/plants/:id`, pagination GET. Persist canonical genomes, seeds, lineage fields. Seed demo parents.
3. Implement server authoritative `POST /api/v1/breeding` idempotent and transactional, plus history endpoint; create real child instance with securely selected event seed and recorded parent IDs.
4. Implement Breeding Lab screen: parent selection, validation, cross, result card and lineage navigation. Show accurate example probabilities only for single-gene preview.
5. Mutation logic and rarity scores computed once at child creation and persisted. Data migration scripts tested on clean DB.

Gate:
- Editing allele changes expected visible traits instantly.
- Breed yields child with exactly two persisted parents and generation +1.
- Retry same idempotencyKey returns same child, no duplicates.
- Cross incompatible species refuses with clear message.
- Browser reload persists generated plants.
- No server error leaks secrets. Tests/build/typecheck pass.

## M4 — collection gallery and hardening
Tasks:
1. Implement `/gallery` cards with filters, sorting and pagination, details inspector, lineage ancestry links and export JSON/SVG/PNG.
2. Create **100 deterministic varied demo plants** using seed script. Make seed idempotent so running twice does not duplicate.
3. Add helpful empty/loading/error states, toast/action confirmation, responsive layout and focus handling, reduced motion.
4. Polish botanical art direction and cards, ensure readability at 64px; inspect screenshots for desktop + mobile and fix visual issues.
5. Document API via concise examples, deployment constraints, future idle-game roadmap; verify no public auth claims or security oversell.

Gate:
- 100 plant gallery searchable/filterable without excessive UI lag.
- Exported SVG, PNG and JSON valid; opens without external resources.
- Lineage from bred child to parents navigable.
- 360px and 1440px layouts verified.
- `docker compose up --build -d`, health, tests, typecheck, build pass.
- Project ready for further iteration, **not** publicly launchable until auth/ownership controls added.

## Scope of next phase (do not code yet)
M5+ greenhouse economy (pots, seeds, currencies), offline time progression via event timestamps, upgrades and automation, seed shop, collection achievements, research, player accounts, secure multiplayer/trading. Should be planned after Plant Lab proof is accepted, not smuggled into MVP.
