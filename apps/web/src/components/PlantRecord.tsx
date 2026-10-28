import { useInspectorOptions } from "../lib/inspectorStore";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { loci } from "@botanica/genetics";
import { stages, type GrowthStage, type Background } from "@botanica/renderer";
import type { PlantDto } from "@botanica/shared";
import { PlantPreview } from "./PlantPreview";
import { ExportActions } from "./ExportActions";
import { QueryMessage } from "./QueryMessage";
import { locusLabels } from "./GenomeEditor";
import { api } from "../lib/api";
export function PlantRecord({
  plant: p,
  onParent,
}: {
  plant: PlantDto;
  onParent?: (id: string) => void;
}) {
  const { stage, background, set } = useInspectorOptions();
  const setStage = (stage: GrowthStage) => set({ stage }),
    setBackground = (background: Background) => set({ background });
  const stats = useQuery({
      queryKey: ["collection-stats"],
      queryFn: api.stats,
    }),
    birth = useQuery({
      queryKey: ["birth", p.id],
      queryFn: () => api.birth(p.id),
    });
  useEffect(() => {
    setStage("flowering");
  }, [p.id]);
  return (
    <section className="render-workbench plant-details">
      <div className="specimen">
        <PlantPreview
          phenotype={p.phenotype}
          visualSeed={p.visualSeed}
          stage={stage}
          background={background}
        />
        <div className="specimen-bottom">
          <span>
            {p.phenotype.pigment} · {p.phenotype.leafShape} ·{" "}
            {p.phenotype.leafPattern}
          </span>
          <PlantPreview
            phenotype={p.phenotype}
            visualSeed={p.visualSeed}
            stage={stage}
            size={64}
          />
        </div>
      </div>
      <aside className="study-panel">
        <div className="detail-badges">
          <span
            className={"rarity-badge rarity-" + p.rarity.tier.toLowerCase()}
          >
            {p.rarity.tier} · {p.rarity.score}/100
          </span>
          <span className="badge">Generation {p.generation}</span>
        </div>
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
        <p className="panel-note">
          {p.rarity.reasons.map((r) => r.label + " +" + r.points).join("; ") ||
            "No unusual traits."}{" "}
          · Rarity policy v{p.rarity.rarityPolicyVersion}
        </p>
        {stats.data && (
          <p className="frequency-note">
            Collection frequency: {stats.data.byRarity[p.rarity.tier] ?? 0} of{" "}
            {stats.data.total} saved plants share this tier. This count is
            separate from the trait score.
          </p>
        )}
        <h3>Lineage</h3>
        {p.parents.length ? (
          <ul className="lineage-links">
            {p.parents.map((parent, i) => (
              <li key={parent}>
                {onParent ? (
                  <button
                    className="link-button"
                    onClick={() => onParent(parent)}
                  >
                    Parent {i === 0 ? "A" : "B"} · {parent.slice(0, 8)} →
                  </button>
                ) : (
                  <Link to={"/plants/" + parent}>
                    Parent {i === 0 ? "A" : "B"} · {parent.slice(0, 8)} →
                  </Link>
                )}
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
          {p.creationSource === "demo"
            ? " Demonstration traits are curated examples, not breeding outcomes."
            : ""}
        </p>
        {birth.error && (
          <QueryMessage
            error={birth.error}
            retry={() => void birth.refetch()}
          />
        )}{" "}
        {birth.data?.event && (
          <details>
            <summary>Breeding record & mutations</summary>
            <p>
              Engine v{birth.data.event.engineVersion} · Seed{" "}
              {birth.data.event.rngSeed}
            </p>
            {birth.data.event.mutationEvents.length ? (
              <ul>
                {birth.data.event.mutationEvents.map((event, i) => (
                  <li key={i}>
                    {event.type === "named"
                      ? event.to
                      : `${event.locus}, parent ${event.parent}: ${event.from} → ${event.to}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No mutations recorded in this cross.</p>
            )}
          </details>
        )}
        <details>
          <summary>Provenance</summary>
          <dl className="provenance">
            <dt>Plant ID</dt>
            <dd>{p.id}</dd>
            <dt>Created</dt>
            <dd>{new Date(p.createdAt).toLocaleString("en-GB")}</dd>
            <dt>Origin</dt>
            <dd>
              {p.creationSource === "bred"
                ? "Bred offspring"
                : p.creationSource === "demo"
                  ? "Demonstration plant"
                  : "Designed founder"}
            </dd>
            <dt>Versions</dt>
            <dd>
              Genome {p.genomeVersion} · Renderer {p.rendererVersion}
            </dd>
            <dt>Visual seed</dt>
            <dd>{p.visualSeed}</dd>
          </dl>
        </details>
        <div className="control-pair">
          <label>
            Growth stage
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as GrowthStage)}
            >
              {stages.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Export background
            <select
              value={background}
              onChange={(e) => setBackground(e.target.value as Background)}
            >
              <option value="warm">Warm ivory</option>
              <option value="transparent">Transparent</option>
            </select>
          </label>
        </div>
        <ExportActions
          phenotype={p.phenotype}
          visualSeed={p.visualSeed}
          stage={stage}
          background={background}
          plant={p}
        />
        <div className="detail-links">
          <Link className="text-link" to={"/lab?plant=" + p.id}>
            Study genome →
          </Link>
          <Link className="text-link" to={"/breed?parent=" + p.id}>
            Use as parent →
          </Link>
        </div>
      </aside>
    </section>
  );
}
