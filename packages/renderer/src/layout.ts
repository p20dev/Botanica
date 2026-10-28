import {
  createRng,
  getSpecies,
  phenotypeSchema,
  seedSchema,
  type Phenotype,
} from "@botanica/genetics";
import { paletteFor } from "./palettes.js";
import {
  sceneSchema,
  stages,
  type GrowthStage,
  type PlantScene,
  type SceneNode,
  type AssetId,
} from "./types.js";
const anchors = {
  compact: [
    [211, 325, -58, 0.82],
    [299, 304, 54, 0.85],
    [223, 268, -45, 0.82],
    [285, 242, 45, 0.78],
    [239, 212, -28, 0.74],
    [252, 195, 12, 0.77],
  ],
  bushy: [
    [188, 319, -58, 0.94],
    [325, 299, 58, 0.93],
    [207, 254, -48, 0.94],
    [311, 222, 48, 0.89],
    [239, 179, -28, 0.82],
    [278, 156, 26, 0.78],
  ],
  trailing: [
    [170, 378, -128, 0.83],
    [342, 380, 128, 0.83],
    [209, 263, -54, 0.94],
    [303, 243, 51, 0.93],
    [241, 212, -25, 0.83],
    [259, 211, 25, 0.83],
  ],
} as const;
const round = (v: number) => Math.round(v * 1000) / 1000;
export function layoutPlant(
  speciesId: string,
  phenotype: Phenotype,
  visualSeed: number,
  growthStage: GrowthStage = "mature",
  rendererVersion: number = 1,
): PlantScene {
  getSpecies(speciesId, phenotype.catalogVersion);
  const p = phenotypeSchema.parse(phenotype);
  seedSchema.parse(visualSeed);
  if (
    p.speciesId !== speciesId ||
    rendererVersion !== 1 ||
    !stages.includes(growthStage)
  )
    throw new Error("Unsupported renderer inputs.");
  const rng = createRng(visualSeed),
    palette = paletteFor(p),
    nodes: SceneNode[] = [];
  const add = (
    assetId: AssetId,
    layer: number,
    x = 0,
    y = 0,
    rotation = 0,
    scale = 1,
    pattern: SceneNode["pattern"] = "solid",
  ) =>
    nodes.push({
      assetId,
      layer,
      x: round(x),
      y: round(y),
      rotation: round(rotation),
      scale: round(scale),
      palette: { ...palette },
      pattern,
    });
  add("shadow", 0);
  add((visualSeed & 1) === 0 ? "pot_terracotta" : "pot_ceramic", 1);
  const stageScale = {
    seedling: 0.42,
    juvenile: 0.69,
    mature: 1,
    flowering: 1,
  }[growthStage];
  const active =
    growthStage === "seedling"
      ? anchors.compact.slice(-2)
      : growthStage === "juvenile"
        ? anchors[p.growthHabit].slice(-4)
        : anchors[p.growthHabit];
  const positions = active.map(([x, y, r, s], i) => ({
    x: 256 + (x - 256) * stageScale + (rng() - 0.5) * 8 * stageScale,
    y: 389 + (y - 389) * stageScale + (rng() - 0.5) * 8 * stageScale,
    r: r + (rng() - 0.5) * 9,
    s: s * stageScale * (0.95 + rng() * 0.1),
    rear: i % 2 === 0,
  }));
  for (const leaf of positions.filter((v) => v.rear))
    add(
      ("leaf_" + p.leafShape) as AssetId,
      2,
      leaf.x,
      leaf.y,
      leaf.r,
      leaf.s,
      p.leafPattern,
    );
  // Stage scaling is around the soil line. Branch primitives share the canonical 512-space.
  add(
    ("branch_" +
      (growthStage === "seedling" ? "compact" : p.growthHabit)) as AssetId,
    3,
    256 * (1 - stageScale),
    389 * (1 - stageScale),
    0,
    stageScale,
  );
  add("stem", 3);
  for (const leaf of positions.filter((v) => !v.rear))
    add(
      ("leaf_" + p.leafShape) as AssetId,
      4,
      leaf.x,
      leaf.y,
      leaf.r,
      leaf.s,
      p.leafPattern,
    );
  if (growthStage === "flowering") {
    const count = { low: 2, medium: 4, high: 6 }[p.flowerDensity];
    for (let i = 0; i < count; i++) {
      const x = 230 + (i % 2 ? 1 : -1) * (18 + Math.floor(i / 2) * 19),
        y = 130 + Math.floor(i / 2) * 35;
      const flowerX = x + (rng() - 0.5) * 9,
        flowerY = y + (rng() - 0.5) * 7;
      const rotation = (rng() - 0.5) * 30,
        scale = 0.65 + rng() * 0.15;
      const dx = flowerX - 256,
        dy = flowerY - 240;
      add(
        "flower_stalk",
        3,
        256,
        240,
        (Math.atan2(dx, -dy) * 180) / Math.PI,
        Math.hypot(dx, dy) / 100,
      );
      add(
        (["bloom_round", "bloom_star", "bloom_cup", "bloom_double"] as const)[
          i % 4
        ],
        6,
        flowerX,
        flowerY,
        rotation,
        scale,
      );
    }
  }
  add((visualSeed & 1) === 0 ? "pot_terracotta" : "pot_ceramic", 8);
  return sceneSchema.parse({
    speciesId,
    rendererVersion,
    visualSeed,
    growthStage,
    phenotype: p,
    nodes: nodes.sort((a, b) => a.layer - b.layer),
  });
}
