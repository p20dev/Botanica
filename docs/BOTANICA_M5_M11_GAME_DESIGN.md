# BOTANICA — Game Design Specification v1.0
Status: implementation target for existing M0–M4 Plant Laboratory. Internal game name and public product: **Botanica** (do not rename to Botanical Empire).

## 1. Game fantasy and audience
An illustrated 2D cozy greenhouse empire: start with three seeds and a tiny glasshouse; collect unique, inheritable plants, expand production, unlock botanical research, employ gardeners and breeders, and build a one-of-a-kind collection. A management/incremental/clicker hybrid with genetics as its special differentiator. Browser-first, usable on desktop and mobile; no PvP in v1.

### Player promise
- Immediately understandable action: plant, grow, harvest, earn, expand.
- Discovery: genuine genetic combinations and attractive deterministic artwork, not random rarity stickers.
- Ownership: every specimen has an individual ID, lineage and purposeful keep/sell/breed decision.
- Idle comfort: workers make progress offline; returning yields a transparent production report; no punishment for taking breaks.

## 2. Loops
Short (20–90 seconds): select seed → plant in slot → timer → harvest → coins/XP → replant. Rapid first plant (~20 seconds), later varied durations.
Medium (5–20 minutes): fill contracts, buy slots/upgrades, breed selected specimens, add new species and mutations to collection.
Long (days): expand to specialized greenhouses, hire/upgrade workers, unlock advanced breeding goals, complete species/trait collection.
No clicking hundreds of times to grow one plant; interaction matters because the decisions matter.

## 3. Player onboarding / first 10 minutes
- Registration: username and password only; optional recovery codes shown once. Start with 120 coins, 3 basic seed units, 1 greenhouse (4 slots), no employees.
- Welcome panel gives ONE actionable instruction, not a multi-screen tutorial.
- First seed matures in ~20 seconds; harvest reveals visual specimen, XP and modest coins when sold; player can keep the plant instead.
- First quest: grow a plant (reward 50 coins). Second: sell a plant. Third: buy first slot upgrade. Fourth: make a cross (unlocked early with 2 eligible parents and a small coin cost).
- Visible next goal everywhere. Reveal Research and worker unlock previews without frustrating dead ends.
- Keep starter inventory/seed drops sustainable. A player cannot become permanently bankrupt: base seed pack may always be claimed free on cooldown OR seed returns are guaranteed at harvest; implement guaranteed simple seed recycling rather than a timed claim.

## 4. Screens and navigation
- **Greenhouse (home)**: illustrated backdrop and interactive 4–12 growing slots; each holds original SVG plant, state ring, grow countdown, one-click actions; header shows coins, XP/level, seeds, pending claim; quick links to shop, collection, workers. Show multiple greenhouses via tabs.
- **Shop**: seed packs (known genotype constraints and transparent odds), pots/slot expansions, greenhouse unlocks and equipment; clear cost/effect/locked reason.
- **Breeding**: choose 2 owned compatible mature specimens, show probable allele outcomes when known, cost/time, produce child/seed via authoritative engine; optional advanced lab retains old editor.
- **Collection**: owned plant inventory, rarity frame, favorites/protected, species/trait filters, new discovery markers, lineage; actions sell/keep/use as parent. Bulk selling excludes protected/unique items.
- **Workers**: hire, assign greenhouse, choose one of three policies, display capacity/cost/reserve settings and offline report.
- **Research**: simple small unlock tree tied to player level, coins and discoveries; clear unlock effect.
- **Quests/achievements**: short, comprehensible milestones; no daily-login streak requirements.
- **Settings/account**: logout, sound, animations, recovery code management if implemented.

Navigation: desktop side rail, mobile bottom bar. Do NOT render the app like an ecommerce landing page: minimize hero marketing blocks, oversize headings and decorative editorial sections; favor dense-but-readable gameplay HUD, framed slots, tactile buttons, state feedback, sprite/plant emphasis. shadcn/ui can power dialogs/forms, not dictate art direction.

