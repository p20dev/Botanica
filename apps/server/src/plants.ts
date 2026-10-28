import { randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { z } from "zod";
import {
  breed,
  canBreed,
  classifyRarity,
  resolvePhenotype,
  validateGenome,
  type Genome,
  type NamedMutation,
} from "@botanica/genetics";
import type {
  PlantDto,
  BreedingEventDto,
  BreedingResponse,
  CreatePlantRequest,
  BreedingRequest,
  PageDto,
} from "@botanica/shared";
import { DEMO_PLAYER_ID } from "./constants.js";
import { ApiError } from "./errors.js";
export const generateSeed = () => randomBytes(4).readInt32BE();
interface PlantRow extends QueryResultRow {
  id: string;
  name: string;
  owner_id: string;
  species_id: string;
  genome: Genome;
  mutations: NamedMutation[];
  genome_version: number;
  renderer_version: number;
  visual_seed: number;
  generation: number;
  parent_a_id: string | null;
  parent_b_id: string | null;
  created_at: Date;
  cursor_time?: string;
  creation_source: PlantDto["creationSource"];
  rarity_policy_version: 1;
  rarity_score: number;
  rarity_tier: PlantDto["rarity"]["tier"];
  rarity_reasons: PlantDto["rarity"]["reasons"];
}
interface EventRow extends QueryResultRow {
  id: string;
  parent_a_id: string;
  parent_b_id: string;
  child_id: string;
  rng_seed: number;
  engine_version: number;
  mutation_events: BreedingEventDto["mutationEvents"];
  idempotency_key: string;
  created_at: Date;
  cursor_time?: string;
}
function plantDto(row: PlantRow): PlantDto {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    speciesId: row.species_id,
    genome: row.genome,
    mutations: row.mutations,
    phenotype: resolvePhenotype(
      row.species_id,
      row.genome,
      row.mutations,
      row.genome_version,
    ),
    visualSeed: row.visual_seed,
    genomeVersion: row.genome_version,
    rendererVersion: row.renderer_version,
    generation: row.generation,
    parents:
      row.parent_a_id && row.parent_b_id
        ? [row.parent_a_id, row.parent_b_id]
        : [],
    createdAt: row.created_at.toISOString(),
    creationSource: row.creation_source,
    rarity: {
      score: row.rarity_score,
      tier: row.rarity_tier,
      rarityPolicyVersion: row.rarity_policy_version,
      reasons: row.rarity_reasons,
    },
  };
}
const eventDto = (row: EventRow): BreedingEventDto => ({
  id: row.id,
  parentAId: row.parent_a_id,
  parentBId: row.parent_b_id,
  childId: row.child_id,
  rngSeed: row.rng_seed,
  engineVersion: row.engine_version,
  mutationEvents: row.mutation_events,
  idempotencyKey: row.idempotency_key,
  createdAt: row.created_at.toISOString(),
});
const cursorSchema = z.strictObject({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});
export function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  try {
    return cursorSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
    );
  } catch {
    throw new ApiError(400, "INVALID_CURSOR", "The page cursor is invalid.");
  }
}
const cursorFor = (row: {
  id: string;
  created_at: Date;
  cursor_time?: string;
}) =>
  Buffer.from(
    JSON.stringify({
      createdAt: row.cursor_time ?? row.created_at.toISOString(),
      id: row.id,
    }),
  ).toString("base64url");
