import { connectDatabase } from "./db.js";
import { seedDatabase } from "./seed-data.js";
const { pool } = connectDatabase(process.env.DATABASE_URL ?? "");
try {
  await seedDatabase(pool);
  console.log("Sandbox catalog and demo parents ready");
} finally {
  await pool.end();
}
