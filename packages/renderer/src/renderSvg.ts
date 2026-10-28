import { z } from "zod";
import { primitives, variegationPath, marblePath } from "./primitives.js";
import { sceneSchema, type PlantScene, type Background } from "./types.js";
const optionsSchema = z.strictObject({
  namespace: z
    .string()
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/)
    .default("plant"),
  background: z.enum(["transparent", "warm"]).default("transparent"),
});
export function renderSvg(
  input: PlantScene,
  options: { namespace?: string; background?: Background } = {},
): string {
  const scene = sceneSchema.parse(input),
    { namespace: ns, background } = optionsSchema.parse(options);
  const defs: string[] = [],
    content: string[] = [];
  if (background === "warm")
    content.push('<path fill="#f6f3e8" d="M0 0H512V512H0Z"/>');
  scene.nodes.forEach((node, i) => {
    const asset = primitives[node.assetId],
      p = node.palette,
      id = ns + "-" + i;
    if (asset.category === "leaf") {
      defs.push(
        '<clipPath id="' +
          id +
          '-clip"><path d="' +
          asset.outline +
          '"/></clipPath><linearGradient id="' +
          id +
          '-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="' +
          p.leafBase +
          '"/><stop offset="1" stop-color="' +
          p.leafShade +
          '"/></linearGradient>',
      );
      const pattern =
        node.pattern === "solid"
          ? ""
          : '<path d="' +
            (node.pattern === "variegated" ? variegationPath : marblePath) +
            '" fill="' +
            p.variegation +
            '" opacity="' +
            (node.pattern === "variegated" ? ".92" : ".72") +
            '" clip-path="url(#' +
            id +
            '-clip)"/>';
      content.push(
        '<g data-asset="' +
          node.assetId +
          '" transform="translate(' +
          node.x +
          " " +
          node.y +
          ") rotate(" +
          node.rotation +
          ") scale(" +
          node.scale +
          ') translate(-50 -128)"><path d="' +
          asset.outline +
          '" fill="url(#' +
          id +
          '-fill)" stroke="' +
          p.leafShade +
          '" stroke-width="1.1"/>' +
          pattern +
          '<path d="' +
          asset.shade +
          '" fill="' +
          p.leafShade +
          '" opacity=".18"/><path d="' +
          asset.highlight +
          '" fill="' +
          p.variegation +
          '" opacity=".17"/><path d="' +
          asset.veins +
          '" fill="none" stroke="' +
          p.vein +
          '" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/></g>',
      );
    } else if (asset.category === "branch" || asset.category === "stem")
      content.push(
        '<path data-asset="' +
          node.assetId +
          '" d="' +
          asset.outline +
          '" transform="translate(' +
          node.x +
          " " +
          node.y +
          ") rotate(" +
          node.rotation +
          ") scale(" +
          node.scale +
          ')" fill="none" stroke="#4a6648" stroke-width="' +
          (node.assetId === "flower_stalk"
            ? 2
            : asset.category === "stem"
              ? 6
              : 4) +
          '" stroke-linecap="round"/>',
      );
    else if (asset.category === "bloom")
      content.push(
        '<g data-asset="' +
          node.assetId +
          '" transform="translate(' +
          node.x +
          " " +
          node.y +
          ") rotate(" +
          node.rotation +
          ") scale(" +
          node.scale +
          ') translate(-25 -25)"><path d="' +
          asset.outline +
          '" fill="' +
          p.flower +
          '" stroke="#695e72" stroke-width=".7"/><path d="M25 15L25 36M15 22L34 29M17 32L33 19" stroke="#fff5de" opacity=".45" stroke-width="2"/><circle cx="25" cy="25" r="5" fill="#c7a15b"/><circle cx="24" cy="24" r="1.7" fill="#f5dc93"/></g>',
      );
    else if (asset.category === "shadow")
      content.push(
        '<path d="' + asset.outline + '" fill="#324534" opacity=".1"/>',
      );
    else if (asset.category === "pot") {
      const ceramic = node.assetId === "pot_ceramic",
        base = ceramic ? "#d8d8bf" : "#b77b5d",
        shade = ceramic ? "#b5bba2" : "#935f4c",
        light = ceramic ? "#f4ecd7" : "#dda582";
      if (node.layer === 1)
        content.push(
          '<path d="' +
            asset.outline +
            '" fill="' +
            base +
            '"/><path d="' +
            asset.shade +
            '" fill="' +
            shade +
            '"/><path d="' +
            asset.highlight +
            '" fill="' +
            light +
            '" opacity=".55"/><path d="M211 445Q256 459 303 445" stroke="' +
            shade +
            '" opacity=".28" fill="none"/><ellipse cx="256" cy="389" rx="61" ry="12" fill="#66523d"/><ellipse cx="256" cy="389" rx="51" ry="7" fill="#493f31"/>',
        );
      else
        content.push(
          '<path d="M194 387 Q256 404 318 387 L317 401 Q256 418 195 401Z" fill="' +
            base +
            '"/><path d="M196 388Q256 405 316 388" fill="none" stroke="' +
            light +
            '" stroke-width="3"/>',
        );
    }
  });
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-labelledby="' +
    ns +
    '-title"><title id="' +
    ns +
    '-title">Velvetleaf botanical illustration</title><defs>' +
    defs.join("") +
    "</defs>" +
    content.join("") +
    "</svg>"
  );
}
