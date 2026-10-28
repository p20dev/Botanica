import { memo, useId, useMemo } from "react";
import {
  layoutPlant,
  renderSvg,
  type GrowthStage,
  type Background,
} from "@botanica/renderer";
import type { Phenotype } from "@botanica/genetics";
export interface PlantPreviewProps {
  phenotype: Phenotype;
  visualSeed: number;
  stage: GrowthStage;
  background?: Background;
  size?: 64 | 128 | 512;
  label?: string;
}
export const PlantPreview = memo(function PlantPreview({
  phenotype,
  visualSeed,
  stage,
  background = "transparent",
  size = 512,
  label = "Velvetleaf plant",
}: PlantPreviewProps) {
  const id = "plant" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const svg = useMemo(
    () =>
      renderSvg(layoutPlant("velvetleaf", phenotype, visualSeed, stage), {
        namespace: id,
        background,
      }),
    [phenotype, visualSeed, stage, id, background],
  );
  return (
    <div
      className={"plant-preview size-" + size}
      style={{ width: size, maxWidth: "100%" }}
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});
