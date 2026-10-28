import { z } from "zod";
export const CATALOG_VERSION = 1 as const;
export const ENGINE_VERSION = 1 as const;
export const loci = [
  "flowerColor",
  "flowerDensity",
  "growthHabit",
  "leafPattern",
  "leafShape",
  "pigment",
] as const;
export type Locus = (typeof loci)[number];
const pair = <T extends readonly [string, ...string[]]>(values: T) =>
  z.tuple([z.enum(values), z.enum(values)]);
export const genomeSchema = z.strictObject({
  pigment: pair(["G", "P", "R", "Y"]),
  leafShape: pair(["O", "L", "S"]),
  leafPattern: pair(["S", "V", "M"]),
  growthHabit: pair(["C", "B", "T"]),
  flowerColor: pair(["W", "P", "B", "R"]),
  flowerDensity: pair(["L", "M", "H"]),
});
export type Genome = z.infer<typeof genomeSchema>;
export const mutationSchema = z.array(z.literal("golden_veins")).max(1);
export type NamedMutation = "golden_veins";
export const seedSchema = z.number().int().min(-2147483648).max(2147483647);
export const phenotypeSchema = z.strictObject({
  speciesId: z.literal("velvetleaf"),
  catalogVersion: z.literal(1),
  pigment: z.enum(["green", "purple", "red", "yellow"]),
  leafShape: z.enum(["oval", "lobed", "pointed"]),
  leafPattern: z.enum(["solid", "variegated", "marbled"]),
  growthHabit: z.enum(["compact", "bushy", "trailing"]),
  flowerColor: z.enum(["white", "pink", "blue", "red"]),
  flowerDensity: z.enum(["low", "medium", "high"]),
  mutations: mutationSchema,
});
export type Phenotype = z.infer<typeof phenotypeSchema>;
export const velvetleaf = {
  id: "velvetleaf",
  name: "Velvetleaf",
  compatibilityGroup: "velvetleaf",
  catalogVersion: CATALOG_VERSION,
  allowedPartners: [] as string[],
  hybridOffspring: {} as Record<string, string>,
  loci: {
    pigment: {
      dominance: ["P", "R", "Y", "G"],
      labels: { G: "green", P: "purple", R: "red", Y: "yellow" },
    },
    leafShape: {
      dominance: ["L", "S", "O"],
      labels: { O: "oval", L: "lobed", S: "pointed" },
    },
    leafPattern: {
      dominance: ["V", "M", "S"],
      labels: { S: "solid", V: "variegated", M: "marbled" },
    },
    growthHabit: {
      dominance: ["T", "B", "C"],
      labels: { C: "compact", B: "bushy", T: "trailing" },
    },
    flowerColor: {
      dominance: ["B", "R", "P", "W"],
      labels: { W: "white", P: "pink", B: "blue", R: "red" },
    },
    flowerDensity: {
      dominance: ["H", "M", "L"],
      labels: { L: "low", M: "medium", H: "high" },
    },
  },
  mutationRates: { allele: 0.005, golden_veins: 0.001 },
  rarityPolicy: {
    unusual: {
      pigment: ["green"],
      leafShape: ["oval"],
      growthHabit: ["compact"],
      flowerColor: ["white"],
      flowerDensity: ["low"],
    },
    patterns: ["variegated", "marbled"],
    combination: { pigment: "yellow", flowerColor: "blue" },
  },
} as const;
export const catalog = [velvetleaf] as const;
export const exampleGenome: Genome = {
  pigment: ["P", "G"],
  leafShape: ["L", "O"],
  leafPattern: ["V", "S"],
  growthHabit: ["B", "C"],
  flowerColor: ["R", "W"],
  flowerDensity: ["H", "M"],
};
export class GeneticsError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "GeneticsError";
  }
}
export function getSpecies(id: string, version: number = 1) {
  if (version !== 1)
    throw new GeneticsError(
      "UNSUPPORTED_VERSION",
      "Unsupported catalog version.",
    );
  const species = catalog.find((s) => s.id === id);
  if (!species) throw new GeneticsError("UNKNOWN_SPECIES", "Unknown species.");
  return species;
}
