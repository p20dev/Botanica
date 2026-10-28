import { z } from "zod";
import { phenotypeSchema } from "@botanica/genetics";
export const stages = ["seedling", "juvenile", "mature", "flowering"] as const;
export type GrowthStage = (typeof stages)[number];
export const assetIds = [
  "leaf_oval",
  "leaf_lobed",
  "leaf_pointed",
  "branch_compact",
  "branch_bushy",
  "branch_trailing",
  "stem",
  "flower_stalk",
  "bloom_round",
  "bloom_star",
  "bloom_cup",
  "bloom_double",
  "pot_terracotta",
  "pot_ceramic",
  "shadow",
] as const;
export type AssetId = (typeof assetIds)[number];
export const paletteSchema = z.strictObject({
  leafBase: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  leafShade: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  vein: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  variegation: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  flower: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type Palette = z.infer<typeof paletteSchema>;
export const sceneNodeSchema = z.strictObject({
  layer: z.number().int().min(0).max(8),
  assetId: z.enum(assetIds),
  x: z.number().finite().min(-100).max(612),
  y: z.number().finite().min(-100).max(612),
  rotation: z.number().finite().min(-180).max(180),
  scale: z.number().finite().min(0.01).max(2),
  palette: paletteSchema,
  pattern: z.enum(["solid", "variegated", "marbled"]).default("solid"),
});
export type SceneNode = z.infer<typeof sceneNodeSchema>;
export const sceneSchema = z.strictObject({
  speciesId: z.literal("velvetleaf"),
  rendererVersion: z.literal(1),
  visualSeed: z.number().int().min(-2147483648).max(2147483647),
  growthStage: z.enum(stages),
  phenotype: phenotypeSchema,
  nodes: z.array(sceneNodeSchema).max(80),
});
export type PlantScene = z.infer<typeof sceneSchema>;
export type Background = "transparent" | "warm";
