import { connectDatabase } from "./db.js";
import { migrate } from "./migrations.js";
const { pool } = connectDatabase(process.env.DATABASE_URL ?? "");
try {
  await migrate(pool);
  console.log("Migrations current");
} finally {
  await pool.end();
}
