import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import {
  classifyRarity,
  resolvePhenotype,
  exampleGenome,
  type Genome,
} from "@botanica/genetics";
import { stages, type GrowthStage, type Background } from "@botanica/renderer";
import { PlantPreview } from "../components/PlantPreview";
import { GenomeEditor } from "../components/GenomeEditor";
import { ExportActions } from "../components/ExportActions";
import { QueryMessage } from "../components/QueryMessage";
import { api, plantQuery } from "../lib/api";
export function Lab() {
  const [search] = useSearchParams(),
    sourceId = search.get("plant") ?? "";
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: api.catalog }),
    source = useQuery({ ...plantQuery(sourceId), enabled: !!sourceId });
  const [genome, setGenome] = useState<Genome>(() =>
      structuredClone(exampleGenome),
    ),
    [stage, setStage] = useState<GrowthStage>("flowering"),
    [seed, setSeed] = useState(8155),
    [golden, setGolden] = useState(false),
    [background, setBackground] = useState<Background>("warm"),
    [name, setName] = useState("My velvetleaf");
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["plants"] });
      void client.invalidateQueries({ queryKey: ["parents"] });
    },
  });
  useEffect(() => {
    if (source.data) {
      setGenome(structuredClone(source.data.genome));
      setSeed(source.data.visualSeed);
      setGolden(false);
      setName((source.data.name + " study").slice(0, 60));
      save.reset();
    }
  }, [source.data]);
  const phenotype = useMemo(
      () =>
        resolvePhenotype("velvetleaf", genome, golden ? ["golden_veins"] : []),
      [genome, golden],
    ),
    rarity = classifyRarity(phenotype);
  return (
    <>
      <section className="lab-heading">
        <div>
          <p className="eyebrow">The plant laboratory</p>
          <h1>Grow something unexpected.</h1>
          <p>
            Edit paired alleles and see their expression. Save a designed
            founder, then cross saved plants in the breeding lab.
          </p>
        </div>
        <Link className="button-link secondary" to="/breed">
          Open breeding lab →
        </Link>
      </section>
      {sourceId && source.isPending && <QueryMessage loading />}
      {source.error && (
        <QueryMessage
          error={source.error}
          retry={() => void source.refetch()}
        />
      )}
      <section className="render-workbench editor-workbench">
        <div className="specimen">
          <div className="specimen-top">
            <span>VELVETLEAF / LIVE PREVIEW</span>
            <span>Genome v1 · Renderer v1</span>
          </div>
          <PlantPreview
            phenotype={phenotype}
            visualSeed={seed}
            stage={stage}
            background={background}
          />
          <div className="specimen-bottom">
            <div>
              <h2>{name || "Velvetleaf"}</h2>
              <p>
                {phenotype.pigment} · {phenotype.leafShape} ·{" "}
                {phenotype.leafPattern}
              </p>
            </div>
            <PlantPreview
              phenotype={phenotype}
              visualSeed={seed}
              stage={stage}
              size={64}
            />
          </div>
          <div className="phenotype-inspector">
            <h3>Resolved phenotype</h3>
            <dl>
              {(
                [
                  "pigment",
                  "leafShape",
                  "leafPattern",
                  "growthHabit",
                  "flowerColor",
                  "flowerDensity",
                ] as const
              ).map((key) => (
                <div key={key}>
                  <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                  <dd>{phenotype[key]}</dd>
                </div>
              ))}
              <div>
                <dt>Derived rarity</dt>
                <dd>
                  {rarity.tier} · {rarity.score}/100
                </dd>
              </div>
            </dl>
            <p>
              {rarity.reasons
                .map((r) => r.label + " +" + r.points)
                .join("; ") || "No unusual traits."}
            </p>
            <small>
              Policy v1 · preview classification
              {golden ? " includes a manual mutation" : ""}
            </small>
          </div>
        </div>
        <aside className="study-panel">
          <h2>The genome workbench</h2>
          {catalog.error ? (
            <QueryMessage
              error={catalog.error}
              retry={() => void catalog.refetch()}
            />
          ) : (
            <label>
              Species
              <select
                aria-label="Species"
                value="velvetleaf"
                disabled={catalog.isPending}
              >
                {(
                  catalog.data?.species ?? [
                    { id: "velvetleaf", name: "Velvetleaf" },
                  ]
                ).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <GenomeEditor
            genome={genome}
            onChange={(value) => {
              setGenome(value);
              save.reset();
            }}
          />
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
              Visual seed
              <input
                type="number"
                min={-2147483648}
                max={2147483647}
                value={seed}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (
                    Number.isInteger(value) &&
                    value >= -2147483648 &&
                    value <= 2147483647
                  )
                    setSeed(value);
                }}
              />
            </label>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={golden}
              onChange={(e) => setGolden(e.target.checked)}
            />
            Golden veins · manual preview only
          </label>
          <p className="panel-note">
            Manual mutation previews appear in image exports. They are not saved
            or recorded as bred mutations.
          </p>
          <label>
            Preview & export background
            <select
              value={background}
              onChange={(e) => setBackground(e.target.value as Background)}
            >
              <option value="warm">Warm ivory</option>
              <option value="transparent">Transparent</option>
            </select>
          </label>
          <ExportActions
            phenotype={phenotype}
            visualSeed={seed}
            stage={stage}
            background={background}
          />
          <form
            className="save-plant"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                speciesId: "velvetleaf",
                genome,
                visualSeed: seed,
                name,
              });
            }}
          >
            <label>
              Plant name
              <input
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button type="submit" disabled={save.isPending || !name.trim()}>
              {save.isPending ? "Saving…" : "Save designed plant"}
            </button>
            <p className="panel-note">
              Saves a new generation 0 founder. Earlier plants stay unchanged.
            </p>
            {save.error && (
              <p role="alert" className="error-text">
                {save.error.message}
              </p>
            )}
            {save.data && (
              <p role="status" className="success-text">
                Saved to your collection.{" "}
                <Link to={"/plants/" + save.data.id}>
                  Inspect {save.data.name} →
                </Link>
              </p>
            )}
          </form>
        </aside>
      </section>
    </>
  );
}
