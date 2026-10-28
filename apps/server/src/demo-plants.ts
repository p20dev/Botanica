import { genomeSchema, createRng, type Genome } from "@botanica/genetics";
export function demoSpecimen(index: number) {
  const rng = createRng(5100 + index),
    pick = <T>(values: readonly T[]) =>
      values[Math.floor(rng() * values.length)];
  const pigment = (["G", "P", "R", "Y"] as const)[index % 4],
    shape = (["O", "L", "S"] as const)[Math.floor(index / 4) % 3],
    pattern = (["S", "V", "M"] as const)[Math.floor(index / 12) % 3],
    habit = (["C", "B", "T"] as const)[Math.floor(index / 36) % 3],
    flower = pick(["W", "P", "B", "R"] as const),
    density = pick(["L", "M", "H"] as const);
  const genome: Genome = genomeSchema.parse({
    pigment: [pigment, pigment],
    leafShape: [shape, shape],
    leafPattern: [pattern, pattern],
    growthHabit: [habit, habit],
    flowerColor: [flower, flower],
    flowerDensity: [density, density],
  });
  return {
    id: "20000000-0000-4000-8000-" + String(index + 1).padStart(12, "0"),
    name:
      ["Fern", "Plum", "Copper", "Citron"][index % 4] +
      " · specimen " +
      String(index + 3).padStart(3, "0"),
    speciesId: "velvetleaf",
    genome,
    visualSeed: 5100 + index * 7919,
    mutations: index % 17 === 0 ? (["golden_veins"] as ["golden_veins"]) : [],
    creationSource: "demo" as const,
  };
}
