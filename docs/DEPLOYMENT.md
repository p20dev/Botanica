# Docker Compose deployment/runbook

## Requested configuration
`.env` includes exactly:
```
HOST_PORT=8155
PUBLIC_DOMAIN=http://localhost
```
The actual **browser URL** is `http://localhost:8155`. `PUBLIC_DOMAIN` is the domain origin requested by owner and deliberately has no port. For local URL construction derive `PUBLIC_BASE_URL=http://localhost:8155`; prefer relative API URLs (`/api/v1/...`) on the web client. Do not send client requests directly to container name `api` (not browser-resolvable).

## M0 required deliverables
- `apps/web/Dockerfile`: multi-stage Node build → lightweight nginx runtime, serving Vite output and forwarding `/api/`, `/health` to `api:3000`. Create nginx config under `apps/web/nginx.conf`. Use SPA history fallback to `index.html`; ensure `/health` and `/api/` proxy rules take precedence.
- `apps/server/Dockerfile`: multi-stage Node build, Node runtime listening on `0.0.0.0:3000` and health endpoint.
- `compose.yaml` is provided; adapt only if necessary for a **working**, secure Compose setup, preserving exposed host port, private DB/API, healthcheck and volume. If Node native dependencies require extra Docker libraries, document why.
- Use `NODE_ENV=development` only for initial local setup; deployment builds should run production assets and API with runtime environment.
- Implement Drizzle migrations on container initialization as a controlled documented command, not an uncontrolled migration loop. Provide `npm run db:migrate`, `npm run db:seed`.
- `docker compose config` should parse correctly before Docker build.

## Commands
```bash
# local bootstrap (after M0 files created)
docker compose config
docker compose up --build -d
docker compose ps
curl -fsS http://localhost:8155/health

# Stop (keep database)
docker compose down

# NEVER use -v unless intentionally deleting data
docker compose down -v
```

## Critical security note
The starter `.env` has a deliberately weak local-only placeholder password. Generate a strong password before exposing the app or sharing `.env`. `.env` is gitignored. In this MVP there is no user authentication: **do not open the app to the public internet** until auth/access control and API throttling are implemented.

## Future reverse proxy
Later replace `PUBLIC_DOMAIN` with a true HTTPS origin and configure TLS at the reverse proxy; no fixed 8155 should be appended for an external HTTPS origin. Keep Compose `HOST_PORT` configurable; enable trusted proxy headers only for known proxy. Do not overbuild this now.

## Implemented M0 bootstrap

Compose publishes web on loopback (`127.0.0.1:${HOST_PORT}:8080`), with nginx running as an unprivileged user. API and DB have no published ports. The `bootstrap` one-shot service uses the API image to run `node dist/migrate.js` then `node dist/seed.js`; API waits for successful completion. A PostgreSQL transaction advisory lock serializes migration execution. A migration tracking table prevents repeat schema application. Player seeds use conflict-safe inserts and preserve existing records. The M1 catalog seed synchronizes the current versioned definition; it does not rewrite plant genomes or ancestry.

For explicit reruns use `docker compose run --rm bootstrap node dist/migrate.js` or `docker compose run --rm bootstrap node dist/seed.js`. Runtime images contain compiled JavaScript; root npm migration/seed scripts use TypeScript tooling for host development with an explicit `DATABASE_URL`. Compose production mode overrides the starter development value without modifying `.env`.