## 5. Graphics / motion
Reuse existing deterministic SVG renderer and 2D botanical assets. Plant art is central and at least 50% of visual greenhouse region. Game UI aesthetic: deep botanical greens (#14251c, #233c2a), parchment (#f0ead2), warm gold (#deb967), rare accent palettes; distinct frame/color per rarity AND readable text labels. Prefer drawn pots and subtle bevel/texture, avoid generic SaaS dashboard cards and excessive gradients. Microanimations for growth, purchase feedback, harvest, new discovery. Respect `prefers-reduced-motion`. No random stock plant imagery within actual gameplay.

Suggested components: `GameShell`, `CurrencyHUD`, `XPBar`, `GreenhouseScene`, `PlantSlot`, `PlantCard`, `InventorySlot`, `GrowthTimer`, `ShopItem`, `WorkerAssignment`, `BreedingWorkbench`, `DiscoveryReveal`, `QuestTracker`, `OfflineReport`. Existing components should be adapted, not duplicated without reason.

## 6. Economy (initial balance; tune via config)
Currency **coins**, no premium currency. Amounts integers; sale proceeds from server formula. All values below are initial tuning, not hardcoded in UI.

| Item | Cost | Note |
|---|---:|---|
| Starter seed pack | 10 | basic species, guaranteed recyclable seed flow |
| Uncommon seed | 75 | unlocked at level 3 |
| Rare seed | 250 | unlocked at level 7; show transparent odds |
| Slot 5 | 100 | +1 plant slot |
| Slot 6 | 250 | +1 plant slot |
| Grow lamp | 300 | 10% faster growth in greenhouse |
| Irrigation | 650 | enables automated tending efficiency |
| Greenhouse 2 | 2,500 | 6 new slots, unlock level 5 |
| Junior gardener | 1,500 | plants/harvests at defined throughput |
| Breeding specialist | 5,000 | automated recipe breeding |

Base sale value Common 20–35, Uncommon 50–90, Rare 130–250, Epic 400–800, Legendary 1,200–2,000, Mythic not initially sold via simple price multiplier (special accomplishment). Server formula: base species value × rarity factor × bounded trait bonus, rounded to integer; cap outputs to avoid exploitable combinations. Breed costs 75 coins initially; optional timer (~2 minutes) once gameplay is established. Worker wages: no ongoing negative debt in v1; prefer a flat hire cost + throughput capacity limit. Buying and selling uses transactional ledger with reason, source and idempotency key.

Important: harvesting produces a specimen in collection and seed recycling; coins come on **sale/contract completion**, not double-granted for harvest and selling. Player chooses keep vs sell. Rare protected plants never auto-sold.

## 7. Growth and greenhouses
Persist plantedAt/readyAt or growth accumulated segments when upgrade modifiers change. Server time authoritative. States: empty / growing / ready / harvested (then slot empty). Mature plants stored as owned specimens; using one as breeding parent must not destroy it unless explicitly communicated. Grow times: starter tutorial ~20 sec; Common normal ~2–5 min; Uncommon 5–12 min; Rare 12–30 min; specialist species later longer. Offline growth naturally proceeds to readyAt; no decay, wilting or permanent loss on absence. Grow lamp reduces remaining duration according to documented rule, never retroactively corrupt timers.

## 8. Breeding and genetic rules
Reuse existing M0–M4 allele/genome rules and determinism. Require compatible species groups and eligible owned parents. If existing code treats breeding as instantly yielding a plant, wrap it in a game operation that consumes coins/time and creates owned offspring/seed. Record both parent IDs, algorithm version, RNG seed/visualSeed. A breeding event that is retried with same idempotency key cannot yield multiple offspring. A parent's selection must validate user ownership. Mutations are rolled ONCE server side and stored; never reroll on UI load. Breeding recipes: named parent pair or genotype filters. Genetic goal is a filter on generated offspring, not a magic success chance override.

Rarity and discovery: preserve current model unless a documented incompatibility. Rarity labels not a replacement for actual genotype scarcity; first discovery reward only once per player for a well-defined species + phenotype signature. Show odds only where the server can compute accurately, otherwise show a non-misleading 'possible outcomes' label.

## 9. Workers (v1 practical)
Worker types: Gardener (auto harvest+replant), Botanist (research/discovery boost later), Breeder (automatic recipe crosses). Implement Gardener and Breeder fully; Botanist can be a research unlock if not yet active, but do not show hire control without functionality.
- Worker policies: `repeat_crop` (selected seed type), `repeat_cross` (selected compatible parents), `target_trait` (choose desired genotype filters, available later).
- Each worker has throughput/interval and assigned greenhouse; actions consume coins, seeds, available slots and real owned parent eligibility.
- Queue or schedule runs from persisted `lastProcessedAt` and a capped catch-up window (e.g., 24 hours per calculation). Allow maximum 100 simulated events per request. Cursor advances only for events actually resolved; explicit surplus elapsed time may remain for future processing. No duplicate work across concurrent requests: transaction/advisory lock or `FOR UPDATE` on worker state.
- No worker auto-sells favorites, sole remaining specimen of a species, first-time discoveries or plants marked protected. Default automation OFF until player configures it.
- Summary after absence: elapsed interval, number harvested, sold, breeds, seed consumption, money delta, notable finds. Provide event log bounded to recent entries.

## 10. Quest, XP, progression
XP earned on first grow, harvest, successful breeding, first trait/species discovery, milestones; prevent XP farming from repeated no-op requests. Levels unlock features: level 1 grow/sell; level 2 shop upgrades; level 3 breeding; level 5 second greenhouse and gardener; level 7 rare seed and breeder; level 10 target breeding and advanced research. Keep initial achievements to ~12 handcrafted goals. One pinned quest tracker and honest progress meters. No daily streaks, coercive timers, push notifications or real-money loot boxes.

## 11. Data isolation / economy integrity
Player account only username+password; no email. Username normalized uniqueness, Argon2id hashes, same-origin HTTP-only sessions, secure cookie on HTTPS behind trusted proxy, rate limits, basic CSRF protection. Optionally one-time recovery codes shown once during signup. The existing sandbox/demo data must remain isolated: migration may place it under explicit demo/admin account or leave it read-only and unowned, but never make all players share it. Use positive integer coin balances, transaction ledger, ownership checks on all reads and writes, atomic sale/purchase/harvest, and idempotency for operations that might be retried.

## 12. Retention ethics / analytics
Provide progress clarity, optional short quests, visual reveals, collection completion, strategic tradeoffs and tangible offline rewards. Don't use punishing login streaks, pseudo-random hidden sale odds, manufactured scarcity or manipulative notifications. A session should have an interesting next action; a player can leave peacefully at any time. Minimal optional telemetry: anonymous aggregates of tutorial completion, first harvest, first cross, return session and retention after 1/7 days; do not use third-party tracking unless explicitly configured.

## 13. Out of scope for first release
Real-money economy, multiplayer trading, leaderboards, chat, PVP, social media integrations, seasonal battle pass, complex crop simulation, weather APIs, procedural 3D, real AI breeding assistant, extensive content pipeline. Do not invent them.

## 14. Product acceptance (final)
A new player can register, enter greenhouse, grow plant, harvest, sell, use coins to buy more seeds/slots, make a real genetic cross, favorite a rare child, hire gardener, assign an automation policy and return later to truthful offline progress. All UI actions work. Another player cannot see/access their plants. Existing Plant Laboratory genome and SVG features are preserved behind optional advanced route. Desktop and mobile function. Deployment stays on port 8155.
