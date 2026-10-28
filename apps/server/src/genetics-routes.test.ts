import { it, expect } from "vitest";
import { createApp } from "./app.js";
import { exampleGenome } from "@botanica/genetics";
it("exposes versioned catalogs and rejects untrusted alleles and claims", async () => {
  const app = createApp(async () => {});
  try {
    const catalog = await app.inject("/api/v1/catalog/species");
    expect(catalog.statusCode).toBe(200);
    expect(catalog.json().species[0].id).toBe("velvetleaf");
    const payload = { speciesId: "velvetleaf", genome: exampleGenome };
    const valid = await app.inject({
      method: "POST",
      url: "/api/v1/phenotype/resolve",
      payload,
    });
    expect(valid.statusCode).toBe(200);
    expect(valid.json().phenotype.pigment).toBe("purple");
    for (const invalid of [
      { ...payload, genome: { ...exampleGenome, pigment: ["<script>", "G"] } },
      { ...payload, rarityScore: 100 },
      { ...payload, speciesId: "other" },
      { ...payload, genome: {} },
    ]) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/phenotype/resolve",
        payload: invalid,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBeDefined();
    }
  } finally {
    await app.close();
  }
});
