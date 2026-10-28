# Original botanical artwork

The velvetleaf vector artwork was authored for Botanica by Codex on 2026-10-28. All SVG primitive artwork in `assets/species/velvetleaf` and its hand-authored path definitions in `packages/renderer/src/primitives.ts` are dedicated to the public domain under CC0-1.0. No scraped, stock, generated raster, commercial or externally hosted artwork is used.

The 15 primitives comprise three leaf silhouettes with layered shading, highlights and vein paths; three branch grammars; a stem and flowering stalk; four bloom variants; two pots; and a ground shadow. `manifest.json` declares asset IDs, normalized anchors, canonical bounds, palette slots and renderer version. The renderer uses the same typed path definitions, rather than parsing or injecting arbitrary XML. Committed standalone SVG sources are regenerated with `npm run assets:write`; `npm run test` checks that they remain in sync. Metadata anchors are normalized to bounds; renderer anchors use canonical pixel coordinates.

Six curated leaf palettes are defined in `packages/renderer/src/palettes.ts`. Pattern overlays use leaf-specific clipping; golden veins change only the vein paint. Exported SVGs have no external references or fonts. Pots and the shadow use their own fixed material colors.

The earlier decorative shell study in `apps/web/src/main.tsx` is also original project artwork under CC0-1.0. It remains on informational shell pages; the laboratory and render atlas use the procedural renderer.
