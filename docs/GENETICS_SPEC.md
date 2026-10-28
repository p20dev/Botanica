# Genetics contract v1

## Basic representation
This is an intentional **game model** inspired by Mendelian genetics. It is not rigorous botanical genetics. Genomes are diploid: each locus is `[alleleFromParentA, alleleFromParentB]` (ordering retained for parental origin if useful). The trait catalog is species-family scoped, versioned and data-driven.

Initial loci:
| key | alleles | mode | visible phenotype |
|---|---|---|---|
| pigment | `G,P,R,Y` | categorical dominance `P > R > Y > G` for v1 | leaf base palette |
| leafShape | `O,L,S` | `L > S > O` | oval/lobed/pointed silhouette |
| leafPattern | `S,V,M` | `V > M > S` | solid/variegated/marbled |
| growthHabit | `C,B,T` | `T > B > C` | compact/bushy/trailing |
| flowerColor | `W,P,B,R` | `B > R > P > W` | flower palette |
| flowerDensity | `L,M,H` | `H > M > L` | number of blooms |

Dominance order is a gameplay simplification and is **not** an assertion about real plant biology. Use stable, named IDs in catalog; do not rely on one-letter characters to be globally unique between loci.

## Determinism contract
- `resolvePhenotype(speciesId, genome, mutations, catalogVersion): Phenotype` pure, no RNG.
- `layoutPlant(speciesId, phenotype, visualSeed, growthStage, rendererVersion): PlantScene` pure; same inputs result in same scene bytes/geometry to meaningful precision.
- `breed(parentA, parentB, seed, catalogVersion): BreedingResult` pure; reject incompatible species, select one parental allele per locus with uniform seeded draw, independently across loci for v1. Use fixed PRNG and documented serialization of seed. Save source seed, engine version and result in breeding event.
- `generateSeed()` server-only with secure randomness; genetics gets explicit numerical seed. Use a testable seeded generator such as Mulberry32 or PCG32 and document cross-runtime integer semantics.
- `visualSeed` affects only cosmetic leaf placement/density jitter within the constraints of resolved phenotype. Never affects hereditary traits.
- Allele catalog/engine version changes must not silently rewrite existing stored genotypes. Keep backwards-compatible resolution or migration scripts.

## Cross compatibility
- Species have `compatibilityGroup`, plus optional allowed partner overrides.
- Default: only same-group species can cross. Unapproved combinations reject with machine code `INCOMPATIBLE_SPECIES`.
- In v1, seed offspring species is parent A if same species, otherwise use a **specified deterministic hybrid rule**; initially disallow interspecies even within group until hybrids are defined in data. Code should have a clear compatibility extension point.

## Mutation rules
- Per-locus mutation is optional and small; **baseline probability 0.005 per inherited allele** in configurable catalog; when triggered replace inherited allele with a *different valid allele* selected uniformly. Persist event log of mutations.
- Rare named morphological mutation `golden_veins` is an explicit modifier with a separate configurable triggered probability, initially **0.001 per offspring**, rolled only at breeding. It changes vein rendering only, not chromosome alleles.
- These are example balance values, not promises of rarity tiers; capture actual result via tests.
- Mutation outcome must be committed once with breeding transaction, not recomputed on fetching plant.

## Rarity policy
- Rarity is a **derived, versioned classification**, not an independent RNG reward.
- Score `0..100`: +20 for each recessive unusual phenotype (max +40), +20 for variegated/marbled patterns, +25 for named rare mutation, +15 for other uncommon combination; clamp 100. Define unusual traits per species catalog rather than hardcoding across all species.
- Tier thresholds: Common 0–9, Uncommon 10–24, Rare 25–44, Epic 45–64, Legendary 65–84, Mythic 85–100. Some tiers may be inaccessible before more traits/species are added; do not misrepresent tier frequency.
- `rarityPolicyVersion=1`, store score and tier at birth with policy version; provide a recompute command for future version upgrades, but no automatic silent rewrite.
- Display collection frequency (from actual dataset) separately from rarity tier.

## Breeding algorithm outline
1. Validate species compatibility, complete genomes and locus alleles using Zod.
2. Instantiate deterministic RNG from event seed.
3. At each locus, draw exactly one of each parent's two alleles; invoke mutation checks in **stable sorted locus order**.
4. Roll named mutations in stable sorted ID order (fixed order documented).
5. Resolve phenotype and classify rarity.
6. Derive fresh child `visualSeed` deterministically from event seed; persist child, generation `max(parents)+1`, parent IDs, breed event and costs atomically.
7. Return resolved phenotype and persisted child.

## Tests (mandatory, small and meaningful)
- `Pg × Pg` in a single dominant locus: 25% homozygous dominant, 50% heterozygous, 25% homozygous recessive after >=10,000 draws with mutation OFF, tolerances ±2 percentage points.
- Two parents with same genotype and fixed seed always reproduce same child.
- Same genome, different visualSeed: same phenotype, different cosmetics.
- Invalid alleles, missing loci and incompatible species fail.
- Mutations never create an unknown allele and are logged.
- No simultaneous duplicate breeding can spend resources twice (when economy implemented); meanwhile transaction persists exactly one child per idempotency key.
