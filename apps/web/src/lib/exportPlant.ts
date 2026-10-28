import {
  layoutPlant,
  renderSvg,
  type Background,
  type GrowthStage,
} from "@botanica/renderer";
import type { Phenotype } from "@botanica/genetics";
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportPlant(
  format: "svg" | "png",
  phenotype: Phenotype,
  visualSeed: number,
  stage: GrowthStage,
  background: Background,
) {
  const svg = renderSvg(
      layoutPlant("velvetleaf", phenotype, visualSeed, stage),
      { namespace: "export", background },
    ),
    blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    filename = "velvetleaf-" + stage + "-" + visualSeed;
  if (format === "svg") {
    download(blob, filename + ".svg");
    return;
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("Could not load the SVG for PNG export."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PNG export is unavailable in this browser.");
    context.drawImage(image, 0, 0, 512, 512);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("Could not create PNG.")),
        "image/png",
      ),
    );
    download(png, filename + ".png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
