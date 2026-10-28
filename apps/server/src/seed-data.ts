import { demoSpecimen } from "./demo-plants.js";
import { velvetleaf, exampleGenome } from "@botanica/genetics";
import type { Pool } from "pg";
import { insertPlant } from "./plants.js";
import { DEMO_PLAYER_ID, DEMO_PARENT_A, DEMO_PARENT_B } from "./constants.js";
export async function seedDatabase(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO players(id,display_name) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [DEMO_PLAYER_ID, "Sandbox botanist"],
    );
    await client.query(
      "INSERT INTO species(id,name,compatibility_group,catalog_version,config_jsonb) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET config_jsonb=excluded.config_jsonb,catalog_version=excluded.catalog_version",
      [
        velvetleaf.id,
        velvetleaf.name,
        velvetleaf.compatibilityGroup,
        1,
        JSON.stringify(velvetleaf),
      ],
    );
    await insertPlant(client, {
      id: DEMO_PARENT_A,
      name: "Moss · demo parent",
      speciesId: "velvetleaf",
      genome: {
        ...exampleGenome,
        pigment: ["G", "G"],
        leafPattern: ["S", "S"],
      },
      visualSeed: 8155,
      creationSource: "demo",
    });
    await insertPlant(client, {
      id: DEMO_PARENT_B,
      name: "Plum · demo parent",
      speciesId: "velvetleaf",
      genome: exampleGenome,
      visualSeed: 1440,
      creationSource: "demo",
    });
    for (let index = 0; index < 98; index++)
      await insertPlant(client, demoSpecimen(index));
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
