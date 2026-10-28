import { loci, type Genome, type Locus, velvetleaf } from "@botanica/genetics";
export const locusLabels: Record<Locus, string> = {
  pigment: "Pigment",
  leafShape: "Leaf shape",
  leafPattern: "Leaf pattern",
  growthHabit: "Growth habit",
  flowerColor: "Flower color",
  flowerDensity: "Flower density",
};
export function GenomeEditor({
  genome,
  onChange,
}: {
  genome: Genome;
  onChange: (genome: Genome) => void;
}) {
  return (
    <fieldset className="genome-editor">
      <legend>Diploid genotype</legend>
      <p>
        One allele from each parent. Dominance determines the expressed trait.
      </p>
      {loci.map((locus) => (
        <div className="locus-editor" key={locus}>
          <span>{locusLabels[locus]}</span>
          {([0, 1] as const).map((index) => (
            <label key={index}>
              <span className="sr-only">
                {locusLabels[locus]} allele {index === 0 ? "A" : "B"}
              </span>
              <select
                value={genome[locus][index]}
                onChange={(e) => {
                  const pair = [...genome[locus]];
                  pair[index] = e.target.value;
                  onChange({ ...genome, [locus]: pair } as Genome);
                }}
              >
                {velvetleaf.loci[locus].dominance.map((allele) => (
                  <option value={allele} key={allele}>
                    {allele} ·{" "}
                    {
                      (velvetleaf.loci[locus].labels as Record<string, string>)[
                        allele
                      ]
                    }
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ))}
    </fieldset>
  );
}
