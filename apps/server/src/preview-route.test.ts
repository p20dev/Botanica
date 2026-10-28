import { it, expect } from "vitest";
import { exampleGenome, resolvePhenotype } from "@botanica/genetics";
import { layoutPlant, renderSvg } from "@botanica/renderer";
import { createApp } from "./app.js";
it("returns the same safe serialized SVG as the client renderer and rejects invalid preview inputs", async () => {
  const app = createApp(async () => {});
  try {
    const payload = {
      speciesId: "velvetleaf",
      genome: exampleGenome,
      visualSeed: 91,
      growthStage: "flowering",
      background: "warm",
    };
    const result = await app.inject({
      method: "POST",
      url: "/api/v1/preview",
      payload,
    });
    expect(result.statusCode).toBe(200);
    expect(result.json().svg).toBe(
      renderSvg(
        layoutPlant(
          "velvetleaf",
          resolvePhenotype("velvetleaf", exampleGenome),
          91,
          "flowering",
        ),
        { namespace: "preview", background: "warm" },
      ),
    );
    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/preview",
      payload: { ...payload, visualSeed: "<script>" },
    });
    expect(bad.statusCode).toBe(400);
  } finally {
    await app.close();
  }
});
