# Graphics and renderer architecture v1

## Principle
No pre-rendered combination explosion. Build plants from **illustrated hand-authored SVG primitives** composed into a deterministic scene. Species style is recognizable: no generic random leaves substituting for all botanical families.

## Module shape
- `packages/renderer/src/layout.ts`: pure scene generation (geometry, layer ordering, deterministic placements).
- `packages/renderer/src/renderSvg.ts`: scene → **safe deterministic SVG string** with validated colors/asset paths, fixed viewBox `0 0 512 512`, no scripts/external href.
- `apps/web/src/components/PlantPreview.tsx`: SVG display wrapper; supports 64, 128, 512 pixel responsive presentation.
- Exports: browser SVG native; PNG via canvas using locally generated serialized SVG with same-origin/Blob URLs and graceful error; JSON genome export separate.

## Render stack, back to front
1. soft ground shadow; 2. pot rear; 3. rear leaves; 4. stem branches; 5. front leaves; 6. blooms/inflorescence; 7. pigment patterns + veins; 8. pot lip and highlights.

## Primitive asset contract
SVG primitives saved under `assets/species/<slug>/` as `.svg` source and optional typed path definitions. Each primitive declares:
```
{
 "assetId": "velvetleaf/leaf_lobed_v1",
 "category": "leaf",
 "anchor": [0.5, 0.92],
 "bounds": [0, 0, 100, 140],
 "paletteSlots": ["leafBase", "leafShade", "vein", "variegation"],
 "rendererVersion": 1
}
```
Each path has canonical coordinates and must be paintable using declared palette slots. No bitmap/image elements, filter-heavy effects, third-party assets, arbitrary scripts or CSS foreignObject.

## v1 authored assets
- Species `velvetleaf`: 3 silhouettes (oval, lobed, pointed), each with veins and highlights.
- 3 branch templates (compact, bushy, trailing) and stem primitive.
- 4 bloom variants / petals, 2 pots, ground shadow.
- 4 growth stages: seedling, juvenile, mature, flowering. Bloom graphics hidden until flowering stage. Stage affects geometry/counts, never genotype.
- 6 curated palettes, mapping allele phenotype to leaf colors. Variegation and marbling are **masks or path overlays**, not arbitrary giant color rectangles.
- Golden veins mutation renders as restrained warm-gold vein overlay.

## Scene and repeatability
- Layout output is a data tree: layer, assetId, x, y, rotation, scale, palette map, optional clipping/masking config.
- Use seeded RNG for branch/leaf placement, but do not randomize core silhouette beyond recognition.
- Bounds must never clip major leaves or pot. Maintain consistent scale across gallery cards.
- Render to SVG with stable ID namespace per preview (no collisions when multiple plants appear on the page). IDs derived from scene instance + fixed index; do not affect visual deterministic geometry.
- Avoid React rerender of all 100 plants when changing one editor control; memoize based on canonical render inputs.

## Acceptance visual QA
- At least 12 intentional variants (3 leaf shapes × 2 pigments × 2 patterns) clearly distinguishable; manually visually inspect using rendered browser screenshot.
- Large preview remains attractive at 512px, readable at 64px; avoid jagged joins and disproportionate pots.
- 100 small previews render without unacceptable jank on a normal desktop browser.
- Exported SVG opens in a standard SVG viewer without external assets; PNG export has correct alpha/background as selected.
- All graphics are original vector assets stored in the repository; document creator and licensing in `assets/README.md`.
