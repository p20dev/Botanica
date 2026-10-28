# Plant Laboratory API

All endpoints use relative URLs under `/api/v1`. This is a single-owner local sandbox without authentication. The server fixes the sandbox owner; clients cannot assign ownership, ancestry, mutation outcomes, rarity or breeding seeds. Errors use `{error:{code,message,details?}}`.

## Design and save

```sh
curl -fsS http://localhost:8155/api/v1/catalog/species
curl -fsS -X POST http://localhost:8155/api/v1/plants \
  -H 'Content-Type: application/json' \
  -d '{"speciesId":"velvetleaf","name":"My study","genome":{"pigment":["P","G"],"leafShape":["L","O"],"leafPattern":["V","S"],"growthHabit":["B","C"],"flowerColor":["R","W"],"flowerDensity":["H","M"]}}'
```

A designed plant is a generation 0 founder. An optional signed-int32 `visualSeed` controls cosmetics; otherwise the server generates it securely. Named mutation flags are accepted only by non-persistent preview endpoints. The UI makes manual preview flags explicit and never saves them as bred mutations. Plant names contain 1–60 characters. Extra or immutable client fields are rejected.

## Collection and details

```sh
curl -fsS 'http://localhost:8155/api/v1/plants?limit=24&pigment=purple&pattern=marbled&sort=rarity'
curl -fsS 'http://localhost:8155/api/v1/plants?q=Fern&sort=name'
curl -fsS http://localhost:8155/api/v1/plants/10000000-0000-4000-8000-000000000001
curl -fsS http://localhost:8155/api/v1/collection/stats
```

Lists return `{items,nextCursor,total}`. Pass an opaque `nextCursor` back as URL-encoded `cursor` with the same filters and sort. Limits are 1–100, default 24. Filters: `species`, `pigment`, `pattern`, `rarity`; `q` searches names, IDs, expressed pigment and pattern (up to 80 characters; wildcard characters are literal). Sorts: `newest`, `oldest`, `name`, `rarity`. UUID ties make every order stable; timestamp cursors retain PostgreSQL microseconds. Changing a cursor's filter/sort context returns 400. Counts describe the actual saved collection, independently of versioned rarity scores.

Each plant DTO includes canonical genome, resolved phenotype, named modifiers, parents, generation, owner, name, origin, creation time, genome/renderer versions, visual seed and persisted birth rarity score/tier/reasons/policy version. `/plants/:id/birth` returns `{event}` for bred children or `{event:null}` for founders. No read operation rerolls inheritance, mutations or rarity.

## Breed saved parents

```sh
curl -fsS -X POST http://localhost:8155/api/v1/breeding \
  -H 'Content-Type: application/json' \
  -d '{"parentAId":"10000000-0000-4000-8000-000000000001","parentBId":"10000000-0000-4000-8000-000000000002","idempotencyKey":"90000000-0000-4000-8000-000000000001"}'
curl -fsS 'http://localhost:8155/api/v1/breeding?limit=12'
```

The POST returns `{plant,event}`. Use a fresh UUID key for each intended new cross; reuse the same key for retries. Concurrent identical keys return the original child/event. Reusing a key for another parent pair returns 409. Two distinct owned parents and an approved compatibility rule are required. A single transaction records the child, its parents, secure event seed, engine version and mutation log. Errors or transaction failure leave no orphan child. Generation is `max(parent generations)+1`.

## Preview and exports

`POST /phenotype/resolve` accepts a genome with `speciesId`, optional `mutations` and `catalogVersion:1`; it returns phenotype and rarity preview. `POST /preview` additionally accepts `visualSeed`, `growthStage`, `rendererVersion:1` and `background`; it returns a self-contained SVG string. The browser uses the identical pure renderer for live preview and SVG/PNG downloads. JSON export contains the saved canonical plant DTO and lineage. Image stage/background choices are cosmetic and do not change stored plants.

## Responses and limits

- 400: malformed UUID, unknown allele/version/species, extra fields, invalid query/cursor.
- 404: missing or non-owned plant.
- 409: incompatible species, same parent twice, idempotency key conflict.
- 500: generic unexpected failure, without SQL details or secrets.
- `/health` is outside `/api/v1`: 200 when the DB query succeeds, 503 otherwise.

The demo seed creates exactly 100 fixed-ID specimens, including two named parents. Re-running it fills missing examples and never overwrites saved plant genomes or ancestry. Demonstration mutations are curated illustrations, not claims about breeding frequency.
