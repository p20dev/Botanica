import { useState } from "react";
import type { Phenotype } from "@botanica/genetics";
import type { GrowthStage, Background } from "@botanica/renderer";
import type { PlantDto } from "@botanica/shared";
import { exportPlant, download } from "../lib/exportPlant";
export function ExportActions({
  phenotype,
  visualSeed,
  stage,
  background = "transparent",
  plant,
}: {
  phenotype: Phenotype;
  visualSeed: number;
  stage: GrowthStage;
  background?: Background;
  plant?: PlantDto;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save(format: "svg" | "png" | "json") {
    setBusy(true);
    try {
      if (format === "json" && plant)
        download(
          new Blob([JSON.stringify(plant, null, 2) + "\n"], {
            type: "application/json",
          }),
          "velvetleaf-" + plant.id + ".json",
        );
      else if (format !== "json")
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
        {plant && (
          <button disabled={busy} onClick={() => void save("json")}>
            Export JSON
          </button>
        )}
      </div>
      <p className="export-status" role="status">
        {message}
      </p>
    </>
  );
}
