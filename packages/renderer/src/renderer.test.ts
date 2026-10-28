import { describe, it, expect } from "vitest";
import {
  exampleGenome,
  resolvePhenotype,
  type Phenotype,
} from "@botanica/genetics";
import {
  layoutPlant,
  renderSvg,
  stages,
  primitives,
  type PlantScene,
} from "./index.js";
const phenotype = resolvePhenotype("velvetleaf", exampleGenome);
describe("renderer v1", () => {
  it("replays geometry and SVG exactly while visual seeds only affect cosmetics", () => {
    const scene = layoutPlant("velvetleaf", phenotype, 12, "flowering");
    expect(layoutPlant("velvetleaf", phenotype, 12, "flowering")).toEqual(
      scene,
    );
    expect(renderSvg(scene)).toBe(
      renderSvg(layoutPlant("velvetleaf", phenotype, 12, "flowering")),
    );
    const other = layoutPlant("velvetleaf", phenotype, 13, "flowering");
    expect(other.phenotype).toEqual(scene.phenotype);
    expect(other.nodes).not.toEqual(scene.nodes);
    expect(renderSvg(scene, { namespace: "a" })).toContain('id="a-');
    expect(renderSvg(scene, { namespace: "b" })).not.toContain('id="a-');
  });
  it("keeps all leaves, pots and flowers inside the viewBox over varied shapes, habits, stages and seeds", () => {
    for (const shape of ["oval", "lobed", "pointed"] as const)
      for (const habit of ["compact", "bushy", "trailing"] as const)
        for (const stage of stages)
          for (let seed = 0; seed < 100; seed++) {
            const scene = layoutPlant(
              "velvetleaf",
              { ...phenotype, leafShape: shape, growthHabit: habit },
              seed,
              stage,
            );
            for (const node of scene.nodes) {
              const asset = primitives[node.assetId];
              if (!["leaf", "bloom"].includes(asset.category)) continue;
              const [bx, by, w, h] = asset.bounds,
                [ax, ay] = asset.anchor;
              for (const [x, y] of [
                [bx, by],
                [bx + w, by],
                [bx, by + h],
                [bx + w, by + h],
              ]) {
                const radians = (node.rotation * Math.PI) / 180,
                  dx = (x - ax) * node.scale,
                  dy = (y - ay) * node.scale;
                const px =
                    node.x + dx * Math.cos(radians) - dy * Math.sin(radians),
                  py = node.y + dx * Math.sin(radians) + dy * Math.cos(radians);
                expect(px).toBeGreaterThan(10);
                expect(px).toBeLessThan(502);
                expect(py).toBeGreaterThan(10);
                expect(py).toBeLessThan(502);
              }
            }
          }
  });
  it("shows blooms only when flowering and respects density and stage counts", () => {
    for (const stage of stages) {
      const scene = layoutPlant("velvetleaf", phenotype, 1, stage);
      expect(
        scene.nodes.filter((n) => n.assetId.startsWith("bloom")).length,
      ).toBe(stage === "flowering" ? 6 : 0);
      expect(
        scene.nodes.filter((n) => n.assetId.startsWith("leaf")).length,
      ).toBe(stage === "seedling" ? 2 : stage === "juvenile" ? 4 : 6);
    }
    for (const [flowerDensity, count] of [
      ["low", 2],
      ["medium", 4],
      ["high", 6],
    ] as const)
      expect(
        layoutPlant(
          "velvetleaf",
          { ...phenotype, flowerDensity },
          0,
          "flowering",
        ).nodes.filter((n) => n.assetId.startsWith("bloom")),
      ).toHaveLength(count);
  });
  it("renders distinct silhouettes, pigments and clipped patterns, with golden veins affecting veins alone", () => {
    const outputs = new Set<string>();
    for (const leafShape of ["oval", "lobed", "pointed"] as const)
      for (const pigment of ["green", "purple"] as const)
        for (const leafPattern of ["solid", "variegated"] as const)
          outputs.add(
            renderSvg(
              layoutPlant(
                "velvetleaf",
                { ...phenotype, leafShape, pigment, leafPattern },
                2,
              ),
            ),
          );
    expect(outputs.size).toBe(12);
    const a = layoutPlant("velvetleaf", phenotype, 1),
      b = layoutPlant(
        "velvetleaf",
        { ...phenotype, mutations: ["golden_veins"] },
        1,
      );
    expect(a.nodes.map(({ palette, ...node }) => node)).toEqual(
      b.nodes.map(({ palette, ...node }) => node),
    );
    expect(b.nodes[0].palette.vein).toBe("#e4b84e");
    expect(
      renderSvg(
        layoutPlant("velvetleaf", { ...phenotype, leafPattern: "marbled" }, 1),
      ),
    ).toContain('clip-path="url(#');
  });
  it("rejects XML injection, unknown assets, non-finite geometry and unsafe palettes", () => {
    const scene = layoutPlant("velvetleaf", phenotype, 1);
    expect(() => renderSvg(scene, { namespace: '"><script/>' })).toThrow();
    for (const bad of [
      { ...scene, nodes: [{ ...scene.nodes[0], assetId: "<script>" }] },
      { ...scene, nodes: [{ ...scene.nodes[0], x: NaN }] },
      {
        ...scene,
        nodes: [
          {
            ...scene.nodes[0],
            palette: {
              ...scene.nodes[0].palette,
              leafBase: "url(https://evil)",
            },
          },
        ],
      },
    ])
      expect(() => renderSvg(bad as unknown as PlantScene)).toThrow();
    expect(() =>
      layoutPlant("velvetleaf", phenotype, 1, "mature", 2),
    ).toThrow();
    expect(() =>
      layoutPlant(
        "velvetleaf",
        { ...phenotype, leafShape: "<script>" } as unknown as Phenotype,
        1,
      ),
    ).toThrow();
    const svg = renderSvg(scene, { background: "warm" });
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).not.toMatch(/<script|foreignObject|<image|href=/);
  });
});
