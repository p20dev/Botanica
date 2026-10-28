import { velvetleaf } from "@botanica/genetics";
import { connectDatabase } from "./db.js";
import { players, species } from "./schema.js";
const { pool, db } = connectDatabase(process.env.DATABASE_URL ?? "");
try {
  await db.transaction(async (tx) => {
    await tx
      .insert(players)
      .values({
        id: "00000000-0000-4000-8000-000000000001",
        displayName: "Sandbox botanist",
      })
      .onConflictDoNothing();
    await tx
      .insert(species)
      .values({
        id: "velvetleaf",
        name: "Velvetleaf",
        compatibilityGroup: "velvetleaf",
        catalogVersion: 1,
        config: velvetleaf,
      })
      .onConflictDoUpdate({
        target: species.id,
        set: { config: velvetleaf, catalogVersion: 1 },
      });
  });
  console.log("Sandbox player and velvetleaf catalog ready");
} finally {
  await pool.end();
}
