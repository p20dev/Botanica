import { readFile } from "node:fs/promises";
import { connectDatabase } from "./db.js";
const { pool } = connectDatabase(process.env.DATABASE_URL ?? "");
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(8155000)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const name = "0001_initial";
  const exists = await client.query(
    "SELECT name FROM schema_migrations WHERE name = $1",
    [name],
  );
  if (!exists.rowCount) {
    await client.query(
      await readFile(
        new URL("../migrations/0001_initial.sql", import.meta.url),
        "utf8",
      ),
    );
    await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [
      name,
    ]);
  }
  await client.query("COMMIT");
  console.log("Migrations current");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
