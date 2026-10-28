import {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { hash, verify, Algorithm } from "@node-rs/argon2";
import type { Pool } from "pg";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { ApiError } from "./errors.js";
import { GAME, levelFor } from "./game-config.js";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
declare module "fastify" {
  interface FastifyRequest {
    identity?: Identity;
  }
}
export interface Identity {
  id: string;
  username: string;
  csrfToken: string;
}
const credentials = z.strictObject({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,24}$/, "Use 3–24 letters, numbers or underscores."),
  password: z.string().min(10).max(128),
});
export function allowedOrigin(request: FastifyRequest) {
  const origin = request.headers.origin;
  if (!origin) return false;
  const defaults = [
    "http://localhost:8155",
    "http://127.0.0.1:8155",
    "http://192.168.1.197:8155",
    "https://botanica.p20.dev",
  ];
  return (
    process.env.PUBLIC_ORIGINS?.split(",").map((s) => s.trim()) ?? defaults
  ).includes(origin);
}
function cookie(
  reply: FastifyReply,
  request: FastifyRequest,
  value: string,
  maxAge = 2592000,
) {
  const secure =
    request.headers.origin?.startsWith("https://") ||
    request.headers["x-forwarded-proto"] === "https";
  reply.header(
    "set-cookie",
    `botanica_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`,
  );
}
export function registerAuth(app: FastifyInstance, pool: Pool) {
  const attempts = new Map<string, { count: number; until: number }>();
  function throttle(key: string, limit: number) {
    const now = Date.now(),
      previous = attempts.get(key);
    if (previous && previous.until > now) {
      if (++previous.count <= limit) return;
    } else {
      if (attempts.size >= 4096)
        for (const [id, entry] of attempts)
          if (entry.until <= now) attempts.delete(id);
      if (attempts.size < 4096) {
        attempts.set(key, { count: 1, until: now + 900000 });
        return;
      }
    }
    throw new ApiError(
      429,
      "AUTH_THROTTLED",
      "Too many attempts. Try again in 15 minutes.",
    );
  }
  app.addHook("preHandler", async (request) => {
    if (request.url.startsWith("/api/v1/auth/") && request.method === "POST") {
      if (!allowedOrigin(request))
        throw new ApiError(
          403,
          "ORIGIN_REJECTED",
          "Use this application’s own origin.",
        );
      const username =
        typeof request.body === "object" &&
        request.body !== null &&
        "username" in request.body &&
        typeof request.body.username === "string"
          ? request.body.username.toLowerCase().slice(0, 24)
          : "";
      throttle("ip:" + request.ip, 100);
      throttle(request.ip + ":" + username, 20);
    }
  });
  async function startSession(
    id: string,
    reply: FastifyReply,
    request: FastifyRequest,
  ) {
    const token = randomBytes(32).toString("hex");
    await pool.query(
      "INSERT INTO sessions(token_hash,player_id,expires_at) VALUES($1,$2,now()+interval '30 days')",
      [digest(token), id],
    );
    cookie(reply, request, token);
    return { csrfToken: digest("csrf:" + token) };
  }
  app.post("/api/v1/auth/register", async (request, reply) => {
    const input = credentials.parse(request.body),
      passwordHash = await hash(input.password, {
        algorithm: Algorithm.Argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }),
      id = randomUUID(),
      client = await pool.connect(),
      codes = Array.from({ length: 5 }, () => randomBytes(12).toString("hex"));
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        "INSERT INTO players(id,display_name,normalized_username,password_hash,coin_balance) VALUES($1,$2,$3,$4,$5) ON CONFLICT(normalized_username) DO NOTHING RETURNING id",
        [
          id,
          input.username,
          input.username.toLowerCase(),
          passwordHash,
          GAME.starterCoins,
        ],
      );
      if (!inserted.rowCount)
        throw new ApiError(
          409,
          "USERNAME_TAKEN",
          "That username is already in use.",
        );
      await client.query(
        "INSERT INTO inventory_seeds VALUES($1,'starter',$2)",
        [id, GAME.starterSeeds],
      );
      const house = randomUUID();
      await client.query(
        "INSERT INTO greenhouses(id,player_id,name) VALUES($1,$2,$3)",
        [house, id, "Little Glasshouse"],
      );
      for (let i = 0; i < 4; i++)
        await client.query(
          "INSERT INTO plant_slots(id,greenhouse_id,slot_no) VALUES($1,$2,$3)",
          [randomUUID(), house, i],
        );
      for (const code of codes)
        await client.query(
          "INSERT INTO recovery_codes(player_id,code_hash) VALUES($1,$2)",
          [id, digest(code)],
        );
      await client.query(
        "INSERT INTO coin_ledger(id,player_id,amount,balance_after,reason,reference) VALUES($1,$2::uuid,$3,$3,'welcome',$2::uuid::text)",
        [randomUUID(), id, GAME.starterCoins],
      );
      await client.query("COMMIT");
      return reply.code(201).send({
        ...(await startSession(id, reply, request)),
        recoveryCodes: codes,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
  app.post("/api/v1/auth/login", async (request, reply) => {
    const input = credentials.parse(request.body),
      row = (
        await pool.query(
          "SELECT id,password_hash FROM players WHERE normalized_username=$1",
          [input.username.toLowerCase()],
        )
      ).rows[0];
    if (!row || !(await verify(row.password_hash, input.password)))
      throw new ApiError(
        401,
        "INVALID_LOGIN",
        "Username or password is incorrect.",
      );
    return startSession(row.id, reply, request);
  });
  app.post("/api/v1/auth/recover", async (request, reply) => {
    const input = credentials
        .extend({ recoveryCode: z.string().regex(/^[a-f0-9]{24}$/) })
        .parse(request.body),
      passwordHash = await hash(input.password, {
        algorithm: Algorithm.Argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }),
      client = await pool.connect();
    try {
      await client.query("BEGIN");
      const row = (
        await client.query(
          "UPDATE recovery_codes c SET used_at=now() FROM players p WHERE c.player_id=p.id AND p.normalized_username=$1 AND c.code_hash=$2 AND c.used_at IS NULL RETURNING p.id",
          [input.username.toLowerCase(), digest(input.recoveryCode)],
        )
      ).rows[0];
      if (!row)
        throw new ApiError(
          401,
          "INVALID_RECOVERY",
          "Username or recovery code is incorrect or already used.",
        );
      await client.query("UPDATE players SET password_hash=$2 WHERE id=$1", [
        row.id,
        passwordHash,
      ]);
      await client.query("DELETE FROM sessions WHERE player_id=$1", [row.id]);
      await client.query("COMMIT");
      return startSession(row.id, reply, request);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
  app.post("/api/v1/auth/logout", async (request, reply) => {
    const identity = await authenticate(pool, request);
    checkCsrf(request, identity);
    await pool.query("DELETE FROM sessions WHERE token_hash=$1", [
      digest(sessionToken(request)),
    ]);
    cookie(reply, request, "", 0);
    return { ok: true };
  });
  app.get("/api/v1/me", async (request) => {
    const identity = await authenticate(pool, request),
      row = (
        await pool.query("SELECT coin_balance,xp FROM players WHERE id=$1", [
          identity.id,
        ])
      ).rows[0];
    return {
      ...identity,
      coins: row.coin_balance,
      xp: row.xp,
      ...levelFor(row.xp),
    };
  });
}
function sessionToken(request: FastifyRequest) {
  return (
    request.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("botanica_session="))
      ?.slice(17) ?? ""
  );
}
export async function authenticate(
  pool: Pool,
  request: FastifyRequest,
): Promise<Identity> {
  const token = sessionToken(request);
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new ApiError(401, "AUTH_REQUIRED", "Sign in to your greenhouse.");
  const row = (
    await pool.query(
      "SELECT p.id,p.display_name FROM sessions s JOIN players p ON p.id=s.player_id WHERE s.token_hash=$1 AND s.expires_at>now()",
      [digest(token)],
    )
  ).rows[0];
  if (!row)
    throw new ApiError(
      401,
      "AUTH_REQUIRED",
      "Your session expired. Please sign in.",
    );
  return {
    id: row.id,
    username: row.display_name,
    csrfToken: digest("csrf:" + token),
  };
}
export function checkCsrf(request: FastifyRequest, identity: Identity) {
  const token = request.headers["x-csrf-token"];
  if (
    !allowedOrigin(request) ||
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(identity.csrfToken))
  )
    throw new ApiError(
      403,
      "CSRF_REJECTED",
      "Refresh the page before trying this action again.",
    );
}
