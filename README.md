# Plant Laboratory / Botanica

M0 provides a running React shell, Fastify API, PostgreSQL schema and repeatable bootstrap. Genetics and game workflows follow in M1–M4.

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

Migrations are checked-in SQL tracked in `schema_migrations`; seeds never overwrite existing records. `.env` is ignored by Git and Docker build contexts. Production containers run as non-root. The API returns safe uniform errors and health responds 503 if PostgreSQL is unavailable. Relative browser API URLs avoid container hostname leakage. `PUBLIC_BASE_URL` is validated and derived from origin plus port for localhost, or just origin behind a production reverse proxy.

Routes: `/` redirects to `/lab`; `/lab`, `/breed`, `/gallery`, `/about` currently show clearly labeled milestone empty states. Original shell illustration is decorative; the deterministic species renderer is M2. No authentication: this sandbox is intended for local use.

Read [the implementation plan](docs/IMPLEMENTATION_PLAN.md) and [progress log](docs/PROGRESS.md) for acceptance gates.
