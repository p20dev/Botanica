import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { resolvePhenotype, canBreed, type Genome } from "@botanica/genetics";
import {
  seedTypes,
  type GameState,
  type GameAction,
  type WorkerPolicy,
  type OfflineSummary,
  type GameWorker,
} from "@botanica/shared";
import {
  GAME,
  SEEDS,
  QUESTS,
  RESEARCH,
  levelFor,
  saleValue,
  nextSlotCost,
} from "./game-config.js";
import { PlantRepository, insertPlant, generateSeed } from "./plants.js";
import { ApiError } from "./errors.js";
import { digest, type Identity } from "./auth.js";
type Client = PoolClient;
interface Player {
  id: string;
  coin_balance: number;
  xp: number;
  game_stats: Record<string, number>;
}
interface Worker {
  id: string;
  kind: "gardener" | "breeder";
  greenhouse_id: string | null;
  enabled: boolean;
  policy: WorkerPolicy;
  last_processed_at: Date;
  irrigation?: boolean;
}
function fail(code: string, message: string): never {
  throw new ApiError(409, code, message);
}
const idSchema = z.strictObject({ plantId: z.uuid() });
const assignSchema = z.strictObject({
  workerId: z.uuid(),
  greenhouseId: z.uuid(),
  enabled: z.boolean(),
  policy: z.strictObject({
    mode: z.enum(["repeat_crop", "repeat_cross", "target_trait"]),
    seedType: z.enum(seedTypes).default("starter"),
    parentAId: z.uuid().optional(),
    parentBId: z.uuid().optional(),
    targetPigment: z.enum(["green", "purple", "red", "yellow"]).optional(),
    targetPattern: z.enum(["solid", "variegated", "marbled"]).optional(),
    autoSell: z.boolean().default(false),
    reserveCoins: z.number().int().min(0).max(1000000).default(100),
  }),
});
export class GameService {
  constructor(
    private pool: Pool,
    private clock: () => Date = () => new Date(),
  ) {}
  async transaction<T>(
    owner: string,
    operation: (c: Client, p: Player, now: Date) => Promise<T>,
  ) {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const p = (
        await c.query<Player>(
          "SELECT id,coin_balance,xp,game_stats FROM players WHERE id=$1 FOR UPDATE",
          [owner],
        )
      ).rows[0];
      if (!p) throw new ApiError(401, "AUTH_REQUIRED", "Sign in again.");
      const result = await operation(c, p, this.clock());
      await c.query("COMMIT");
      return result;
    } catch (error) {
      await c.query("ROLLBACK");
      throw error;
    } finally {
      c.release();
    }
  }
  async money(
    c: Client,
    p: Player,
    amount: number,
    reason: string,
    reference: string,
  ) {
    if (!Number.isSafeInteger(amount)) throw new Error("Invalid ledger amount");
    const row = (
      await c.query(
        "UPDATE players SET coin_balance=coin_balance+$2 WHERE id=$1 AND coin_balance+$2 BETWEEN 0 AND 1000000000 RETURNING coin_balance",
        [p.id, amount],
      )
    ).rows[0];
    if (!row)
      fail(
        "INSUFFICIENT_COINS",
        "Not enough coins, or the coin storage limit was reached.",
      );
    p.coin_balance = row.coin_balance;
    await c.query(
      "INSERT INTO coin_ledger(id,player_id,amount,balance_after,reason,reference) VALUES($1,$2,$3,$4,$5,$6)",
      [randomUUID(), p.id, amount, p.coin_balance, reason, reference],
    );
  }
  async progress(c: Client, p: Player, stat: string, amount = 1, xp = 0) {
    p.game_stats[stat] = (p.game_stats[stat] ?? 0) + amount;
    p.xp += xp;
    await c.query("UPDATE players SET game_stats=$2,xp=$3 WHERE id=$1", [
      p.id,
      JSON.stringify(p.game_stats),
      p.xp,
    ]);
  }
  requireLevel(p: Player, level: number) {
    if (levelFor(p.xp).level < level)
      fail("LEVEL_LOCKED", "Reach level " + level + " to unlock this action.");
  }
  async researched(c: Client, owner: string, id: string) {
    return !!(
      await c.query(
        "SELECT 1 FROM player_research WHERE player_id=$1 AND research_id=$2",
        [owner, id],
      )
    ).rowCount;
  }
  async discovery(
    c: Client,
    p: Player,
    plant: { id: string; phenotype: ReturnType<typeof resolvePhenotype> },
  ) {
    const { catalogVersion, speciesId, ...traits } = plant.phenotype;
    const signature = JSON.stringify({ speciesId, catalogVersion, ...traits });
    if (
      (
        await c.query(
          "INSERT INTO discoveries(player_id,signature,plant_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING signature",
          [p.id, signature, plant.id],
        )
      ).rowCount
    ) {
      await c.query(
        "UPDATE plants SET first_discovery=true WHERE id=$1 AND owner_id=$2",
        [plant.id, p.id],
      );
      await this.money(c, p, 10, "discovery", plant.id);
      await this.progress(
        c,
        p,
        "discoveries",
        1,
        25 + ((await this.researched(c, p.id, "botany")) ? 10 : 0),
      );
      return true;
    }
    return false;
  }
  async plant(
    c: Client,
    p: Player,
    slotId: string,
    seedType: keyof typeof SEEDS,
    now: Date,
  ) {
    const slot = (
      await c.query(
        "SELECT s.*,g.lamp FROM plant_slots s JOIN greenhouses g ON g.id=s.greenhouse_id WHERE s.id=$1 AND g.player_id=$2 FOR UPDATE OF s",
        [slotId, p.id],
      )
    ).rows[0];
    if (!slot)
      throw new ApiError(404, "SLOT_NOT_FOUND", "Growing slot not found.");
    if (slot.seed_type)
      fail("SLOT_OCCUPIED", "This slot already has a growing plant.");
    const used = await c.query(
      "UPDATE inventory_seeds SET quantity=quantity-1 WHERE player_id=$1 AND seed_type=$2 AND quantity>0 RETURNING quantity",
      [p.id, seedType],
    );
    if (!used.rowCount)
      fail(
        "NO_SEEDS",
        "No " +
          seedType +
          " seeds available. Harvest a crop to recycle a starter seed.",
      );
    this.requireLevel(p, SEEDS[seedType].level);
    const seconds =
      (p.game_stats.planted ?? 0) === 0
        ? GAME.firstGrowSeconds
        : SEEDS[seedType].seconds;
    await c.query(
      "UPDATE plant_slots SET seed_type=$2,genome=$3,visual_seed=$4,planted_at=$5,ready_at=$6 WHERE id=$1",
      [
        slotId,
        seedType,
        JSON.stringify(SEEDS[seedType].genome),
        generateSeed(),
        now,
        new Date(now.getTime() + seconds * 1000 * (slot.lamp ? 0.9 : 1)),
      ],
    );
    await this.progress(c, p, "planted");
    return { message: "Seed planted.", slotId };
  }
  async harvest(c: Client, p: Player, slotId: string, now: Date) {
    const slot = (
      await c.query(
        "SELECT s.* FROM plant_slots s JOIN greenhouses g ON g.id=s.greenhouse_id WHERE s.id=$1 AND g.player_id=$2 FOR UPDATE OF s",
        [slotId, p.id],
      )
    ).rows[0];
    if (!slot)
      throw new ApiError(404, "SLOT_NOT_FOUND", "Growing slot not found.");
    if (!slot.seed_type) fail("NOT_GROWING", "This slot is empty.");
    if (new Date(slot.ready_at) > now)
      fail("NOT_READY", "This plant is still growing.");
    const plant = (await insertPlant(
      c,
      {
        name:
          "Velvetleaf " +
          String((p.game_stats.harvested ?? 0) + 1).padStart(3, "0"),
        speciesId: "velvetleaf",
        genome: slot.genome,
        visualSeed: slot.visual_seed,
        creationSource: "designed",
      },
      p.id,
    ))!;
    await c.query(
      "UPDATE plants SET game_eligible=true WHERE id=$1 AND owner_id=$2",
      [plant.id, p.id],
    );
    await c.query(
      "INSERT INTO inventory_seeds VALUES($1,'starter',1) ON CONFLICT(player_id,seed_type) DO UPDATE SET quantity=inventory_seeds.quantity+1",
      [p.id],
    );
    await c.query(
      "UPDATE plant_slots SET seed_type=NULL,genome=NULL,visual_seed=NULL,planted_at=NULL,ready_at=NULL WHERE id=$1",
      [slotId],
    );
    await this.progress(
      c,
      p,
      "harvested",
      1,
      35 + ((await this.researched(c, p.id, "compost")) ? 10 : 0),
    );
    const discovered = await this.discovery(c, p, plant);
    return {
      message: discovered
        ? "A new discovery! Plant harvested; one starter seed recycled."
        : "Plant harvested; one starter seed recycled.",
      plantId: plant.id,
      discovered,
    };
  }
  async eligibleParents(c: Client, owner: string, a: string, b: string) {
    if (a === b) fail("SAME_PARENT", "Choose two different parents.");
    const rows = (
      await c.query(
        "SELECT * FROM plants WHERE owner_id=$1 AND id=ANY($2::uuid[]) AND sold_at IS NULL AND game_eligible=true",
        [owner, [a, b]],
      )
    ).rows;
    if (rows.length !== 2)
      throw new ApiError(
        404,
        "PARENT_UNAVAILABLE",
        "Choose two owned, unsold game-grown plants. Lab studies cannot be used for game rewards.",
      );
    if (!canBreed(rows[0].species_id, rows[1].species_id).compatible)
      fail("INCOMPATIBLE_SPECIES", "These species are not compatible.");
  }
  async crossIn(
    c: Client,
    p: Player,
    input: { parentAId: string; parentBId: string; idempotencyKey: string },
  ) {
    this.requireLevel(p, 3);
    await this.eligibleParents(c, p.id, input.parentAId, input.parentBId);
    await this.money(c, p, -GAME.breedCost, "breeding", input.idempotencyKey);
    const result = await new PlantRepository(this.pool, p.id).cross(input, c);
    await c.query(
      "UPDATE plants SET game_eligible=true WHERE id=$1 AND owner_id=$2",
      [result.plant.id, p.id],
    );
    result.plant.gameEligible = true;
    await this.progress(c, p, "crosses", 1, 50);
    await this.discovery(c, p, result.plant);
    result.plant = await new PlantRepository(this.pool, p.id).getPlant(
      result.plant.id,
      c,
    );
    return result;
  }
  async sell(
    c: Client,
    p: Player,
    plantId: string,
    automatic = false,
    now = this.clock(),
  ) {
    const plant = (
      await c.query(
        "SELECT * FROM plants WHERE id=$1 AND owner_id=$2 FOR UPDATE",
        [plantId, p.id],
      )
    ).rows[0];
    if (!plant || plant.sold_at)
      fail("PLANT_UNAVAILABLE", "This plant is unavailable or already sold.");
    if (!plant.game_eligible)
      fail(
        "STUDY_ONLY",
        "Laboratory and demo studies are not salable game plants.",
      );
    if (plant.is_favorite || plant.is_protected)
      fail("PROTECTED_PLANT", "Remove favorite/protection before selling.");
    const value = saleValue(plant.rarity_tier, plant.rarity_score);
    if (value === null)
      fail(
        "MYTHIC_KEEPSAKE",
        "Mythic specimens are keepsakes and cannot be sold.",
      );
    if (automatic) {
      if (plant.first_discovery || plant.rarity_tier !== "Common") return false;
      const count = Number(
        (
          await c.query(
            "SELECT count(*) FROM plants WHERE owner_id=$1 AND species_id=$2 AND sold_at IS NULL AND game_eligible=true",
            [p.id, plant.species_id],
          )
        ).rows[0].count,
      );
      if (count <= 1) return false;
    }
    await c.query("UPDATE plants SET sold_at=$3 WHERE id=$1 AND owner_id=$2", [
      plantId,
      p.id,
      now,
    ]);
    await this.money(c, p, value, "sale", plantId);
    await this.progress(c, p, "sold", 1, 10);
    return { message: "Plant sold for " + value + " coins.", coins: value };
  }
  async shop(c: Client, p: Player) {
    const houses = (
        await c.query(
          "SELECT * FROM greenhouses WHERE player_id=$1 ORDER BY id",
          [p.id],
        )
      ).rows,
      house = houses[0];
    const level = levelFor(p.xp).level;
    const items = [
      ...Object.entries(SEEDS).map(([id, s]) => ({
        id: "seed_" + id,
        name: s.name,
        description: s.description,
        cost: s.cost,
        level: s.level,
      })),
      {
        id: "slot",
        name: "Extra growing slot",
        description: "Add one slot to the selected greenhouse (maximum 12).",
        cost: nextSlotCost(house?.slots ?? 4) ?? 2000,
        level: 2,
      },
      {
        id: "lamp",
        name: "Grow lamp",
        description:
          "10% faster growth. Remaining time of current crops is reduced once.",
        cost: 300,
        level: 2,
      },
      {
        id: "irrigation",
        name: "Irrigation",
        description: "Assigned gardeners work every 96 seconds instead of 120.",
        cost: 650,
        level: 3,
      },
      {
        id: "greenhouse",
        name: "Second greenhouse",
        description: "Six additional growing slots.",
        cost: 2500,
        level: 5,
      },
    ];
    return items.map((item) => ({
      ...item,
      disabledReason:
        level < item.level
          ? "Unlocks at level " + item.level
          : item.id === "greenhouse" && houses.length >= 2
            ? "Both greenhouses owned."
            : null,
    }));
  }
  async purchase(c: Client, p: Player, data: unknown, now: Date) {
    const input = z
        .strictObject({ itemId: z.string(), houseId: z.uuid().optional() })
        .parse(data),
      item = (await this.shop(c, p)).find((i) => i.id === input.itemId);
    if (!item) fail("UNKNOWN_ITEM", "Unknown shop item.");
    this.requireLevel(p, item.level);
    const house = (
      await c.query(
        "SELECT * FROM greenhouses WHERE player_id=$1 AND ($2::uuid IS NULL OR id=$2) ORDER BY id LIMIT 1",
        [p.id, input.houseId ?? null],
      )
    ).rows[0];
    if (!house) fail("HOUSE_NOT_FOUND", "Select your greenhouse.");
    let cost = item.cost;
    if (item.id === "slot") {
      if (house.slots >= 12)
        fail("SLOTS_FULL", "This greenhouse already has 12 slots.");
      cost = nextSlotCost(house.slots)!;
    }
    if (
      (item.id === "lamp" && house.lamp) ||
      (item.id === "irrigation" && house.irrigation)
    )
      fail("ALREADY_OWNED", "This equipment is already installed.");
    if (item.disabledReason) fail("ITEM_UNAVAILABLE", item.disabledReason);
    await this.money(c, p, -cost, "purchase", item.id);
    if (item.id.startsWith("seed_")) {
      const seed = item.id.slice(5);
      await c.query(
        "INSERT INTO inventory_seeds VALUES($1,$2,1) ON CONFLICT(player_id,seed_type) DO UPDATE SET quantity=inventory_seeds.quantity+1",
        [p.id, seed],
      );
    } else if (item.id === "slot") {
      await c.query("UPDATE greenhouses SET slots=slots+1 WHERE id=$1", [
        house.id,
      ]);
      await c.query(
        "INSERT INTO plant_slots(id,greenhouse_id,slot_no) VALUES($1,$2,$3)",
        [randomUUID(), house.id, house.slots],
      );
      await this.progress(c, p, "slotsBought");
    } else if (item.id === "lamp") {
      await c.query("UPDATE greenhouses SET lamp=true WHERE id=$1", [house.id]);
      await c.query(
        "UPDATE plant_slots SET ready_at=$2::timestamptz+(ready_at-$2::timestamptz)*0.9 WHERE greenhouse_id=$1 AND ready_at>$2",
        [house.id, now],
      );
    } else if (item.id === "irrigation")
      await c.query("UPDATE greenhouses SET irrigation=true WHERE id=$1", [
        house.id,
      ]);
    else {
      const id = randomUUID();
      await c.query(
        "INSERT INTO greenhouses(id,player_id,name,slots) VALUES($1,$2,$3,6)",
        [id, p.id, "The Conservatory"],
      );
      for (let i = 0; i < 6; i++)
        await c.query(
          "INSERT INTO plant_slots(id,greenhouse_id,slot_no) VALUES($1,$2,$3)",
          [randomUUID(), id, i],
        );
    }
    await this.progress(c, p, "purchases");
    return { message: item.name + " purchased.", cost };
  }
  async questState(c: Client, p: Player) {
    const claimed = new Set(
      (
        await c.query("SELECT quest_id FROM player_quests WHERE player_id=$1", [
          p.id,
        ])
      ).rows.map((r) => r.quest_id),
    );
    const kept = Number(
        (
          await c.query(
            "SELECT count(*) FROM plants WHERE owner_id=$1 AND game_eligible AND sold_at IS NULL",
            [p.id],
          )
        ).rows[0].count,
      ),
      rare = Number(
        (
          await c.query(
            "SELECT count(*) FROM plants WHERE owner_id=$1 AND game_eligible AND sold_at IS NULL AND rarity_score>=25",
            [p.id],
          )
        ).rows[0].count,
      ),
      houses =
        (await c.query("SELECT id FROM greenhouses WHERE player_id=$1", [p.id]))
          .rowCount ?? 0,
      workers =
        (await c.query("SELECT id FROM workers WHERE player_id=$1", [p.id]))
          .rowCount ?? 0;
    const stats: Record<string, number> = {
      ...p.game_stats,
      kept,
      rare,
      houses,
      workers,
    };
    return QUESTS.map((q) => ({
      ...q,
      progress: Math.min(q.target, stats[q.stat] ?? 0),
      claimed: claimed.has(q.id),
    }));
  }
  async claim(c: Client, p: Player, data: unknown) {
    const { questId } = z.strictObject({ questId: z.string() }).parse(data),
      quest = (await this.questState(c, p)).find((q) => q.id === questId);
    if (!quest || quest.claimed || quest.progress < quest.target)
      fail("QUEST_NOT_READY", "This quest is not ready to claim.");
    await c.query(
      "INSERT INTO player_quests(player_id,quest_id) VALUES($1,$2)",
      [p.id, questId],
    );
    await this.money(c, p, quest.coins, "quest", questId);
    await this.progress(c, p, "quests", 1, quest.xp);
    return {
      message:
        "Quest complete: +" + quest.coins + " coins, +" + quest.xp + " XP.",
    };
  }
  async research(c: Client, p: Player, data: unknown) {
    const { researchId } = z
        .strictObject({ researchId: z.string() })
        .parse(data),
      item = RESEARCH.find((r) => r.id === researchId);
    if (!item) fail("UNKNOWN_RESEARCH", "Unknown research.");
    this.requireLevel(p, item.level);
    if (await this.researched(c, p.id, item.id))
      fail("ALREADY_OWNED", "Research already completed.");
    await this.money(c, p, -item.cost, "research", item.id);
    await c.query("INSERT INTO player_research VALUES($1,$2,now())", [
      p.id,
      item.id,
    ]);
    return { message: item.name + " researched." };
  }
  async hire(c: Client, p: Player, data: unknown, now: Date) {
    const { kind } = z
      .strictObject({ kind: z.enum(["gardener", "breeder"]) })
      .parse(data);
    this.requireLevel(p, kind === "gardener" ? 5 : 7);
    if (
      Number(
        (
          await c.query("SELECT count(*) FROM workers WHERE player_id=$1", [
            p.id,
          ])
        ).rows[0].count,
      ) >= 4
    )
      fail("WORKER_LIMIT", "Your greenhouse team is full (four workers).");
    await this.money(c, p, -GAME.workerCosts[kind], "hire", kind);
    await c.query(
      "INSERT INTO workers(id,player_id,kind,last_processed_at) VALUES($1,$2,$3,$4)",
      [randomUUID(), p.id, kind, now],
    );
    return {
      message: "Worker hired. Configure an assignment to enable automation.",
    };
  }
  async assign(c: Client, p: Player, data: unknown, now: Date) {
    const input = assignSchema.parse(data),
      worker = (
        await c.query("SELECT * FROM workers WHERE id=$1 AND player_id=$2", [
          input.workerId,
          p.id,
        ])
      ).rows[0],
      house = (
        await c.query(
          "SELECT id FROM greenhouses WHERE id=$1 AND player_id=$2",
          [input.greenhouseId, p.id],
        )
      ).rows[0];
    if (!worker || !house)
      throw new ApiError(
        404,
        "WORKER_NOT_FOUND",
        "Worker or greenhouse not found.",
      );
    if (
      (worker.kind === "gardener" && input.policy.mode !== "repeat_crop") ||
      (worker.kind === "breeder" && input.policy.mode === "repeat_crop")
    )
      fail("INVALID_POLICY", "Choose a policy for this worker type.");
    if (worker.kind === "breeder") {
      if (!input.policy.parentAId || !input.policy.parentBId)
        fail("PARENTS_REQUIRED", "Select two game-grown parents.");
      await this.eligibleParents(
        c,
        p.id,
        input.policy.parentAId,
        input.policy.parentBId,
      );
    }
    this.requireLevel(p, SEEDS[input.policy.seedType].level);
    if (
      input.policy.mode === "target_trait" &&
      !(await this.researched(c, p.id, "selection"))
    )
      fail("RESEARCH_REQUIRED", "Complete Selective breeding research first.");
    await c.query(
      "UPDATE workers SET greenhouse_id=$3,enabled=$4,policy=$5,last_processed_at=$6 WHERE id=$1 AND player_id=$2",
      [
        input.workerId,
        p.id,
        input.greenhouseId,
        input.enabled,
        JSON.stringify(input.policy),
        now,
      ],
    );
    return {
      message: input.enabled
        ? "Automation enabled from now."
        : "Worker paused.",
    };
  }
  async pending(c: Client, owner: string, now: Date) {
    return !!(
      await c.query(
        "SELECT 1 FROM workers w LEFT JOIN greenhouses g ON g.id=w.greenhouse_id WHERE w.player_id=$1 AND w.enabled AND w.last_processed_at + make_interval(secs=> CASE WHEN w.kind='breeder' THEN 300 WHEN g.irrigation THEN 96 ELSE 120 END) <= $2 LIMIT 1",
        [owner, now],
      )
    ).rowCount;
  }
  async reconcileIn(c: Client, p: Player, now: Date) {
    const workers = (
      await c.query<Worker>(
        "SELECT w.*,g.irrigation FROM workers w LEFT JOIN greenhouses g ON g.id=w.greenhouse_id WHERE w.player_id=$1 AND w.enabled ORDER BY w.id",
        [p.id],
      )
    ).rows;
    const summary: OfflineSummary = {
        events: 0,
        harvested: 0,
        sold: 0,
        breeds: 0,
        seedsUsed: 0,
        coinDelta: 0,
        notable: [],
        blocked: 0,
        from: now.toISOString(),
        to: now.toISOString(),
      },
      balance = p.coin_balance;
    const starts = new Map(workers.map((w) => [w.id, w.last_processed_at]));
    const runs = new Map<string, OfflineSummary>();
    for (let event = 0; event < GAME.maxWorkerEvents; event++) {
      const candidates = workers
        .map((w) => ({
          w,
          time: new Date(
            w.last_processed_at.getTime() +
              (w.kind === "breeder" ? 300 : w.irrigation ? 96 : 120) * 1000,
          ),
        }))
        .filter(
          (v) =>
            v.time <= now &&
            v.time.getTime() - starts.get(v.w.id)!.getTime() <=
              GAME.catchupHours * 3600000,
        )
        .sort(
          (a, b) =>
            a.time.getTime() - b.time.getTime() || a.w.id.localeCompare(b.w.id),
        );
      if (!candidates.length) break;
      const { w, time } = candidates[0];
      const before = { ...summary, notable: [...summary.notable] },
        coinsBefore = p.coin_balance;
      if (summary.events === 0)
        summary.from = w.last_processed_at.toISOString();
      summary.events++;
      summary.to = time.toISOString();
      let acted = false;
      const policy = w.policy;
      if (w.kind === "gardener" && w.greenhouse_id) {
        const slots = (
          await c.query(
            "SELECT * FROM plant_slots WHERE greenhouse_id=$1 ORDER BY slot_no",
            [w.greenhouse_id],
          )
        ).rows;
        const ready = slots.find(
          (s) => s.seed_type && new Date(s.ready_at) <= time,
        );
        if (ready) {
          const result = await this.harvest(c, p, ready.id, time);
          summary.harvested++;
          acted = true;
          if (result.discovered) summary.notable.push(result.plantId);
          if (policy.autoSell) {
            const plant = (
              await c.query(
                "SELECT * FROM plants WHERE id=$1 AND owner_id=$2",
                [result.plantId, p.id],
              )
            ).rows[0];
            if (
              !plant.first_discovery &&
              plant.rarity_tier === "Common" &&
              !plant.is_favorite &&
              !plant.is_protected &&
              (await this.sell(c, p, plant.id, true, time))
            )
              summary.sold++;
          }
          const qty =
            (
              await c.query(
                "SELECT quantity FROM inventory_seeds WHERE player_id=$1 AND seed_type=$2",
                [p.id, policy.seedType],
              )
            ).rows[0]?.quantity ?? 0;
          if (qty > 0) {
            await this.plant(c, p, ready.id, policy.seedType, time);
            summary.seedsUsed++;
          }
        } else {
          const empty = slots.find((s) => !s.seed_type),
            qty =
              (
                await c.query(
                  "SELECT quantity FROM inventory_seeds WHERE player_id=$1 AND seed_type=$2",
                  [p.id, policy.seedType],
                )
              ).rows[0]?.quantity ?? 0;
          if (empty && qty > 0) {
            await this.plant(c, p, empty.id, policy.seedType, time);
            summary.seedsUsed++;
            acted = true;
          }
        }
      } else if (
        w.kind === "breeder" &&
        policy.parentAId &&
        policy.parentBId &&
        p.coin_balance >= GAME.breedCost + policy.reserveCoins
      ) {
        const valid = (
          await c.query(
            "SELECT count(*) FROM plants WHERE owner_id=$1 AND id=ANY($2::uuid[]) AND game_eligible AND sold_at IS NULL",
            [p.id, [policy.parentAId, policy.parentBId]],
          )
        ).rows[0];
        if (Number(valid.count) === 2) {
          const result = await this.crossIn(c, p, {
            parentAId: policy.parentAId,
            parentBId: policy.parentBId,
            idempotencyKey: randomUUID(),
          });
          summary.breeds++;
          acted = true;
          if (result.plant.rarity.score >= 25)
            summary.notable.push(result.plant.id);
          if (
            policy.mode === "target_trait" &&
            (!policy.targetPigment ||
              result.plant.phenotype.pigment === policy.targetPigment) &&
            (!policy.targetPattern ||
              result.plant.phenotype.leafPattern === policy.targetPattern)
          )
            await c.query(
              "UPDATE plants SET is_protected=true WHERE id=$1 AND owner_id=$2",
              [result.plant.id, p.id],
            );
        }
      }
      if (!acted) summary.blocked++;
      const run = runs.get(w.id) ?? {
        events: 0,
        harvested: 0,
        sold: 0,
        breeds: 0,
        seedsUsed: 0,
        coinDelta: 0,
        notable: [],
        blocked: 0,
        from: starts.get(w.id)!.toISOString(),
        to: time.toISOString(),
      };
      for (const metric of [
        "events",
        "harvested",
        "sold",
        "breeds",
        "seedsUsed",
        "blocked",
      ] as const)
        run[metric] += summary[metric] - before[metric];
      run.coinDelta += p.coin_balance - coinsBefore;
      run.notable.push(...summary.notable.slice(before.notable.length));
      run.to = time.toISOString();
      runs.set(w.id, run);
      w.last_processed_at = time;
      await c.query(
        "UPDATE workers SET last_processed_at=$3 WHERE id=$1 AND player_id=$2",
        [w.id, p.id, time],
      );
    }
    summary.coinDelta = p.coin_balance - balance;
    for (const w of workers)
      if (w.last_processed_at > starts.get(w.id)!) {
        await c.query(
          "INSERT INTO worker_runs(id,player_id,worker_id,interval_start,interval_end,summary) VALUES($1,$2,$3,$4,$5,$6)",
          [
            randomUUID(),
            p.id,
            w.id,
            starts.get(w.id),
            w.last_processed_at,
            JSON.stringify(runs.get(w.id)),
          ],
        );
      }
    return summary.events ? summary : null;
  }
  async reconcile(owner: string) {
    return this.transaction(owner, (c, p, now) => this.reconcileIn(c, p, now));
  }
  async action(owner: string, input: GameAction) {
    await this.reconcile(owner);
    return this.transaction(owner, async (c, p, now) => {
      const fingerprint = digest(
          JSON.stringify({ action: input.action, data: input.data }),
        ),
        existing = (
          await c.query(
            "SELECT * FROM game_receipts WHERE player_id=$1 AND request_id=$2",
            [owner, input.requestId],
          )
        ).rows[0];
      if (existing) {
        if (existing.body_hash !== fingerprint)
          fail(
            "IDEMPOTENCY_CONFLICT",
            "This request ID belongs to another action.",
          );
        return existing.response;
      }
      if (await this.pending(c, owner, now))
        fail(
          "OFFLINE_PENDING",
          "Process the remaining offline batch before performing a new action.",
        );
      let result: unknown;
      switch (input.action) {
        case "plant": {
          const data = z
            .strictObject({ slotId: z.uuid(), seedType: z.enum(seedTypes) })
            .parse(input.data);
          result = await this.plant(c, p, data.slotId, data.seedType, now);
          break;
        }
        case "harvest": {
          const data = z.strictObject({ slotId: z.uuid() }).parse(input.data);
          result = await this.harvest(c, p, data.slotId, now);
          break;
        }
        case "purchase":
          result = await this.purchase(c, p, input.data, now);
          break;
        case "sell":
          result = await this.sell(
            c,
            p,
            idSchema.parse(input.data).plantId,
            false,
            now,
          );
          break;
        case "flags": {
          const data = idSchema
            .extend({ favorite: z.boolean(), protected: z.boolean() })
            .parse(input.data);
          if (
            !(
              await c.query(
                "UPDATE plants SET is_favorite=$3,is_protected=$4 WHERE id=$1 AND owner_id=$2 AND sold_at IS NULL RETURNING id",
                [data.plantId, owner, data.favorite, data.protected],
              )
            ).rowCount
          )
            throw new ApiError(404, "PLANT_NOT_FOUND", "Plant unavailable.");
          result = { message: "Collection safeguards updated." };
          break;
        }
        case "claim":
          result = await this.claim(c, p, input.data);
          break;
        case "research":
          result = await this.research(c, p, input.data);
          break;
        case "hire":
          result = await this.hire(c, p, input.data, now);
          break;
        case "assign":
          result = await this.assign(c, p, input.data, now);
          break;
      }
      await c.query(
        "INSERT INTO game_receipts(player_id,request_id,operation,body_hash,response) VALUES($1,$2,$3,$4,$5)",
        [
          owner,
          input.requestId,
          input.action,
          fingerprint,
          JSON.stringify(result),
        ],
      );
      return result;
    });
  }
  async cross(
    owner: string,
    input: { parentAId: string; parentBId: string; idempotencyKey: string },
  ) {
    await this.reconcile(owner);
    return this.transaction(owner, async (c, p, now) => {
      const key = input.idempotencyKey,
        hash = digest(JSON.stringify(input)),
        existing = (
          await c.query(
            "SELECT * FROM game_receipts WHERE player_id=$1 AND request_id=$2",
            [owner, key],
          )
        ).rows[0];
      if (existing) {
        if (existing.body_hash !== hash)
          fail("IDEMPOTENCY_CONFLICT", "This key belongs to another cross.");
        return existing.response;
      }
      if (await this.pending(c, owner, now))
        fail("OFFLINE_PENDING", "Process remaining offline work first.");
      const result = await this.crossIn(c, p, input);
      await c.query(
        "INSERT INTO game_receipts(player_id,request_id,operation,body_hash,response) VALUES($1,$2,'cross',$3,$4)",
        [owner, key, hash, JSON.stringify(result)],
      );
      return result;
    });
  }
  async state(identity: Identity): Promise<GameState> {
    return this.transaction(identity.id, async (c, p, now) => {
      const report = await this.reconcileIn(c, p, now),
        houses = (
          await c.query(
            "SELECT * FROM greenhouses WHERE player_id=$1 ORDER BY name",
            [p.id],
          )
        ).rows,
        slots = (
          await c.query(
            "SELECT s.* FROM plant_slots s JOIN greenhouses g ON g.id=s.greenhouse_id WHERE g.player_id=$1 ORDER BY s.slot_no",
            [p.id],
          )
        ).rows,
        seeds = Object.fromEntries(
          (
            await c.query(
              "SELECT seed_type,quantity FROM inventory_seeds WHERE player_id=$1",
              [p.id],
            )
          ).rows.map((r) => [r.seed_type, r.quantity]),
        ),
        workers = (
          await c.query<Worker>(
            "SELECT w.*,g.irrigation FROM workers w LEFT JOIN greenhouses g ON g.id=w.greenhouse_id WHERE w.player_id=$1 ORDER BY w.id",
            [p.id],
          )
        ).rows,
        research = (
          await c.query(
            "SELECT research_id FROM player_research WHERE player_id=$1",
            [p.id],
          )
        ).rows.map((r) => r.research_id);
      return {
        serverNow: now.toISOString(),
        player: {
          id: p.id,
          username: identity.username,
          coins: p.coin_balance,
          xp: p.xp,
          ...levelFor(p.xp),
          csrfToken: identity.csrfToken,
        },
        seeds: { starter: 0, uncommon: 0, rare: 0, ...seeds },
        greenhouses: houses.map((h) => ({
          id: h.id,
          name: h.name,
          slots: h.slots,
          lamp: h.lamp,
          irrigation: h.irrigation,
          nextSlotCost: nextSlotCost(h.slots),
          plants: slots
            .filter((s) => s.greenhouse_id === h.id)
            .map((s) => ({
              id: s.id,
              slotNo: s.slot_no,
              seedType: s.seed_type,
              plantedAt: s.planted_at?.toISOString() ?? null,
              readyAt: s.ready_at?.toISOString() ?? null,
              ready: !!s.ready_at && s.ready_at <= now,
              visualSeed: s.visual_seed,
              phenotype: s.genome
                ? resolvePhenotype("velvetleaf", s.genome)
                : null,
            })),
        })),
        quests: await this.questState(c, p),
        shop: await this.shop(c, p),
        research: RESEARCH.map((r) => ({
          ...r,
          owned: research.includes(r.id),
          disabledReason: research.includes(r.id)
            ? "Completed"
            : levelFor(p.xp).level < r.level
              ? "Unlocks at level " + r.level
              : null,
        })),
        workers: workers.map(
          (w) =>
            ({
              id: w.id,
              kind: w.kind,
              greenhouseId: w.greenhouse_id,
              enabled: w.enabled,
              policy: {
                mode: w.kind === "gardener" ? "repeat_crop" : "repeat_cross",
                seedType: "starter",
                autoSell: false,
                reserveCoins: 100,
                ...(w.policy as Partial<WorkerPolicy>),
              },
              lastProcessedAt: w.last_processed_at.toISOString(),
              intervalSeconds:
                w.kind === "breeder" ? 300 : w.irrigation ? 96 : 120,
            }) satisfies GameWorker,
        ),
        report,
        pendingWork: await this.pending(c, p.id, now),
        recentRuns: (
          await c.query(
            "SELECT id,summary FROM worker_runs WHERE player_id=$1 ORDER BY created_at DESC LIMIT 12",
            [p.id],
          )
        ).rows,
        breedCost: GAME.breedCost,
        workerCosts: GAME.workerCosts,
        seedInfo: Object.entries(SEEDS).map(([id, s]) => ({
          id: id as keyof typeof SEEDS,
          name: s.name,
          seconds: s.seconds,
          description: s.description,
        })),
      };
    });
  }
}
