import { z } from "zod";
import { scoreRarity } from "@botanica/rules";
import {
  CATALOG_VERSION,
  ENGINE_VERSION,
  GeneticsError,
  getSpecies,
  genomeSchema,
  mutationSchema,
  phenotypeSchema,
  seedSchema,
  loci,
  type Genome,
  type Locus,
  type NamedMutation,
  type Phenotype,
} from "./catalog.js";
import { createRng } from "./rng.js";
export * from "./catalog.js";
export * from "./rng.js";
export function validateGenome(
  speciesId: string,
  input: unknown,
  catalogVersion: number = 1,
): Genome {
  getSpecies(speciesId, catalogVersion);
  return genomeSchema.parse(input);
}
export function resolvePhenotype(
  speciesId: string,
  input: unknown,
  mutations: unknown = [],
  catalogVersion: number = 1,
): Phenotype {
  const species = getSpecies(speciesId, catalogVersion),
    genome = validateGenome(speciesId, input, catalogVersion);
  const traits: Record<string, string> = {};
  for (const locus of loci) {
    const def = species.loci[locus];
    const winner = def.dominance.find((allele) =>
      (genome[locus] as string[]).includes(allele),
    )!;
    traits[locus] = (def.labels as Record<string, string>)[winner];
  }
  return phenotypeSchema.parse({
    ...traits,
    speciesId,
    catalogVersion,
    mutations: mutationSchema.parse(mutations),
  });
}
export function classifyRarity(phenotype: Phenotype) {
  const p = phenotypeSchema.parse(phenotype);
  const policy = getSpecies(p.speciesId, p.catalogVersion).rarityPolicy;
  return scoreRarity(
    {
      pigment: p.pigment,
      leafShape: p.leafShape,
      leafPattern: p.leafPattern,
      growthHabit: p.growthHabit,
      flowerColor: p.flowerColor,
      flowerDensity: p.flowerDensity,
    },
    p.mutations,
    policy,
  );
}
export interface CompatibilitySpecies {
  id: string;
  compatibilityGroup: string;
  allowedPartners: readonly string[];
  hybridOffspring: Readonly<Record<string, string>>;
}
export function checkCompatibility(
  left: CompatibilitySpecies,
  right: CompatibilitySpecies,
) {
  if (left.id === right.id)
    return { compatible: true as const, offspringSpeciesId: left.id };
  const hybrid = left.hybridOffspring[right.id];
  if (
    left.compatibilityGroup === right.compatibilityGroup &&
    left.allowedPartners.includes(right.id) &&
    right.allowedPartners.includes(left.id) &&
    hybrid
  )
    return { compatible: true as const, offspringSpeciesId: hybrid };
  return {
    compatible: false as const,
    code: "INCOMPATIBLE_SPECIES",
    message: "No approved hybrid rule exists for this pair.",
  };
}
export function canBreed(a: string, b: string, catalogVersion: number = 1) {
  return checkCompatibility(
    getSpecies(a, catalogVersion),
    getSpecies(b, catalogVersion),
  );
}
export interface BreedingParent {
  id: string;
  speciesId: string;
  genome: Genome;
  generation: number;
  genomeVersion: number;
}
export interface MutationEvent {
  type: "allele" | "named";
  locus?: Locus;
  parent?: "A" | "B";
  from?: string;
  to: string;
}
const parentSchema = z.strictObject({
  id: z.string().min(1),
  speciesId: z.string().min(1),
  genome: genomeSchema,
  generation: z.number().int().nonnegative(),
  genomeVersion: z.literal(1),
});
const optionsSchema = z.strictObject({
  alleleMutationRate: z.number().min(0).max(1).optional(),
  namedMutationRate: z.number().min(0).max(1).optional(),
});
export function breed(
  parentA: BreedingParent,
  parentB: BreedingParent,
  seed: number,
  catalogVersion: number = 1,
  options: { alleleMutationRate?: number; namedMutationRate?: number } = {},
) {
  const a = parentSchema.parse(parentA),
    b = parentSchema.parse(parentB);
  seedSchema.parse(seed);
  optionsSchema.parse(options);
  const compatibility = canBreed(a.speciesId, b.speciesId, catalogVersion);
  if (!compatibility.compatible)
    throw new GeneticsError(compatibility.code, compatibility.message);
  const species = getSpecies(compatibility.offspringSpeciesId, catalogVersion),
    rng = createRng(seed),
    mutationEvents: MutationEvent[] = [];
  const alleleRate = options.alleleMutationRate ?? species.mutationRates.allele,
    namedRate = options.namedMutationRate ?? species.mutationRates.golden_veins;
  const genome = structuredClone(a.genome);
  for (const locus of loci) {
    const inherited: string[] = [
      a.genome[locus][Math.floor(rng() * 2)],
      b.genome[locus][Math.floor(rng() * 2)],
    ];
    for (let index = 0; index < 2; index++)
      if (rng() < alleleRate) {
        const alternatives = species.loci[locus].dominance.filter(
          (allele) => allele !== inherited[index],
        );
        const from = inherited[index];
        inherited[index] =
          alternatives[Math.floor(rng() * alternatives.length)];
        mutationEvents.push({
          type: "allele",
          locus,
          parent: index === 0 ? "A" : "B",
          from,
          to: inherited[index],
        });
      }
    (genome[locus] as [string, string]) = [inherited[0], inherited[1]];
  }
  const mutations: NamedMutation[] = [];
  if (rng() < namedRate) {
    mutations.push("golden_veins");
    mutationEvents.push({ type: "named", to: "golden_veins" });
  }
  const visualSeed =
      Math.floor(createRng(seed ^ 0x56495331)() * 4294967296) | 0,
    phenotype = resolvePhenotype(species.id, genome, mutations, catalogVersion);
  return {
    speciesId: species.id,
    genome,
    mutations,
    phenotype,
    rarity: classifyRarity(phenotype),
    visualSeed,
    parents: [a.id, b.id] as [string, string],
    generation: Math.max(a.generation, b.generation) + 1,
    genomeVersion: CATALOG_VERSION,
    engineVersion: ENGINE_VERSION,
    catalogVersion,
    rngSeed: seed,
    mutationEvents,
  };
}
