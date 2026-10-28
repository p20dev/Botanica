# Botanica

An illustrated greenhouse game built on the existing Plant Laboratory. Register with a username and password, grow and collect deterministic SVG plants, sell specimens, expand your glasshouses and fund real genetic crosses. Quests, research and opt-in workers support gradual, offline progress. The game uses simplified fictional genetics.

## Run

Keep `.env` local and preserve `HOST_PORT=8155`, `PUBLIC_DOMAIN=http://localhost`. Copy `.env.example` if the file is missing.

```sh
npm ci
docker compose config --quiet
docker compose up --build -d
docker compose ps
curl -fsS http://localhost:8155/health
```

Open http://localhost:8155. Only the web entrypoint is published. It binds to all host interfaces by default so the configured Cloudflare tunnel can reach `http://192.168.1.197:8155`; set `HOST_BIND=127.0.0.1` in the deployment environment for loopback-only access. API and PostgreSQL stay on the Compose network. The one-shot bootstrap service applies transaction-locked, tracked migrations, then seeds the sandbox owner/catalog and 100 deterministic demo plants. Repeat runs do not duplicate or overwrite plants. A named volume retains your collection across `docker compose down` / `up`. Do not use `down -v` unless intentionally deleting all saved data.

## Explore

- `/`: greenhouse home, seed inventory, growing slots, server timers and harvest.
- `/shop`, `/quests`, `/research`: server-priced upgrades, twelve one-time goals and three research unlocks.
- `/workers`: hire and configure gardeners/breeders, opt-in safe auto-sale and bounded offline reports.
- `/settings`: account, logout and reduced motion. One-use password recovery codes are shown once at signup.
- `/examples`: the original sandbox records, preserved separately and read-only.

- `/lab`: complete diploid allele editor, phenotype and rarity explanations, stage/cosmetic seed controls, manual mutation preview, image exports and save designed founder.
- `/breed`: saved parent pickers, compatibility, server-authoritative breeding, saved child, lineage and journal. Failed requests retry with the same idempotency key.
- `/gallery`: persisted collection with search, trait filters, sorting and 24-item pagination. The keyboard-accessible specimen inspector includes genotype, ancestry, birth records and JSON/SVG/PNG exports.
- `/plants/:id`: directly linkable plant detail and ancestry navigation.
- `/studies`: M2 systematic 12-variation atlas and 100-seed renderer proof.
- `/about`: compatibility alias for account/settings.

Advanced Lab studies are preserved outside the game economy: they cannot be sold or used as game parents. Manual golden-vein previews affect image exports only. Saving from the editor creates a new founder without those preview mutations. Bred mutations and rarity outcomes are recorded once on the server. Collection frequency is shown separately from the trait-derived rarity tier.

## Checks and development

```sh
npm run typecheck
npm run test
npm run build
npm run test:integration
docker compose -f compose.test.yaml down
```

The regular test command builds pure package dependencies, runs domain/API tests and checks original SVG source synchronization. Integration cases are skipped unless `TEST_DATABASE_URL` is provided. `test:integration` builds a separate `botanica-checks` stack with a fresh tmpfs PostgreSQL database, no published ports and no access to the application's saved data. It tests clean migrations, idempotent 100-plant seed, persistence, concurrency, rollback, ownership, filter/search/sort and pagination, plus account recovery, monetary integrity, paid breeding and bounded worker catch-up. Game tests use an additional isolated schema. Cleanup removes only the temporary test stack.

`npm run dev` starts Vite (5173) and API (3000); provide a reachable PostgreSQL `DATABASE_URL` in the host environment. Compose intentionally does not publish its database. Prefer Compose for the complete runtime.

Root `npm run db:migrate` / `npm run db:seed` use TypeScript tooling with an explicit `DATABASE_URL`. Against Compose:

```sh
docker compose run --rm bootstrap node dist/migrate.js
docker compose run --rm bootstrap node dist/seed.js
```

Production images run as non-root and contain compiled code. nginx handles SPA routes and proxies `/api/` and `/health`; relative browser URLs keep private container hostnames out of clients. `PUBLIC_BASE_URL` derives localhost plus the exposed port, or just the HTTPS origin behind a production reverse proxy. `.env` is ignored by both Git and Docker build contexts.

## Browser acceptance and artwork

`scripts/verify-m3.cjs` and `scripts/verify-m4.cjs` exercise the real application with Playwright/Chrome and write screenshots, exports and measurements to `artifacts/`. Provide a Playwright package through `PLAYWRIGHT_MODULE` and optionally a browser binary through `BROWSER_EXECUTABLE`. Those historical scripts target the pre-account sandbox. `scripts/verify-game.cjs` exercises the current account/game UI and preserves labeled QA records without saving passwords or sessions to artifacts. Browser checks intentionally retain their labeled founder/offspring as evidence of persistence. M0/M2 artifacts document earlier gates; their historical scripts target their respective earlier UI.

The pure renderer composes 15 original handcrafted SVG primitives, six palettes and deterministic layout. `npm run assets:write` regenerates primitive sources from typed path definitions; tests reject source drift. [Artwork provenance](assets/README.md) documents CC0 assets. No runtime image services, remote fonts, trackers or paid APIs are used.

See [API examples](docs/API_EXAMPLES.md), [deployment](docs/DEPLOYMENT.md), [progress](docs/PROGRESS.md) and [future roadmap](docs/ROADMAP.md).

Accounts use Argon2id, hashed cookie sessions, CSRF protection, ownership-scoped queries and bounded in-process auth throttling. The configured public origin is https://botanica.p20.dev; set `PUBLIC_ORIGINS` explicitly for any additional hostnames. Read [game implementation notes](docs/GAME_IMPLEMENTATION_NOTES.md) for migration, economy and worker semantics.
