import { useMemo, useState } from "react";
import { Download, Leaf } from "lucide-react";
import { classifyRarity, resolvePhenotype } from "@botanica/genetics";
import { stages, type GrowthStage, type Background } from "@botanica/renderer";
import { PlantPreview } from "../components/PlantPreview";
import { studies } from "../lib/studies";
import { useStudy } from "../lib/studyStore";
import { exportPlant } from "../lib/exportPlant";
export function RenderLab() {
  const state = useStudy(),
    study = studies.find((s) => s.id === state.studyId) ?? studies[0];
  const phenotype = useMemo(
    () =>
      resolvePhenotype(
        "velvetleaf",
        study.genome,
        state.goldenVeins ? ["golden_veins"] : [],
      ),
    [study, state.goldenVeins],
  );
  const rarity = classifyRarity(phenotype);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(format: "svg" | "png") {
    setBusy(true);
    setMessage("");
    try {
      await exportPlant(
        format,
        phenotype,
        state.visualSeed,
        state.stage,
        state.background,
      );
      setMessage(format.toUpperCase() + " exported.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Export failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="lab-heading">
        <div>
          <p className="eyebrow">The illustrated laboratory</p>
          <h1>A study in possibility.</h1>
          <p>
            One species, many expressions. Explore the illustrated character of
            velvetleaf.
          </p>
        </div>
        <span className="badge">M2 · Vector studies</span>
      </section>
      <section
        className="render-workbench"
        aria-label="Plant rendering workbench"
      >
        <div className="specimen">
          <div className="specimen-top">
            <span>VELVETLEAF</span>
            <span>Plate 001 / Renderer v1</span>
          </div>
          <PlantPreview
            phenotype={phenotype}
            visualSeed={state.visualSeed}
            stage={state.stage}
            background={state.background}
          />
          <div className="specimen-bottom">
            <div>
              <h2>Velvetleaf</h2>
              <p>
                {phenotype.leafShape} foliage · {phenotype.growthHabit} habit
              </p>
            </div>
            <PlantPreview
              phenotype={phenotype}
              visualSeed={state.visualSeed}
              stage={state.stage}
              size={64}
              label="64 pixel icon preview"
            />
          </div>
        </div>
        <aside className="study-panel" aria-labelledby="study-heading">
          <div className="panel-title">
            <Leaf size={20} />
            <h2 id="study-heading">Specimen study</h2>
          </div>
          <p className="panel-note">
            Curated render presets. Diploid editing and saved plants arrive in
            M3.
          </p>
          <label>
            Botanical study
            <select
              value={state.studyId}
              onChange={(e) => state.set({ studyId: e.target.value })}
            >
              {studies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="control-pair">
            <label>
              Growth stage
              <select
                value={state.stage}
                onChange={(e) =>
                  state.set({ stage: e.target.value as GrowthStage })
                }
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
                min="-2147483648"
                max="2147483647"
                step="1"
                value={state.visualSeed}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (
                    Number.isInteger(value) &&
                    value >= -2147483648 &&
                    value <= 2147483647
                  )
                    state.set({ visualSeed: value });
                }}
              />
            </label>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={state.goldenVeins}
              onChange={(e) => state.set({ goldenVeins: e.target.checked })}
            />
            Golden veins · manual preview
          </label>
          <label>
            Preview & export background
            <select
              value={state.background}
              onChange={(e) =>
                state.set({ background: e.target.value as Background })
              }
            >
              <option value="warm">Warm ivory</option>
              <option value="transparent">Transparent</option>
            </select>
          </label>
          <div className="trait-summary">
            <span className="eyebrow">Resolved phenotype</span>
            <dl>
              <div>
                <dt>Pigment</dt>
                <dd>{phenotype.pigment}</dd>
              </div>
              <div>
                <dt>Pattern</dt>
                <dd>{phenotype.leafPattern}</dd>
              </div>
              <div>
                <dt>Flowers</dt>
                <dd>
                  {phenotype.flowerColor} · {phenotype.flowerDensity}
                </dd>
              </div>
              <div>
                <dt>Derived rarity</dt>
                <dd>
                  {rarity.tier} · {rarity.score}/100
                </dd>
              </div>
            </dl>
            <p className="rarity-note">
              {rarity.reasons
                .map((r) => r.label + " +" + r.points)
                .join("; ") || "No unusual traits in this preset."}
            </p>
          </div>
          <div className="export-actions">
            <button onClick={() => void save("svg")} disabled={busy}>
              <Download size={15} />
              Export SVG
            </button>
            <button onClick={() => void save("png")} disabled={busy}>
              <Download size={15} />
              Export PNG
            </button>
          </div>
          <p role="status" className="export-status">
            {message}
          </p>
        </aside>
      </section>
      <section className="stage-strip" aria-labelledby="stages-heading">
        <div>
          <p className="eyebrow">From first leaf to flower</p>
          <h2 id="stages-heading">Four chapters of growth</h2>
          <p>
            Growth changes the illustration. Hereditary traits stay the same.
          </p>
        </div>
        <div className="stage-previews">
          {stages.map((stage) => (
            <div key={stage}>
              <PlantPreview
                phenotype={phenotype}
                visualSeed={state.visualSeed}
                stage={stage}
                size={128}
              />
              <span>{stage}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
