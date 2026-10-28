import { useState } from "react";
import type { Phenotype } from "@botanica/genetics";
import type { GrowthStage, Background } from "@botanica/renderer";
import { exportPlant } from "../lib/exportPlant";
export function ExportActions({
  phenotype,
  visualSeed,
  stage,
  background = "transparent",
}: {
  phenotype: Phenotype;
  visualSeed: number;
  stage: GrowthStage;
  background?: Background;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save(format: "svg" | "png") {
    setBusy(true);
    try {
      await exportPlant(format, phenotype, visualSeed, stage, background);
      setMessage(format.toUpperCase() + " exported.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="export-actions">
        <button disabled={busy} onClick={() => void save("svg")}>
          Export SVG
        </button>
        <button disabled={busy} onClick={() => void save("png")}>
          Export PNG
        </button>
      </div>
      <p className="export-status" role="status">
        {message}
      </p>
    </>
  );
}
