import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { primitives } from "@botanica/renderer";
const directory = "assets/species/velvetleaf";
mkdirSync(directory, { recursive: true });
const files = {};
const manifest = [];
for (const [id, p] of Object.entries(primitives)) {
  const [x, y, w, h] = p.bounds;
  manifest.push({
    assetId: p.assetId,
    category: p.category,
    anchor: [(p.anchor[0] - x) / w, (p.anchor[1] - y) / h],
    bounds: p.bounds,
    paletteSlots: p.paletteSlots,
    rendererVersion: p.rendererVersion,
  });
  const leaf = p.category === "leaf",
    line = ["branch", "stem"].includes(p.category);
  const paths =
    '<path data-palette="' +
    (leaf
      ? "leafBase"
      : line
        ? "leafShade"
        : p.category === "bloom"
          ? "flower"
          : "pot") +
    '" d="' +
    p.outline +
    '" fill="' +
    (line
      ? "none"
      : leaf
        ? "#537b49"
        : p.category === "bloom"
          ? "#d797a1"
          : "#b77b5d") +
    '" stroke="#264a38" stroke-width="' +
    (line ? 4 : 1) +
    '"/>' +
    (p.shade
      ? '<path data-palette="leafShade" d="' +
        p.shade +
        '" fill="#264a38" opacity=".2"/>'
      : "") +
    (p.highlight
      ? '<path data-palette="variegation" d="' +
        p.highlight +
        '" fill="#e7dfad" opacity=".35"/>'
      : "") +
    (p.veins
      ? '<path data-palette="vein" d="' +
        p.veins +
        '" stroke="#b3c88a" stroke-width="1.25" fill="none"/>'
      : "");
  files[directory + "/" + id + "_v1.svg"] =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
    [x, y, w, h].join(" ") +
    '"><title>' +
    p.assetId +
    "</title>" +
    paths +
    "</svg>\n";
}
files[directory + "/manifest.json"] = JSON.stringify(manifest, null, 2) + "\n";
for (const [file, value] of Object.entries(files)) {
  if (process.argv.includes("--check")) {
    if (readFileSync(file, "utf8").replaceAll("\r\n", "\n") !== value)
      throw new Error("Asset source drift: " + file);
  } else writeFileSync(file, value);
}
console.log(
  Object.keys(files).length +
    " asset files " +
    (process.argv.includes("--check") ? "verified" : "written"),
);