export async function insertPlant(
  client: PoolClient,
  input: {
    id?: string;
    name: string;
    speciesId: string;
    genome: Genome;
    visualSeed: number;
    mutations?: NamedMutation[];
    generation?: number;
    parents?: [string, string];
    creationSource: PlantDto["creationSource"];
    rarity?: PlantDto["rarity"];
  },
  ownerId = DEMO_PLAYER_ID,
) {
  const mutations = input.mutations ?? [],
    genome = validateGenome(input.speciesId, input.genome),
    phenotype = resolvePhenotype(input.speciesId, genome, mutations),
    rarity = input.rarity ?? classifyRarity(phenotype);
  const result = await client.query<PlantRow>(
    `INSERT INTO plants(id,name,owner_id,species_id,genome_version,genome,mutations,visual_seed,renderer_version,rarity_policy_version,rarity_score,rarity_tier,rarity_reasons,generation,parent_a_id,parent_b_id,creation_source) VALUES($1,$2,$3,$4,1,$5,$6,$7,1,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT(id) DO NOTHING RETURNING *`,
    [
      input.id ?? randomUUID(),
      input.name,
      ownerId,
      input.speciesId,
      JSON.stringify(genome),
      JSON.stringify(mutations),
      input.visualSeed,
      rarity.rarityPolicyVersion,
      rarity.score,
      rarity.tier,
      JSON.stringify(rarity.reasons),
      input.generation ?? 0,
      input.parents?.[0] ?? null,
      input.parents?.[1] ?? null,
      input.creationSource,
    ],
  );
  return result.rows[0] ? plantDto(result.rows[0]) : null;
}
export class PlantRepository {
  constructor(
    private pool: Pool,
    private ownerId = DEMO_PLAYER_ID,
  ) {}
  async getPlant(id: string, client: Pool | PoolClient = this.pool) {
    const result = await client.query<PlantRow>(
      "SELECT * FROM plants WHERE id=$1 AND owner_id=$2",
      [id, this.ownerId],
    );
    if (!result.rows[0])
      throw new ApiError(
        404,
        "PLANT_NOT_FOUND",
        "Plant not found in this sandbox.",
      );
    return plantDto(result.rows[0]);
  }
  async createPlant(input: CreatePlantRequest) {
    const genome = validateGenome(input.speciesId, input.genome),
      client = await this.pool.connect();
    try {
      return (await insertPlant(
        client,
        {
          ...input,
          name: input.name ?? "Velvetleaf",
          genome,
          visualSeed: input.visualSeed ?? generateSeed(),
          creationSource: "designed",
        },
        this.ownerId,
      ))!;
    } finally {
      client.release();
    }
  }
  async listPlants(query: {
    limit: number;
    cursor?: string;
  }): Promise<PageDto<PlantDto>> {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.pool.query<PlantRow>(
      `SELECT *, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time FROM plants WHERE owner_id=$1 AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid)) ORDER BY created_at DESC,id DESC LIMIT $4`,
      [
        this.ownerId,
        cursor?.createdAt ?? null,
        cursor?.id ?? null,
        query.limit + 1,
      ],
    );
    const total = Number(
      (
        await this.pool.query(
          "SELECT count(*) AS count FROM plants WHERE owner_id=$1",
          [this.ownerId],
        )
      ).rows[0].count,
    );
    const hasNext = rows.rows.length > query.limit,
      items = rows.rows.slice(0, query.limit);
    return {
      items: items.map(plantDto),
      nextCursor: hasNext ? cursorFor(items.at(-1)!) : null,
      total,
    };
  }
  async listEvents(query: {
    limit: number;
    cursor?: string;
  }): Promise<PageDto<BreedingEventDto>> {
    const cursor = decodeCursor(query.cursor),
      rows = await this.pool.query<EventRow>(
        `SELECT *, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time FROM breeding_events WHERE owner_id=$1 AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid)) ORDER BY created_at DESC,id DESC LIMIT $4`,
        [
          this.ownerId,
          cursor?.createdAt ?? null,
          cursor?.id ?? null,
          query.limit + 1,
        ],
      ),
      items = rows.rows.slice(0, query.limit);
    const total = Number(
      (
        await this.pool.query(
          "SELECT count(*) AS count FROM breeding_events WHERE owner_id=$1",
          [this.ownerId],
        )
      ).rows[0].count,
    );
    return {
      items: items.map(eventDto),
      nextCursor:
        rows.rows.length > query.limit ? cursorFor(items.at(-1)!) : null,
      total,
    };
  }
  async cross(input: BreedingRequest): Promise<BreedingResponse> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [this.ownerId + ":" + input.idempotencyKey],
      );
      const existing = (
        await client.query<EventRow>(
          "SELECT * FROM breeding_events WHERE idempotency_key=$1 AND owner_id=$2",
          [input.idempotencyKey, this.ownerId],
        )
      ).rows[0];
      if (existing) {
        if (
          existing.parent_a_id !== input.parentAId ||
          existing.parent_b_id !== input.parentBId
        )
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "This request key already belongs to another parent pair.",
          );
        const plant = await this.getPlant(existing.child_id, client);
        await client.query("COMMIT");
        return { plant, event: eventDto(existing) };
      }
      if (input.parentAId === input.parentBId)
        throw new ApiError(
          409,
          "SAME_PARENT",
          "Select two different parent plants.",
        );
      // Read owned rows before interpreting their versioned genomes.
      const rows = (
        await client.query<PlantRow>(
          "SELECT * FROM plants WHERE owner_id=$1 AND id=ANY($2::uuid[]) FOR SHARE",
          [this.ownerId, [input.parentAId, input.parentBId]],
        )
      ).rows;
      const a = rows.find((r) => r.id === input.parentAId),
        b = rows.find((r) => r.id === input.parentBId);
      if (!a || !b)
        throw new ApiError(
          404,
          "PLANT_NOT_FOUND",
          "One or both parents are not in this sandbox.",
        );
      try {
        if (!canBreed(a.species_id, b.species_id).compatible)
          throw new Error("Incompatible");
      } catch {
        throw new ApiError(
          409,
          "INCOMPATIBLE_SPECIES",
          "These species have no approved compatibility or hybrid rule.",
        );
      }
      const result = breed(
        {
          id: a.id,
          speciesId: a.species_id,
          genome: a.genome,
          generation: a.generation,
          genomeVersion: a.genome_version,
        },
        {
          id: b.id,
          speciesId: b.species_id,
          genome: b.genome,
          generation: b.generation,
          genomeVersion: b.genome_version,
        },
        generateSeed(),
      );
      const plant = (await insertPlant(
        client,
        {
          name: "Velvetleaf · generation " + result.generation,
          speciesId: result.speciesId,
          genome: result.genome,
          visualSeed: result.visualSeed,
          mutations: result.mutations,
          parents: result.parents,
          generation: result.generation,
          creationSource: "bred",
          rarity: result.rarity,
        },
        this.ownerId,
      ))!;
      const event = (
        await client.query<EventRow>(
          "INSERT INTO breeding_events(id,owner_id,parent_a_id,parent_b_id,child_id,rng_seed,engine_version,mutation_events,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
          [
            randomUUID(),
            this.ownerId,
            a.id,
            b.id,
            plant.id,
            result.rngSeed,
            result.engineVersion,
            JSON.stringify(result.mutationEvents),
            input.idempotencyKey,
          ],
        )
      ).rows[0];
      await client.query("COMMIT");
      return { plant, event: eventDto(event) };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
