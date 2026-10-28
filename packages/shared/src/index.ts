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

export const createPlantSchema = z.strictObject({
  speciesId: z.string().min(1),
  genome: genomeSchema,
  visualSeed: z.number().int().min(-2147483648).max(2147483647).optional(),
  name: z.string().trim().min(1).max(60).default("Velvetleaf"),
});
export const breedingRequestSchema = z.strictObject({
  parentAId: z.uuid(),
  parentBId: z.uuid(),
  idempotencyKey: z.uuid(),
});
export const pageQuerySchema = z.strictObject({
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export interface PlantDto {
  gameEligible?: boolean;
  firstDiscovery?: boolean;
  saleCoins?: number | null;
  isFavorite?: boolean;
  isProtected?: boolean;
  soldAt?: string | null;
  id: string;
  name: string;
  ownerId: string;
  speciesId: string;
  genome: import("@botanica/genetics").Genome;
  mutations: import("@botanica/genetics").NamedMutation[];
  phenotype: Phenotype;
  visualSeed: number;
  genomeVersion: number;
  rendererVersion: number;
  generation: number;
  parents: [] | [string, string];
  createdAt: string;
  creationSource: "designed" | "bred" | "demo";
  rarity: ReturnType<typeof classifyRarity>;
}
export interface PageDto<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}
export interface BreedingEventDto {
  id: string;
  parentAId: string;
  parentBId: string;
  childId: string;
  rngSeed: number;
  engineVersion: number;
  mutationEvents: import("@botanica/genetics").MutationEvent[];
  idempotencyKey: string;
  createdAt: string;
}
export interface BreedingResponse {
  plant: PlantDto;
  event: BreedingEventDto;
}
export type CreatePlantRequest = z.input<typeof createPlantSchema>;
export type BreedingRequest = z.infer<typeof breedingRequestSchema>;

export const plantListQuerySchema = pageQuerySchema.extend({
  species: z.literal("velvetleaf").optional(),
  rarity: z
    .enum(["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"])
    .optional(),
  pigment: z.enum(["green", "purple", "red", "yellow"]).optional(),
  pattern: z.enum(["solid", "variegated", "marbled"]).optional(),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(["newest", "oldest", "name", "rarity"]).default("newest"),
});
export type PlantListQuery = z.infer<typeof plantListQuerySchema>;
export interface CollectionStats {
  total: number;
  byRarity: Partial<Record<PlantDto["rarity"]["tier"], number>>;
}
export * from "./game.js";
