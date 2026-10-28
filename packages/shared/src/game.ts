import { z } from "zod";
export const seedTypes = ["starter", "uncommon", "rare"] as const;
export type SeedType = (typeof seedTypes)[number];
export const gameActionSchema = z.strictObject({
  action: z.enum([
    "plant",
    "harvest",
    "purchase",
    "sell",
    "flags",
    "claim",
    "research",
    "hire",
    "assign",
  ]),
  requestId: z.uuid(),
  data: z.record(z.string(), z.unknown()).default({}),
});
export type GameAction = z.infer<typeof gameActionSchema>;
export interface GamePlayer {
  id: string;
  username: string;
  coins: number;
  xp: number;
  level: number;
  nextLevelXp: number;
  csrfToken: string;
}
export interface GameSlot {
  id: string;
  slotNo: number;
  seedType: SeedType | null;
  plantedAt: string | null;
  readyAt: string | null;
  visualSeed: number | null;
  phenotype: import("@botanica/genetics").Phenotype | null;
}
export interface GameHouse {
  id: string;
  name: string;
  slots: number;
  lamp: boolean;
  irrigation: boolean;
  nextSlotCost: number | null;
  plants: GameSlot[];
}
export interface GameItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  level: number;
  disabledReason: string | null;
}
export interface GameQuest {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  coins: number;
  xp: number;
  claimed: boolean;
}
export interface WorkerPolicy {
  mode: "repeat_crop" | "repeat_cross" | "target_trait";
  seedType: SeedType;
  parentAId?: string;
  parentBId?: string;
  targetPigment?: string;
  targetPattern?: string;
  autoSell: boolean;
  reserveCoins: number;
}
export interface GameWorker {
  id: string;
  kind: "gardener" | "breeder";
  greenhouseId: string | null;
  enabled: boolean;
  policy: WorkerPolicy;
  lastProcessedAt: string;
  intervalSeconds: number;
}
export interface OfflineSummary {
  events: number;
  harvested: number;
  sold: number;
  breeds: number;
  seedsUsed: number;
  coinDelta: number;
  notable: string[];
  blocked: number;
  from: string;
  to: string;
}
export interface GameState {
  serverNow: string;
  player: GamePlayer;
  seeds: Record<SeedType, number>;
  greenhouses: GameHouse[];
  quests: GameQuest[];
  shop: GameItem[];
  research: (GameItem & { owned: boolean })[];
  workers: GameWorker[];
  report: OfflineSummary | null;
  pendingWork: boolean;
  recentRuns: { id: string; summary: OfflineSummary }[];
  breedCost: number;
  workerCosts: { gardener: number; breeder: number };
  seedInfo: {
    id: SeedType;
    name: string;
    seconds: number;
    description: string;
  }[];
}
