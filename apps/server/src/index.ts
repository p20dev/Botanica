import { readConfig } from "./config.js";
import { connectDatabase } from "./db.js";
import { createApp } from "./app.js";
const config = readConfig(process.env);
const { pool } = connectDatabase(config.DATABASE_URL);
const app = createApp(() => pool.query("SELECT 1"), true, pool);
app.addHook("onClose", async () => {
  await pool.end();
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    void app.close();
  });
await app.listen({ port: config.PORT, host: "0.0.0.0" });
