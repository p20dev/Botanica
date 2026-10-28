import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { PlantPreview } from "../components/PlantPreview";
import { ExportActions } from "../components/ExportActions";
import { QueryMessage } from "../components/QueryMessage";
import { plantQuery } from "../lib/api";
import { loci } from "@botanica/genetics";
import { locusLabels } from "../components/GenomeEditor";
export function PlantDetails() {
  const { id = "" } = useParams(),
    plant = useQuery(plantQuery(id));
  if (plant.isPending) return <QueryMessage loading />;
  if (plant.error)
    return (
      <QueryMessage error={plant.error} retry={() => void plant.refetch()} />
    );
  const p = plant.data;
  return (
    <>
      <section className="lab-heading">
        <div>
          <p className="eyebrow">A living record</p>
          <h1>{p.name}</h1>
          <p>
            Generation {p.generation} ·{" "}
            {p.creationSource === "bred"
              ? "Bred offspring"
              : p.creationSource === "demo"
                ? "Demonstration plant"
                : "Designed founder"}
          </p>
        </div>
        <Link className="button-link secondary" to="/breed">
          Back to breeding →
        </Link>
      </section>
      <section className="render-workbench plant-details">
        <div className="specimen">
          <PlantPreview
            phenotype={p.phenotype}
            visualSeed={p.visualSeed}
            stage="flowering"
          />
          <div className="specimen-bottom">
            <span>
              {p.phenotype.pigment} · {p.phenotype.leafShape} ·{" "}
              {p.phenotype.leafPattern}
            </span>
            <PlantPreview
              phenotype={p.phenotype}
              visualSeed={p.visualSeed}
              stage="flowering"
              size={64}
            />
          </div>
        </div>
        <aside className="study-panel">
          <h2>Genotype & phenotype</h2>
          <dl className="genome-record">
            {loci.map((locus) => (
              <div key={locus}>
                <dt>{locusLabels[locus]}</dt>
                <dd>
                  <code>{p.genome[locus].join(" / ")}</code>
                  <span>{p.phenotype[locus]}</span>
                </dd>
              </div>
            ))}
          </dl>
          <h3>
            {p.rarity.tier} · {p.rarity.score}/100
          </h3>
          <p className="panel-note">
            {p.rarity.reasons
              .map((r) => r.label + " +" + r.points)
              .join("; ") || "No unusual traits."}{" "}
            · Rarity policy v{p.rarity.rarityPolicyVersion}
          </p>
          <h3>Lineage</h3>
          {p.parents.length ? (
            <ul className="lineage-links">
              {p.parents.map((parent, i) => (
                <li key={parent}>
                  <Link to={"/plants/" + parent}>
                    Parent {i === 0 ? "A" : "B"} · {parent.slice(0, 8)} →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-note">Founder plant. No recorded parents.</p>
          )}
          <p className="panel-note">
            {p.mutations.length
              ? "Recorded modifier: " + p.mutations.join(", ")
              : "No named mutations."}
          </p>
          <details>
            <summary>Provenance</summary>
            <dl className="provenance">
              <dt>Plant ID</dt>
              <dd>{p.id}</dd>
              <dt>Created</dt>
              <dd>{new Date(p.createdAt).toLocaleString("en-GB")}</dd>
              <dt>Versions</dt>
              <dd>
                Genome {p.genomeVersion} · Renderer {p.rendererVersion}
              </dd>
              <dt>Visual seed</dt>
              <dd>{p.visualSeed}</dd>
            </dl>
          </details>
          <ExportActions
            phenotype={p.phenotype}
            visualSeed={p.visualSeed}
            stage="flowering"
          />
          <Link className="text-link" to={"/lab?plant=" + p.id}>
            Study this genome in the lab →
          </Link>
        </aside>
      </section>
    </>
  );
}
