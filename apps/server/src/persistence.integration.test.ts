import { beforeAll, afterAll, describe, it, expect } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { createApp } from "./app.js";
import { migrate } from "./migrations.js";
import { seedDatabase } from "./seed-data.js";
import { DEMO_PLAYER_ID, DEMO_PARENT_A, DEMO_PARENT_B } from "./constants.js";
import { breed, exampleGenome } from "@botanica/genetics";
const databaseUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)(
  "PostgreSQL persistence and transaction acceptance",
  () => {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const app = createApp(() => pool.query("SELECT 1"), false, pool);
    let childId = "";
    beforeAll(async () => {
      await migrate(pool);
      await migrate(pool);
      await seedDatabase(pool);
      await seedDatabase(pool);
    });
    afterAll(async () => {
      await app.close();
      await pool.end();
    });
    it("migrates a clean DB and repeats bootstrap without duplicates", async () => {
      expect(
        Number(
          (await pool.query("SELECT count(*) FROM schema_migrations")).rows[0]
            .count,
        ),
      ).toBe(2);
      expect(
        Number(
          (await pool.query("SELECT count(*) FROM players")).rows[0].count,
        ),
      ).toBe(1);
      expect(
        Number((await pool.query("SELECT count(*) FROM plants")).rows[0].count),
      ).toBe(2);
    });
    it("persists a server-validated designed founder with secure default seed and rejects immutable claims", async () => {
      const payload = {
        name: "Acceptance founder",
        speciesId: "velvetleaf",
        genome: exampleGenome,
      };
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/plants",
        payload,
      });
      expect(response.statusCode).toBe(201);
      const plant = response.json();
      expect(plant.parents).toEqual([]);
      expect(plant.generation).toBe(0);
      expect(plant.creationSource).toBe("designed");
      expect(Number.isInteger(plant.visualSeed)).toBe(true);
      expect((await app.inject("/api/v1/plants/" + plant.id)).json()).toEqual(
        plant,
      );
      for (const bad of [
        { ...payload, mutations: ["golden_veins"] },
        { ...payload, rarityScore: 100 },
        { ...payload, parentAId: DEMO_PARENT_A },
        { ...payload, genome: { ...exampleGenome, pigment: ["X", "G"] } },
      ])
        expect(
          (
            await app.inject({
              method: "POST",
              url: "/api/v1/plants",
              payload: bad,
            })
          ).statusCode,
        ).toBe(400);
    });
    it("paginates tied microsecond timestamps without missing or duplicating plants", async () => {
      const seen = new Set<string>();
      let cursor: string | null = null;
      do {
        const response = await app.inject(
          "/api/v1/plants?limit=1" +
            (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
        );
        expect(response.statusCode).toBe(200);
        const page = response.json();
        expect(page.items).toHaveLength(1);
        expect(seen.has(page.items[0].id)).toBe(false);
        seen.add(page.items[0].id);
        cursor = page.nextCursor;
      } while (cursor);
      expect(seen.size).toBe(3);
      expect(
        (await app.inject("/api/v1/plants?cursor=invalid")).statusCode,
      ).toBe(400);
    });
    it("commits exactly one child and event for concurrent retries and replays stored event seed", async () => {
      const input = {
        parentAId: DEMO_PARENT_A,
        parentBId: DEMO_PARENT_B,
        idempotencyKey: randomUUID(),
      };
      const responses = await Promise.all(
        Array.from({ length: 12 }, () =>
          app.inject({
            method: "POST",
            url: "/api/v1/breeding",
            payload: input,
          }),
        ),
      );
      expect(responses.every((r) => r.statusCode === 200)).toBe(true);
      const result = responses[0].json();
      expect(new Set(responses.map((r) => r.json().plant.id)).size).toBe(1);
      childId = result.plant.id;
      expect(result.plant.parents).toEqual([DEMO_PARENT_A, DEMO_PARENT_B]);
      expect(result.plant.generation).toBe(1);
      expect(result.plant.creationSource).toBe("bred");
      const a = (await app.inject("/api/v1/plants/" + DEMO_PARENT_A)).json(),
        b = (await app.inject("/api/v1/plants/" + DEMO_PARENT_B)).json();
      const expected = breed(
        {
          id: a.id,
          speciesId: a.speciesId,
          genome: a.genome,
          generation: a.generation,
          genomeVersion: a.genomeVersion,
        },
        {
          id: b.id,
          speciesId: b.speciesId,
          genome: b.genome,
          generation: b.generation,
          genomeVersion: b.genomeVersion,
        },
        result.event.rngSeed,
      );
      expect(result.plant.genome).toEqual(expected.genome);
      expect(result.plant.mutations).toEqual(expected.mutations);
      expect(result.plant.rarity).toEqual(expected.rarity);
      expect(result.event.mutationEvents).toEqual(expected.mutationEvents);
      expect(
        Number((await pool.query("SELECT count(*) FROM plants")).rows[0].count),
      ).toBe(4);
      expect(
        Number(
          (await pool.query("SELECT count(*) FROM breeding_events")).rows[0]
            .count,
        ),
      ).toBe(1);
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/breeding",
            payload: { ...input, parentAId: childId },
          })
        ).statusCode,
      ).toBe(409);
      expect((await app.inject("/api/v1/breeding")).json().items).toHaveLength(
        1,
      );
    });
    it("increments max parent generation and preserves persisted mutations/rarity across reads", async () => {
      const result = (
        await app.inject({
          method: "POST",
          url: "/api/v1/breeding",
          payload: {
            parentAId: childId,
            parentBId: DEMO_PARENT_A,
            idempotencyKey: randomUUID(),
          },
        })
      ).json();
      expect(result.plant.generation).toBe(2);
      const first = await app.inject("/api/v1/plants/" + result.plant.id);
      expect((await app.inject("/api/v1/plants/" + result.plant.id)).body).toBe(
        first.body,
      );
    });
    it("rejects unknown cross-species records and foreign-owned parents without creating a child", async () => {
      const alien = randomUUID(),
        foreign = randomUUID(),
        owner = randomUUID();
      await pool.query(
        "INSERT INTO species VALUES('alien','Alien','alien',1,'{}')",
      );
      await pool.query("INSERT INTO players(id,display_name) VALUES($1,$2)", [
        owner,
        "Other owner",
      ]);
      await pool.query(
        "INSERT INTO plants(id,owner_id,species_id,genome_version,genome,mutations,visual_seed,renderer_version,rarity_policy_version,rarity_score,rarity_tier,generation) SELECT $1,owner_id,$2,genome_version,genome,mutations,visual_seed,renderer_version,rarity_policy_version,rarity_score,rarity_tier,generation FROM plants WHERE id=$3",
        [alien, "alien", DEMO_PARENT_A],
      );
      await pool.query(
        "INSERT INTO plants(id,owner_id,species_id,genome_version,genome,mutations,visual_seed,renderer_version,rarity_policy_version,rarity_score,rarity_tier,generation) SELECT $1,$2,species_id,genome_version,genome,mutations,visual_seed,renderer_version,rarity_policy_version,rarity_score,rarity_tier,generation FROM plants WHERE id=$3",
        [foreign, owner, DEMO_PARENT_A],
      );
      const before = Number(
        (await pool.query("SELECT count(*) FROM plants")).rows[0].count,
      );
      for (const [id, status] of [
        [alien, 409],
        [foreign, 404],
      ] as const) {
        const response = await app.inject({
          method: "POST",
          url: "/api/v1/breeding",
          payload: {
            parentAId: DEMO_PARENT_A,
            parentBId: id,
            idempotencyKey: randomUUID(),
          },
        });
        expect(response.statusCode).toBe(status);
        if (status === 409)
          expect(response.json().error.code).toBe("INCOMPATIBLE_SPECIES");
      }
      expect(
        Number((await pool.query("SELECT count(*) FROM plants")).rows[0].count),
      ).toBe(before);
    });
    it("rolls back the child when event insertion fails and returns a safe error", async () => {
      await pool.query(
        "CREATE FUNCTION reject_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private database detail'; END $$",
      );
      await pool.query(
        "CREATE TRIGGER reject_event BEFORE INSERT ON breeding_events FOR EACH ROW EXECUTE FUNCTION reject_event()",
      );
      const before = Number(
        (await pool.query("SELECT count(*) FROM plants")).rows[0].count,
      );
      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/v1/breeding",
          payload: {
            parentAId: DEMO_PARENT_A,
            parentBId: DEMO_PARENT_B,
            idempotencyKey: randomUUID(),
          },
        });
        expect(response.statusCode).toBe(500);
        expect(response.body).not.toContain("private");
        expect(response.body).not.toContain("postgres");
        expect(
          Number(
            (await pool.query("SELECT count(*) FROM plants")).rows[0].count,
          ),
        ).toBe(before);
      } finally {
        await pool.query("DROP TRIGGER reject_event ON breeding_events");
        await pool.query("DROP FUNCTION reject_event()");
      }
    });
  },
);
