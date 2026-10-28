import {
  exampleGenome,
  resolvePhenotype,
  type Genome,
} from "@botanica/genetics";
export const studies = (["O", "L", "S"] as const).flatMap((shape) =>
  (["G", "P"] as const).flatMap((pigment) =>
    (["S", "V"] as const).map((pattern) => {
      const genome: Genome = {
        ...exampleGenome,
        leafShape: [shape, shape],
        pigment: [pigment, pigment],
        leafPattern: [pattern, pattern],
      };
      const phenotype = resolvePhenotype("velvetleaf", genome);
      return {
        id: shape + pigment + pattern,
        name: [
          phenotype.leafShape,
          phenotype.pigment,
          phenotype.leafPattern,
        ].join(" · "),
        genome,
        phenotype,
      };
    }),
  ),
);
export const smokeStudies = Array.from({ length: 100 }, (_, i) => {
  const sample = studies[i % studies.length];
  const genome: Genome = {
    ...sample.genome,
    pigment: (
      [
        ["G", "G"],
        ["P", "P"],
        ["R", "R"],
        ["Y", "Y"],
      ] as const
    )[i % 4] as Genome["pigment"],
    leafPattern: (
      [
        ["S", "S"],
        ["V", "V"],
        ["M", "M"],
      ] as const
    )[i % 3] as Genome["leafPattern"],
    growthHabit: (
      [
        ["B", "B"],
        ["C", "C"],
        ["T", "T"],
      ] as const
    )[Math.floor(i / 3) % 3] as Genome["growthHabit"],
  };
  return {
    id: i,
    phenotype: resolvePhenotype(
      "velvetleaf",
      genome,
      i % 11 === 0 ? ["golden_veins"] : [],
    ),
    visualSeed: i * 7919,
  };
});
