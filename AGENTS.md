# Codex repository instructions — Botanica / Plant Laboratory

## Mission
Build **Plant Laboratory**, the first working module of a future online plant-breeding idle game. Illustrated 2D, procedural SVG assembled from art-directed botanical vector primitives, deterministic genetics, and an elegant responsive interface. This repository contains the authoritative implementation handoff. **Read `docs/IMPLEMENTATION_PLAN.md` and `docs/PRODUCT_SPEC.md` first.**

## Non-negotiable operational settings
- Docker Compose is the standard runtime. The public HTTP UI is exposed on `${HOST_PORT}` (default **8155**) at `${PUBLIC_DOMAIN}` (default **http://localhost**), thus `http://localhost:8155`.
- The user requested literal `.env` values `HOST_PORT=8155` and `PUBLIC_DOMAIN=http://localhost`. Do not silently change these values. `PUBLIC_DOMAIN` is an **origin without port**, not a full public base URL. Build `PUBLIC_BASE_URL` from origin + exposed port for local development; do not append the port in production when running behind a reverse proxy. See `docs/DEPLOYMENT.md`.
- Keep PostgreSQL and API private on Compose networks; publish only the web entrypoint.
- No paid AI APIs, external image generation at runtime, cloud-only dependencies, trackers, auth integrations, marketplaces, multiplayer or microservices in the MVP.
- Use the root `package.json` workspaces with npm and committed lockfile after installing.

## Source of truth and reading order
1. `docs/IMPLEMENTATION_PLAN.md` — phases and acceptance gates.
2. `docs/PRODUCT_SPEC.md` — player workflows, UI, quality bar.
3. `docs/GENETICS_SPEC.md` — genotype/phenotype, inheritance and randomness.
4. `docs/GRAPHICS_SPEC.md` — art pipeline, asset contract, deterministic SVG.
5. `docs/API_AND_DATA.md` — schemas, persistence, routes and invariants.
6. `docs/DEPLOYMENT.md` — Compose, ports, secrets, runbook.
7. `docs/DECISIONS.md` — fixed architectural decisions.
8. `docs/CODEX_START_PROMPT.md` — initial mission.

## Implementation habits
- Work through milestones **M0 → M1 → M2 → M3 → M4**, one at a time. Never substitute a large unverified implementation for milestone gates.
- Implement the current milestone end to end; run its specified tests; update the checklist in `docs/PROGRESS.md`. Stop at a gate and report results, blockers and next step. If explicitly asked to continue autonomously, proceed sequentially.
- Favor simple readable TypeScript; no speculative abstraction, no giant dependencies, no unnecessary test scaffolding.
- Implement actual code and assets, not mockups, placeholders, TODO-based behavior or screenshots-as-assets. Make the UI genuinely usable.
- `packages/genetics`, `packages/renderer`, `packages/rules` must not import React, DOM UI state, database or server. Rendering may consume DOM/SVG APIs only in a thin web adapter; pure layout remains platform independent.
- Server owns authoritative breeding decisions, economy and persisted plant creation. Client never dictates child genotype, mutation outcome, rarity or inventory balances.
- Seeded random generation must be reproducible with explicit algorithm and version; **never use `Math.random()` inside genetics/renderer domain functions**. Use cryptographically secure server RNG to generate initial seeds; store them and use a deterministic PRNG for replay.
- Preserve provenance in `parents`, `generation`, `genomeVersion`, `rendererVersion`, `visualSeed`; no deleting ancestry on migration.
- No arbitrary cross-species breeding. Require compatibility groups, with species-specific constraints.
- Avoid using rarity as a naive random roll independent from genotype. Derive it from a versioned rarity policy as outlined in the specs.
- UI: English copy in the initial codebase; architecture ready for future i18n. Accessible labels, keyboard navigation, reduced motion support.
- Use SVG vector shapes created for this project; no scraped commercial plant assets or image-hotlinking.

## Technical defaults
React + Vite + TypeScript, Tailwind CSS, shadcn/ui where useful, Motion for transitions, Zustand for local view state, TanStack Query for API state; Node.js + Fastify + Zod, PostgreSQL + Drizzle; Docker Compose. Use current compatible stable dependency versions and pin them through lockfile; verify APIs against documentation if needed.

## Required commands / checks
- `docker compose config`
- `docker compose up --build -d`
- `docker compose ps`
- `curl -fsS http://localhost:8155/health`
- `npm run typecheck`
- `npm run test`
- `npm run build`
Use commands as applicable during scaffolding; fix any errors rather than suppressing them. The health endpoint must be served by web reverse proxy to API.

## Finish and reporting
After each milestone report: files changed, URL, tests actually run/results, screenshots or concise UI description, known issues, and what M milestone is next. Do not claim tests were run if they were not. Never mutate `.env` secretly, commit credentials, or delete the user's data.
