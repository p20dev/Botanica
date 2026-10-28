import { useState, useTransition } from "react";
import { PlantPreview } from "../components/PlantPreview";
import { studies, smokeStudies } from "../lib/studies";
export function RenderGallery() {
  const [smoke, setSmoke] = useState(false),
    [pending, startTransition] = useTransition();
  return (
    <>
      <section className="lab-heading">
        <div>
          <p className="eyebrow">The velvetleaf field atlas</p>
          <h1>Variations on a leaf.</h1>
          <p>
            Twelve controlled studies: three silhouettes, two pigments, two
            patterns. These are render proofs, not saved plants.
          </p>
        </div>
        <span className="badge">Renderer v1</span>
      </section>
      <section className="proof-toolbar">
        <h2>{smoke ? "100-seed render study" : "The systematic twelve"}</h2>
        <button
          aria-pressed={smoke}
          onClick={() => startTransition(() => setSmoke(!smoke))}
        >
          {smoke ? "Show 12 studies" : "Show 100-seed study"}
        </button>
        <span role="status">
          {pending
            ? "Rendering…"
            : smoke
              ? "100 deterministic plants"
              : "12 systematic variations"}
        </span>
      </section>
      <div className={"proof-grid" + (smoke ? " smoke-grid" : "")}>
        {smoke
          ? smokeStudies.map((s) => (
              <article className="plant-card" key={s.id}>
                <PlantPreview
                  phenotype={s.phenotype}
                  visualSeed={s.visualSeed}
                  stage="flowering"
                  size={128}
                />
                <h3>Study {String(s.id + 1).padStart(3, "0")}</h3>
                <p>
                  {s.phenotype.pigment} · {s.phenotype.leafPattern}
                </p>
                <small>Seed {s.visualSeed}</small>
              </article>
            ))
          : studies.map((s, i) => (
              <article className="plant-card" key={s.id}>
                <div className="plate-number">
                  {String(i + 1).padStart(2, "0")} / VELVETLEAF
                </div>
                <PlantPreview
                  phenotype={s.phenotype}
                  visualSeed={8155}
                  stage="mature"
                  size={512}
                />
                <h3>{s.phenotype.leafShape} velvetleaf</h3>
                <p>
                  {s.phenotype.pigment} · {s.phenotype.leafPattern}
                </p>
                <div className="card-footer">
                  <span>Catalog v1 · Seed 8155</span>
                  <PlantPreview
                    phenotype={s.phenotype}
                    visualSeed={8155}
                    stage="mature"
                    size={64}
                    label={"64 pixel " + s.name}
                  />
                </div>
              </article>
            ))}
      </div>
    </>
  );
}
