import { beforeAll, afterAll, describe, it, expect } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { createApp } from "./app.js";
import { migrate } from "./migrations.js";
import { seedDatabase } from "./seed-data.js";
import { GameService } from "./game-service.js";
import { digest, type Identity } from "./auth.js";
import type { GameAction, GameState } from "@botanica/shared";
import { saleValue } from "./game-config.js";
import { DEMO_PLAYER_ID } from "./constants.js";

// Separate schema on the disposable Compose test database, never the application database.
const url = process.env.TEST_DATABASE_URL,
  schema = "game_" + randomUUID().replaceAll("-", "");
describe.skipIf(!url)(
  "Game ownership, monetary integrity and offline acceptance",
  () => {
    const pool = new pg.Pool({
      connectionString: url,
      options: "-c search_path=" + schema,
    });
    const app = createApp(() => pool.query("SELECT 1"), false, pool);
    let now = new Date("2026-01-01T00:00:00Z");
    const game = new GameService(pool, () => now);
    const advance = (seconds: number) => {
      now = new Date(now.getTime() + seconds * 1000);
    };
    type Account = {
      identity: Identity;
      cookie: string;
      csrf: string;
      codes: string[];
      username: string;
    };
    async function account(): Promise<Account> {
      const username = "test_" + randomUUID().slice(0, 8),
        r = await app.inject({
          method: "POST",
          url: "/api/v1/auth/register",
          headers: { origin: "http://localhost:8155" },
          payload: { username, password: "fixture-password-123" },
        });
      expect(r.statusCode, r.body).toBe(201);
      const cookie = String(r.headers["set-cookie"]).split(";")[0],
        csrf = r.json().csrfToken,
        me = await app.inject({ url: "/api/v1/me", headers: { cookie } });
      expect(me.statusCode).toBe(200);
      return {
        identity: me.json(),
        cookie,
        csrf,
        codes: r.json().recoveryCodes,
        username,
      };
    }
    const act = (
      a: Account,
      action: GameAction["action"],
      data: Record<string, unknown>,
      requestId = randomUUID(),
    ) => game.action(a.identity.id, { action, data, requestId });
    const httpAction = (
      a: Account,
      action: GameAction["action"],
      data: Record<string, unknown>,
    ) =>
      app.inject({
        method: "POST",
        url: "/api/v1/game/action",
        headers: {
          cookie: a.cookie,
          origin: "http://localhost:8155",
          "x-csrf-token": a.csrf,
        },
        payload: { action, data, requestId: randomUUID() },
      });
    async function state(a: Account) {
      return game.state(a.identity);
    }
    async function grow(a: Account, count = 1) {
      const s = await state(a),
        slots = s.greenhouses[0].plants.slice(0, count);
      for (const slot of slots)
        await act(a, "plant", { slotId: slot.id, seedType: "starter" });
      advance(121);
      const result = [];
      for (const slot of slots)
        result.push(await act(a, "harvest", { slotId: slot.id }));
      return result as { plantId: string }[];
    }
    beforeAll(async () => {
      const admin = new pg.Pool({ connectionString: url });
      try {
        await admin.query("CREATE SCHEMA " + schema);
      } finally {
        await admin.end();
      }
      await migrate(pool);
      await seedDatabase(pool);
    });
    afterAll(async () => {
      await app.close();
      await pool.end();
    });
    it("authenticates with hashed credentials, CSRF and one-use recovery; bootstraps isolated accounts", async () => {
      const a = await account(),
        b = await account(),
        s = await state(a);
      expect(s.player.coins).toBe(120);
      expect(s.seeds.starter).toBe(3);
      expect(s.greenhouses[0].plants).toHaveLength(4);
      expect((await app.inject("/api/v1/plants")).statusCode).toBe(401);
      expect((await app.inject("/health")).statusCode).toBe(200);
      const row = (
        await pool.query("SELECT password_hash FROM players WHERE id=$1", [
          a.identity.id,
        ])
      ).rows[0];
      expect(row.password_hash).toMatch(/^\$argon2id\$/);
      expect(
        (
          await pool.query(
            "SELECT token_hash FROM sessions WHERE player_id=$1",
            [a.identity.id],
          )
        ).rows[0].token_hash,
      ).toBe(digest(a.cookie.split("=")[1]));
      expect(
        (
          await pool.query(
            "SELECT code_hash FROM recovery_codes WHERE player_id=$1",
            [a.identity.id],
          )
        ).rows.map((r) => r.code_hash),
      ).not.toContain(a.codes[0]);
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/game/action",
            headers: { cookie: a.cookie, origin: "http://localhost:8155" },
            payload: {
              action: "purchase",
              requestId: randomUUID(),
              data: { itemId: "seed_starter" },
            },
          })
        ).statusCode,
      ).toBe(403);
      const [plant] = await grow(a);
      for (const path of [
        "/plants/" + plant.plantId,
        "/plants/" + plant.plantId + "/birth",
      ])
        expect(
          (
            await app.inject({
              url: "/api/v1" + path,
              headers: { cookie: b.cookie },
            })
          ).statusCode,
        ).toBe(404);
      expect(
        (await httpAction(b, "sell", { plantId: plant.plantId })).statusCode,
      ).toBe(409);
      expect(
        (
          await httpAction(b, "flags", {
            plantId: plant.plantId,
            favorite: true,
            protected: true,
          })
        ).statusCode,
      ).toBe(404);
      expect(
        (
          await httpAction(b, "plant", {
            slotId: s.greenhouses[0].plants[0].id,
            seedType: "starter",
          })
        ).statusCode,
      ).toBe(404);
      expect(
        (
          await app.inject({
            url: "/api/v1/plants",
            headers: { cookie: b.cookie },
          })
        ).json().total,
      ).toBe(0);
      expect(
        Number(
          (
            await pool.query("SELECT count(*) FROM plants WHERE owner_id=$1", [
              DEMO_PLAYER_ID,
            ])
          ).rows[0].count,
        ),
      ).toBe(100);
      const recover = {
          username: a.username,
          password: "replacement-password-123",
          recoveryCode: a.codes[0],
        },
        headers = { origin: "http://localhost:8155" };
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/auth/recover",
            headers,
            payload: recover,
          })
        ).statusCode,
      ).toBe(200);
      expect(
        (await app.inject({ url: "/api/v1/me", headers: { cookie: a.cookie } }))
          .statusCode,
      ).toBe(401);
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/auth/recover",
            headers,
            payload: recover,
          })
        ).statusCode,
      ).toBe(401);
    }, 20000);
    it("serializes competing purchases, rejects overspending and replays each receipt without a second debit", async () => {
      const a = await account();
      await pool.query("UPDATE players SET coin_balance=10 WHERE id=$1", [
        a.identity.id,
      ]);
      const results = await Promise.allSettled([
        act(a, "purchase", { itemId: "seed_starter" }),
        act(a, "purchase", { itemId: "seed_starter" }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect((await state(a)).player.coins).toBe(0);
      expect((await state(a)).seeds.starter).toBe(4);
      await pool.query("UPDATE players SET coin_balance=20 WHERE id=$1", [
        a.identity.id,
      ]);
      const key = randomUUID(),
        input = { itemId: "seed_starter" };
      const retried = await Promise.all([
        act(a, "purchase", input, key),
        act(a, "purchase", input, key),
      ]);
      expect(retried[0]).toEqual(retried[1]);
      expect((await state(a)).player.coins).toBe(10);
      expect((await state(a)).seeds.starter).toBe(5);
      await expect(
        act(a, "purchase", { itemId: "seed_uncommon" }, key),
      ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    });
    it("harvests and sells once under concurrent requests, recycles seeds and protects favorites", async () => {
      const a = await account(),
        slot = (await state(a)).greenhouses[0].plants[0];
      await act(a, "plant", { slotId: slot.id, seedType: "starter" });
      await expect(
        act(a, "harvest", { slotId: slot.id }),
      ).rejects.toMatchObject({ code: "NOT_READY" });
      advance(21);
      const results = await Promise.allSettled([
        act(a, "harvest", { slotId: slot.id }),
        act(a, "harvest", { slotId: slot.id }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const harvested = results.find(
        (r) => r.status === "fulfilled",
      ) as PromiseFulfilledResult<{ plantId: string }>;
      expect((await state(a)).seeds.starter).toBe(3);
      expect((await state(a)).player.coins).toBe(130); // only first-discovery reward, no harvest sale payout
      const plantId = harvested.value.plantId;
      await act(a, "flags", { plantId, favorite: true, protected: true });
      await expect(act(a, "sell", { plantId })).rejects.toMatchObject({
        code: "PROTECTED_PLANT",
      });
      await act(a, "flags", { plantId, favorite: false, protected: false });
      const sales = await Promise.allSettled([
        act(a, "sell", { plantId }),
        act(a, "sell", { plantId }),
      ]);
      expect(sales.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const plant = (
        await pool.query("SELECT * FROM plants WHERE id=$1", [plantId])
      ).rows[0];
      expect(plant.sold_at).toBeTruthy();
      expect((await state(a)).player.coins).toBe(
        130 + saleValue(plant.rarity_tier, plant.rarity_score)!,
      );
      expect(
        (
          await pool.query(
            "SELECT count(*) FROM coin_ledger WHERE player_id=$1 AND reason='sale'",
            [a.identity.id],
          )
        ).rows[0].count,
      ).toBe("1");
    });
    it("charges a real inherited cross once, preserves lineage and rejects foreign or designed parents", async () => {
      const a = await account(),
        b = await account(),
        [left, right] = await grow(a, 2),
        [foreign] = await grow(b);
      await pool.query("UPDATE players SET xp=160 WHERE id=$1", [
        a.identity.id,
      ]);
      const input = {
          parentAId: left.plantId,
          parentBId: right.plantId,
          idempotencyKey: randomUUID(),
        },
        before = (await state(a)).player.coins;
      const [first, retry] = (await Promise.all([
        game.cross(a.identity.id, input),
        game.cross(a.identity.id, input),
      ])) as [
        { plant: { id: string; parents: string[]; gameEligible: boolean } },
        unknown,
      ];
      expect(first).toEqual(retry);
      expect(first.plant.parents).toEqual([left.plantId, right.plantId]);
      expect(first.plant.gameEligible).toBe(true);
      expect(
        (
          await pool.query(
            "SELECT amount FROM coin_ledger WHERE player_id=$1 AND reason='breeding'",
            [a.identity.id],
          )
        ).rows,
      ).toEqual([{ amount: -75 }]);
      expect((await state(a)).player.coins).toBeGreaterThanOrEqual(before - 75);
      await expect(
        game.cross(a.identity.id, {
          ...input,
          parentBId: foreign.plantId,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "PARENT_UNAVAILABLE" });
      const designed = await app.inject({
        method: "POST",
        url: "/api/v1/plants",
        headers: {
          cookie: a.cookie,
          origin: "http://localhost:8155",
          "x-csrf-token": a.csrf,
        },
        payload: {
          name: "Study",
          speciesId: "velvetleaf",
          genome: (
            await pool.query("SELECT genome FROM plants WHERE id=$1", [
              left.plantId,
            ])
          ).rows[0].genome,
        },
      });
      expect(designed.statusCode).toBe(201);
      await expect(
        game.cross(a.identity.id, {
          ...input,
          parentBId: designed.json().id,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "PARENT_UNAVAILABLE" });
      await expect(
        act(a, "sell", { plantId: designed.json().id }),
      ).rejects.toMatchObject({ code: "STUDY_ONLY" });
    });
    it("reconciles a finite hour for gardeners and breeders once; protects keepsakes and retains capped backlog", async () => {
      const a = await account(),
        b = await account(),
        parents = await grow(a, 2); // controlled test fixtures unlock late game without waiting through the whole progression
      await pool.query(
        "UPDATE players SET xp=3000,coin_balance=10000 WHERE id=$1",
        [a.identity.id],
      );
      await act(a, "flags", {
        plantId: parents[0].plantId,
        favorite: true,
        protected: true,
      });
      await act(a, "hire", { kind: "gardener" });
      await act(a, "hire", { kind: "breeder" });
      let s = await state(a);
      expect(s.workers.every((w) => !w.enabled)).toBe(true);
      const gardener = s.workers.find((w) => w.kind === "gardener")!,
        breeder = s.workers.find((w) => w.kind === "breeder")!,
        house = s.greenhouses[0].id;
      const policy = {
        mode: "repeat_crop",
        seedType: "starter",
        autoSell: true,
        reserveCoins: 100,
      };
      await act(a, "assign", {
        workerId: gardener.id,
        greenhouseId: house,
        enabled: true,
        policy,
      });
      await act(a, "assign", {
        workerId: breeder.id,
        greenhouseId: house,
        enabled: true,
        policy: {
          ...policy,
          mode: "repeat_cross",
          autoSell: false,
          parentAId: parents[0].plantId,
          parentBId: parents[1].plantId,
        },
      });
      expect(
        (
          await httpAction(b, "assign", {
            workerId: gardener.id,
            greenhouseId: house,
            enabled: true,
            policy,
          })
        ).statusCode,
      ).toBe(404);
      advance(3600);
      const summaries = await Promise.all([
        game.reconcile(a.identity.id),
        game.reconcile(a.identity.id),
      ]);
      expect(summaries.filter(Boolean)).toHaveLength(1);
      const report = summaries.find(Boolean)!;
      expect(report.events).toBe(42);
      expect(report.harvested).toBeGreaterThan(0);
      expect(report.breeds).toBe(12);
      expect(report.seedsUsed).toBeGreaterThanOrEqual(report.harvested);
      s = await state(a);
      expect(s.report).toBeNull();
      expect(s.player.coins).toBeGreaterThanOrEqual(0);
      const keepsake = (
        await pool.query("SELECT sold_at FROM plants WHERE id=$1", [
          parents[0].plantId,
        ])
      ).rows[0];
      expect(keepsake.sold_at).toBeNull();
      expect(
        (
          await pool.query(
            "SELECT count(*) FROM plants WHERE owner_id=$1 AND sold_at IS NOT NULL AND (is_favorite OR is_protected OR first_discovery OR rarity_tier!='Common')",
            [a.identity.id],
          )
        ).rows[0].count,
      ).toBe("0");
      expect(s.recentRuns.reduce((n, r) => n + r.summary.events, 0)).toBe(42);
      expect(s.recentRuns.reduce((n, r) => n + r.summary.coinDelta, 0)).toBe(
        report.coinDelta,
      );
      advance(48 * 3600);
      const capped = await game.reconcile(a.identity.id);
      expect(capped!.events).toBe(100);
      expect((await game.state(a.identity)).pendingWork).toBe(true);
    });
  },
);
