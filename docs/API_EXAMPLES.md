# Botanica API examples

All URLs below are relative to `http://localhost:8155/api/v1` (or the configured HTTPS public origin). Health remains `GET /health`. Catalog, phenotype resolution and SVG preview are stateless public operations. Player-owned routes require the HttpOnly session cookie; writes additionally require an approved `Origin` and `X-CSRF-Token` returned by authentication or `GET /me`.

## Session and recovery

- `POST /auth/register` and `POST /auth/login`: `{ "username": "your_name", "password": "your private password" }`. Usernames are case-insensitive, 3–24 ASCII letters/digits/underscores; passwords are 10–128 characters.
- Signup returns five `recoveryCodes` once. Save them privately. `POST /auth/recover` takes username, new password and `recoveryCode`; a code works once and revokes prior sessions.
- `GET /me`: current identity, coins, XP, level and CSRF token. `POST /auth/logout` revokes the current session. Never put passwords, cookies or recovery codes in logs or URLs.

## Game operations

`GET /game/state` returns the authoritative aggregate: player HUD, seed inventory, greenhouses with slots/timestamps, quests, shop/research unlocks, workers and the most recent offline calculation. Server UTC timestamps govern growth. Relevant reads/mutations reconcile bounded work under the player's row lock.

`POST /game/action` uses this envelope; generate a UUID once per intended operation and reuse it after a network failure:

```json
{
  "action": "plant",
  "requestId": "a newly generated UUID",
  "data": { "slotId": "your owned empty slot UUID", "seedType": "starter" }
}
```

Operation data:

| action | data |
|---|---|
| plant | slotId, seedType: starter/uncommon/rare |
| harvest | slotId |
| purchase | itemId from state.shop, optional owned houseId |
| sell | plantId |
| flags | plantId, favorite: boolean, protected: boolean |
| claim | questId from state.quests |
| research | researchId from state.research |
| hire | kind: gardener/breeder |
| assign | workerId, greenhouseId, enabled, policy |

Policy fields: `mode` (repeat_crop/repeat_cross/target_trait), `seedType`, `autoSell` (false by default), `reserveCoins` (default 100), optional `parentAId`/`parentBId`, `targetPigment` and `targetPattern`. Breeders require two owned unsold game-grown parents. Target mode requires Selective breeding research and protects matching results without changing their odds. Saving a recipe starts it from the save time; no retroactive use of the new recipe.

The server validates prices, inventory, level, ownership and readiness. Reusing a request ID for different content returns 409. Receipt retries replay the stored result. Pending large offline backlogs return `OFFLINE_PENDING`; fetch state to process subsequent batches before spending newly obtained resources. Sales preserve ancestry rows and exclude sold specimens from inventory. Protected/favorite plants cannot be sold; automated sales additionally exclude first discoveries, non-Common plants and the last specimen of a species.

## Collection and genetics

- `GET /plants?limit=24&sort=newest`: own unsold plants; optional q, species, pigment, pattern, rarity and cursor. Sorts: newest/oldest/name/rarity. Cursor is bound to its filter/sort; reset it after changing either.
- `GET /plants/:id`, `/plants/:id/birth`, `/collection/stats`, `GET /breeding`: owned detail, ancestry/event and collection/journal data. Sold records remain readable to their owner for lineage.
- `POST /breeding`: `{ "parentAId": "owned grown UUID", "parentBId": "another owned grown UUID", "idempotencyKey": "new UUID" }`. Costs 75 coins at level 3. Authoritative genetics creates and records the child once, retaining both parents.
- `POST /plants`: advanced study only. Accepts speciesId, valid genome, name and optional cosmetic visualSeed. Excludes game rewards; no client-supplied rarity, mutations or ownership claims. This existing creative save operation is outside the monetary receipt API.
- `GET /demo/plants?limit=100` and `/demo/plants/:id`: authenticated read-only reference herbarium. It never becomes player inventory.
- `POST /phenotype/resolve`: speciesId, paired-allele genome and optional preview mutations/catalogVersion. `POST /preview` additionally accepts visualSeed, growthStage (seedling/juvenile/mature/flowering), rendererVersion and background (warm/transparent). Outputs deterministic original SVG; no persisted game plant is created.

Errors use `{ "error": { "code": "...", "message": "..." } }`; 401 means sign in, 403 means origin/CSRF rejection, 404 conceals inaccessible records, 409 indicates a game constraint and 429 throttles auth attempts. No client-provided owner ID is authoritative.
