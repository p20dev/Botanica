import { z } from "zod";
import {
  genomeSchema,
  mutationSchema,
  type Phenotype,
  type catalog,
  type classifyRarity,
} from "@botanica/genetics";
export const resolveRequestSchema = z.strictObject({
  speciesId: z.string().min(1),
  genome: genomeSchema,
  mutations: mutationSchema.default([]),
  catalogVersion: z.literal(1).default(1),
});
export type ResolveRequest = z.input<typeof resolveRequestSchema>;
export interface ResolveResponse {
  phenotype: Phenotype;
  rarity: ReturnType<typeof classifyRarity>;
}
export interface CatalogResponse {
  catalogVersion: 1;
  species: typeof catalog;
}
