import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import {
  breed,
  canBreed,
  checkCompatibility,
  classifyRarity,
  createRng,
  exampleGenome,
  loci,
  resolvePhenotype,
  validateGenome,
  velvetleaf,
  type BreedingParent,
} from "./index.js";
const a: BreedingParent = {
  id: "a",
  speciesId: "velvetleaf",
  genome: exampleGenome,
  generation: 2,
  genomeVersion: 1,
};
const b: BreedingParent = { ...a, id: "b", generation: 4 };
const off = { alleleMutationRate: 0, namedMutationRate: 0 };
describe("genetics v1", () => {
  it("replays Mulberry32 bit-identically, including a separate Node process", () => {
    const rng = createRng(1);
    expect([rng(), rng()]).toEqual([0.6270739405881613, 0.002735721180215478]);
    const first = breed(a, b, -81);
    expect(breed(a, b, -81)).toEqual(first);
    const script = `import {breed} from '@botanica/genetics';console.log(JSON.stringify(breed(${JSON.stringify(a)},${JSON.stringify(b)},-81)))`;
    expect(
      JSON.parse(
        execFileSync(process.execPath, ["--input-type=module", "-e", script], {
          encoding: "utf8",
        }),
      ),
    ).toEqual(first);
    expect(first.parents).toEqual(["a", "b"]);
    expect(first.generation).toBe(5);
    expect(first.engineVersion).toBe(1);
  });
  it("produces the 1:2:1 PG cross over 10,000 independent seeds", () => {
    const counts = { PP: 0, PG: 0, GG: 0 };
    for (let seed = 0; seed < 10000; seed++) {
      const pair = breed(a, b, seed, 1, off).genome.pigment;
      const key = pair[0] === pair[1] ? pair.join("") : "PG";
      counts[key as keyof typeof counts]++;
    }
    console.log("M1 PG cross (n=10000):", counts);
    expect(Math.abs(counts.PP / 10000 - 0.25)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(counts.PG / 10000 - 0.5)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(counts.GG / 10000 - 0.25)).toBeLessThanOrEqual(0.02);
  });
  it("honors dominance at every locus and rejects incomplete or untrusted genomes", () => {
    expect(resolvePhenotype("velvetleaf", exampleGenome)).toMatchObject({
      pigment: "purple",
      leafShape: "lobed",
      leafPattern: "variegated",
      growthHabit: "bushy",
      flowerColor: "red",
      flowerDensity: "high",
    });
    for (const locus of loci) {
      const { dominance, labels } = velvetleaf.loci[locus];
      for (const left of dominance)
        for (const right of dominance) {
          const genome = { ...exampleGenome, [locus]: [left, right] };
          const winner = dominance.find((v) => v === left || v === right)!;
          expect(resolvePhenotype("velvetleaf", genome)[locus]).toBe(
            (labels as Record<string, string>)[winner],
          );
        }
    }
    expect(() =>
      validateGenome("velvetleaf", { ...exampleGenome, pigment: ["X", "G"] }),
    ).toThrow();
    expect(() =>
      validateGenome("velvetleaf", { pigment: ["P", "G"] }),
    ).toThrow();
    expect(() =>
      validateGenome("velvetleaf", { ...exampleGenome, rarity: "Mythic" }),
    ).toThrow();
    expect(() =>
      resolvePhenotype("velvetleaf", exampleGenome, ["unknown"]),
    ).toThrow();
    expect(() =>
      resolvePhenotype("velvetleaf", exampleGenome, [], 2),
    ).toThrow();
  });
  it("requires compatibility groups, mutual approval and an explicit hybrid rule", () => {
    expect(canBreed("velvetleaf", "velvetleaf").compatible).toBe(true);
    const other = { ...velvetleaf, id: "other" };
    expect(checkCompatibility(velvetleaf, other)).toMatchObject({
      compatible: false,
      code: "INCOMPATIBLE_SPECIES",
    });
    expect(
      checkCompatibility(
        {
          ...velvetleaf,
          allowedPartners: ["other"],
          hybridOffspring: { other: "hybrid" },
        },
        { ...other, allowedPartners: ["velvetleaf"] },
      ),
    ).toMatchObject({ compatible: true, offspringSpeciesId: "hybrid" });
    expect(
      checkCompatibility(
        {
          ...velvetleaf,
          allowedPartners: ["other"],
          hybridOffspring: { other: "hybrid" },
        },
        {
          ...other,
          compatibilityGroup: "alien",
          allowedPartners: ["velvetleaf"],
        },
      ),
    ).toMatchObject({ compatible: false });
    expect(() => breed(a, { ...b, speciesId: "unknown" }, 1)).toThrow();
  });
  it("has exact zero/one mutation boundaries and logs only different valid alleles", () => {
    const before = JSON.stringify(a);
    const clean = breed(a, b, 42, 1, off);
    expect(clean.mutationEvents).toEqual([]);
    const changed = breed(a, b, 42, 1, {
      alleleMutationRate: 1,
      namedMutationRate: 1,
    });
    expect(changed.mutationEvents).toHaveLength(13);
    expect(changed.mutations).toEqual(["golden_veins"]);
    validateGenome("velvetleaf", changed.genome);
    for (const event of changed.mutationEvents.filter(
      (e) => e.type === "allele",
    ))
      expect(event.from).not.toBe(event.to);
    expect(changed.visualSeed).toBe(clean.visualSeed);
    expect(JSON.stringify(a)).toBe(before);
    expect(() => breed(a, b, 0, 1, { alleleMutationRate: 1.01 })).toThrow();
    expect(() => breed(a, b, 2147483648)).toThrow();
  });
  it("derives rarity from explicit catalog traits with capped unusual contributions", () => {
    const base = resolvePhenotype("velvetleaf", {
      pigment: ["P", "P"],
      leafShape: ["L", "L"],
      leafPattern: ["S", "S"],
      growthHabit: ["T", "T"],
      flowerColor: ["B", "B"],
      flowerDensity: ["H", "H"],
    });
    expect(classifyRarity(base)).toMatchObject({
      score: 0,
      tier: "Common",
      rarityPolicyVersion: 1,
    });
    expect(classifyRarity({ ...base, leafPattern: "marbled" })).toMatchObject({
      score: 20,
      tier: "Uncommon",
    });
    expect(
      classifyRarity({ ...base, mutations: ["golden_veins"] }),
    ).toMatchObject({ score: 25, tier: "Rare" });
    expect(
      classifyRarity({
        ...base,
        pigment: "yellow",
        leafShape: "oval",
        growthHabit: "compact",
        leafPattern: "variegated",
        mutations: ["golden_veins"],
      }),
    ).toMatchObject({ score: 100, tier: "Mythic" });
    expect(
      classifyRarity({
        ...base,
        pigment: "green",
        leafShape: "oval",
        growthHabit: "compact",
        flowerDensity: "low",
        flowerColor: "white",
      }).score,
    ).toBe(40);
  });
});
