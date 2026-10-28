import { genomeSchema, type Genome } from "@botanica/genetics";
import type { SeedType } from "@botanica/shared";
export const GAME = {
  starterCoins: 120,
  starterSeeds: 3,
  breedCost: 75,
  firstGrowSeconds: 20,
  maxWorkerEvents: 100,
  catchupHours: 24,
  workerCosts: { gardener: 1500, breeder: 5000 },
  workerIntervals: { gardener: 120, breeder: 300 },
} as const;
export const SLOT_PRICES = [
  100, 250, 500, 750, 1000, 1250, 1500, 2000,
] as const;
export const nextSlotCost = (slots: number): number | null =>
  SLOT_PRICES[slots - 4] ?? null;
export const SEEDS: Record<
  SeedType,
  {
    name: string;
    cost: number;
    level: number;
    seconds: number;
    description: string;
    genome: Genome;
  }
> = {
  starter: {
    name: "Starter seed",
    cost: 10,
    level: 1,
    seconds: 120,
    description:
      "Known purple, lobed, solid foliage. Heterozygous traits make interesting parents. Every harvest returns one starter seed.",
    genome: genomeSchema.parse({
      pigment: ["P", "G"],
      leafShape: ["L", "O"],
      leafPattern: ["S", "S"],
      growthHabit: ["T", "B"],
      flowerColor: ["B", "W"],
      flowerDensity: ["H", "M"],
    }),
  },
  uncommon: {
    name: "Variegated seed",
    cost: 75,
    level: 3,
    seconds: 300,
    description:
      "Guaranteed variegated foliage with purple pigment. No rarity dice roll.",
    genome: genomeSchema.parse({
      pigment: ["P", "G"],
      leafShape: ["L", "O"],
      leafPattern: ["V", "S"],
      growthHabit: ["B", "C"],
      flowerColor: ["R", "W"],
      flowerDensity: ["H", "M"],
    }),
  },
  rare: {
    name: "Heirloom seed",
    cost: 250,
    level: 7,
    seconds: 720,
    description:
      "Known green, oval, solid foliage. Rare classification from two recessive traits.",
    genome: genomeSchema.parse({
      pigment: ["G", "G"],
      leafShape: ["O", "O"],
      leafPattern: ["S", "S"],
      growthHabit: ["T", "T"],
      flowerColor: ["B", "B"],
      flowerDensity: ["H", "H"],
    }),
  },
};
const thresholds = [0, 60, 160, 300, 500, 800, 1200, 1700, 2300, 3000];
export function levelFor(xp: number) {
  let level = 1;
  while (level < 10 && xp >= thresholds[level]) level++;
  return {
    level,
    nextLevelXp: thresholds[level] ?? thresholds[9] + (level - 9) * 1000,
  };
}
export const QUESTS = [
  {
    id: "grow",
    name: "First green",
    description: "Harvest your first plant.",
    stat: "harvested",
    target: 1,
    coins: 50,
    xp: 40,
  },
  {
    id: "sell",
    name: "A little seed money",
    description: "Sell one grown specimen.",
    stat: "sold",
    target: 1,
    coins: 50,
    xp: 60,
  },
  {
    id: "slot",
    name: "Room to grow",
    description: "Purchase a slot expansion.",
    stat: "slotsBought",
    target: 1,
    coins: 100,
    xp: 80,
  },
  {
    id: "cross",
    name: "Family resemblance",
    description: "Make your first genetic cross.",
    stat: "crosses",
    target: 1,
    coins: 200,
    xp: 100,
  },
  {
    id: "keep",
    name: "A living cabinet",
    description: "Keep five mature game plants.",
    stat: "kept",
    target: 5,
    coins: 100,
    xp: 100,
  },
  {
    id: "harvest10",
    name: "Green fingers",
    description: "Harvest ten plants.",
    stat: "harvested",
    target: 10,
    coins: 300,
    xp: 200,
  },
  {
    id: "sell10",
    name: "Market gardener",
    description: "Sell ten plants.",
    stat: "sold",
    target: 10,
    coins: 300,
    xp: 150,
  },
  {
    id: "discover",
    name: "A curious eye",
    description: "Discover five phenotype signatures.",
    stat: "discoveries",
    target: 5,
    coins: 400,
    xp: 200,
  },
  {
    id: "plant20",
    name: "A growing habit",
    description: "Plant twenty seeds.",
    stat: "planted",
    target: 20,
    coins: 400,
    xp: 250,
  },
  {
    id: "house",
    name: "Under new glass",
    description: "Open your second greenhouse.",
    stat: "houses",
    target: 2,
    coins: 500,
    xp: 300,
  },
  {
    id: "worker",
    name: "A helping hand",
    description: "Hire a worker.",
    stat: "workers",
    target: 1,
    coins: 250,
    xp: 200,
  },
  {
    id: "rare",
    name: "Something special",
    description: "Keep a Rare or higher game plant.",
    stat: "rare",
    target: 1,
    coins: 250,
    xp: 200,
  },
] as const;
export const RESEARCH = [
  {
    id: "compost",
    name: "Living compost",
    description: "+10 XP on each harvest.",
    cost: 200,
    level: 2,
  },
  {
    id: "botany",
    name: "Botanical notes",
    description: "+10 XP on each first discovery.",
    cost: 400,
    level: 3,
  },
  {
    id: "selection",
    name: "Selective breeding",
    description:
      "Unlock target-trait worker recipes. Matching offspring are protected; odds are never changed.",
    cost: 1500,
    level: 10,
  },
] as const;
export function saleValue(tier: string, score: number) {
  const factor: Record<string, number> = {
    Common: 1,
    Uncommon: 2.5,
    Rare: 7,
    Epic: 22,
    Legendary: 65,
  };
  return tier === "Mythic"
    ? null
    : Math.min(
        2000,
        Math.round(25 * (factor[tier] ?? 0) * (1 + Math.min(100, score) / 250)),
      );
}
