# Plant Laboratory / Botanica

M0–M2 provide a running React laboratory, deterministic genetics, illustrated SVG renderer, Fastify API, PostgreSQL schema and repeatable bootstrap. Persistent plant creation and breeding follow in M3.

## Run

Keep `.env` local. Copy `.env.example` if missing; preserve `HOST_PORT=8155` and `PUBLIC_DOMAIN=http://localhost`.

```sh
npm ci
docker compose config --quiet
docker compose up --build -d
docker compose ps
curl -fsS http://localhost:8155/health
```

Open http://localhost:8155. Only the web entrypoint is published, bound to loopback. API and PostgreSQL use the Compose network. The one-shot `bootstrap` service runs a transaction-locked migration followed by an idempotent demo-player/catalog seed before API startup. A named volume retains data across `docker compose down` and `up`; do not use `down -v` unless intentionally deleting all data.

## Development and checks

```sh
npm run typecheck
npm run test
npm run build
npm run dev
```

`npm run dev` serves Vite on port 5173 and API on 3000. Set `DATABASE_URL` to a reachable PostgreSQL database for host development; Compose intentionally does not publish its database. Prefer Compose for the complete runtime.

Root `npm run db:migrate` and `npm run db:seed` require `DATABASE_URL`. Against Compose:

```sh
docker compose run --rm bootstrap node dist/migrate.js
docker compose run --rm bootstrap node dist/seed.js
```

Migrations are checked-in SQL tracked in `schema_migrations`; player seeds preserve existing records; the catalog seed synchronizes the current catalog definition without changing plants or ancestry. `.env` is ignored by Git and Docker build contexts. Production containers run as non-root. The API returns safe uniform errors and health responds 503 if PostgreSQL is unavailable. Relative browser API URLs avoid container hostname leakage. `PUBLIC_BASE_URL` is validated and derived from origin plus port for localhost, or just origin behind a production reverse proxy.

Routes: `/` redirects to `/lab`, which contains curated rendering studies, four stages, cosmetic seed and manual golden-vein preview, derived trait inspection, and SVG/PNG export with warm or transparent background. `/gallery` is a proof atlas of 12 systematic variants plus a 100-seed rendering demo. `/breed` remains a clearly labeled M3 empty state; `/about` explains the fictional genetics model. These studies are not saved plants. No authentication: this sandbox is intended for local use.

Read [the implementation plan](docs/IMPLEMENTATION_PLAN.md) and [progress log](docs/PROGRESS.md) for acceptance gates.


## Domain and artwork

Genetics v1 uses fixed-locus diploid genomes, explicit dominance, seeded Mulberry32 inheritance, mutation logs and derived rarity. The catalog and phenotype preview APIs are available under `/api/v1`; see `docs/API_AND_DATA.md` for request examples. Pure packages use built JS exports; root build/typecheck/test/dev scripts first build package dependencies in order.

Velvetleaf is composed from 15 original handcrafted SVG primitives and six curated palettes. `npm run assets:write` regenerates standalone primitive sources from the typed paths; tests reject source drift. `assets/README.md` documents CC0 artwork provenance. Geometry is deterministic and all exported assets are self-contained.

For optional browser acceptance QA, install/provide Playwright and Chrome, then run `node scripts/verify-m2.cjs` against the running Compose app. `PLAYWRIGHT_MODULE` may point to an available Playwright package and `BROWSER_EXECUTABLE` to a browser binary. The script checks desktop/mobile overflow, 12/100 rendering studies, namespace collisions, seed invariance, real downloads, PNG alpha/background and pixel equivalence to the live preview. Screenshots and measurements are written to `artifacts/m2`.

