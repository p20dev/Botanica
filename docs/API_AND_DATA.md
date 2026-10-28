# API and persistence contracts

## API conventions
Versioned REST at `/api/v1`. JSON UTF-8. Zod validation for input. Consistent failures `{error:{code,message,details?}}`; use 400 for malformed, 404 for missing, 409 for incompatible/duplicate, 500 for unexpected failures. `GET /health` returns 200 JSON and DB health information without credentials.

## Endpoints M0–M4
- `GET /health` — proxy-through health.
- `GET /api/v1/catalog/species` — available species and allele catalogs.
- `POST /api/v1/phenotype/resolve` — validated genome → phenotype + rarity preview; no persistence.
- `POST /api/v1/preview` — validated genome + seed + stage → serialized SVG (or typed scene; choose one and document).
- `GET /api/v1/plants?cursor=&limit=&species=&rarity=&pigment=` — paginated saved demo plants.
- `POST /api/v1/plants` — create demo plant using server-side validation and secure initial visual seed if omitted; no privilege to set own immutable rarity/parent claims.
- `GET /api/v1/plants/:id` — plant, phenotype, parent IDs and status.
- `POST /api/v1/breeding` — `{parentAId,parentBId,idempotencyKey}`; server validates, generates seed, applies genetics, persists child + event in a single transaction. Repeated key returns same result (not additional child).
- `GET /api/v1/breeding?limit=&cursor=` — recent events.

## Data model (first migration)
`species(id PK, name, compatibility_group, catalog_version, config_jsonb)`.
`players(id UUID PK, display_name, created_at)` — seed single sandbox player only; no auth yet.
`plants(id UUID PK, owner_id FK, species_id FK, genome_version integer, genome jsonb, mutations jsonb, visual_seed integer, renderer_version integer, rarity_policy_version integer, rarity_score integer, rarity_tier text, generation integer, parent_a_id nullable FK self, parent_b_id nullable FK self, created_at timestamptz)`.
`breeding_events(id UUID PK, owner_id FK, parent_a_id FK, parent_b_id FK, child_id UNIQUE FK, rng_seed integer, engine_version integer, mutation_events jsonb, idempotency_key unique text, created_at timestamptz)`.
`discoveries(player_id FK, signature text, first_discovered_at timestamptz, PK(player_id,signature))` optional in M4.

Indices: plants(owner_id,created_at DESC), plants(species_id,rarity_tier), breeding_events(owner_id,created_at DESC). Use enum validation in domain layer. Schema-specific migrations must be checked into repository. Seed catalog + demo player in idempotent script; sample gallery generated from seeded fixed seeds for repeatability.

## Example valid genome
```json
{
  "pigment": ["P", "G"],
  "leafShape": ["L", "O"],
  "leafPattern": ["V", "S"],
  "growthHabit": ["B", "C"],
  "flowerColor": ["R", "W"],
  "flowerDensity": ["H", "M"]
}
```

## Example breeding request
```json
{
  "parentAId": "uuid-parent-a",
  "parentBId": "uuid-parent-b",
  "idempotencyKey": "uuid-user-generated-unique-request"
}
```

## Security and transaction invariants
- Only exposed service is the web reverse proxy. Proxy `/api/` and `/health` to `api:3000` over Compose internal network, not to `localhost` from inside container.
- Demo endpoints are deliberately not publicly secure without authentication. For internet deployment, **must** add auth + ownership and rate limits first; current MVP intended for localhost only.
- Sanitize SVG input by using known primitive IDs/validated hex palette values; never interpolate arbitrary string into SVG markup.
- No raw SQL concatenation; no secrets in frontend build; limit payload size.
- Idempotent breeding ensures retries cannot create duplicated child plants.
- API response and schema types must be shared where sensible; avoid circular import chains.

## M1 implemented examples

`GET /api/v1/catalog/species` returns `{catalogVersion:1,species:[...]}` with dominance, phenotype names, compatibility and mutation/rarity policy data. `POST /api/v1/phenotype/resolve` accepts `{speciesId:"velvetleaf",genome:<the six diploid locus pairs>,mutations:[],catalogVersion:1}` and returns `{phenotype,rarity}`. Unknown client fields (including rarity claims) and invalid alleles return a uniform 400 error. Shared request schemas/DTOs are in `packages/shared`; no breeding endpoint exists before M3.
