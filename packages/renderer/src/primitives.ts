import type { AssetId } from "./types.js";
export interface Primitive {
  assetId: string;
  category: "leaf" | "branch" | "stem" | "bloom" | "pot" | "shadow";
  anchor: readonly [number, number];
  bounds: readonly [number, number, number, number];
  paletteSlots: readonly string[];
  rendererVersion: 1;
  outline: string;
  shade?: string;
  highlight?: string;
  veins?: string;
}
const leaf = (
  id: string,
  outline: string,
  shade: string,
  veins: string,
  highlight: string,
): Primitive => ({
  assetId: "velvetleaf/" + id + "_v1",
  category: "leaf",
  anchor: [50, 128],
  bounds: [0, 0, 100, 140],
  paletteSlots: ["leafBase", "leafShade", "vein", "variegation"],
  rendererVersion: 1,
  outline,
  shade,
  veins,
  highlight,
});
const branch = (id: string, outline: string): Primitive => ({
  assetId: "velvetleaf/" + id + "_v1",
  category: "branch",
  anchor: [0, 0],
  bounds: [0, 0, 512, 512],
  paletteSlots: ["leafShade", "vein"],
  rendererVersion: 1,
  outline,
});
const bloom = (id: string, outline: string): Primitive => ({
  assetId: "velvetleaf/" + id + "_v1",
  category: "bloom",
  anchor: [25, 25],
  bounds: [0, 0, 50, 50],
  paletteSlots: ["flower", "variegation"],
  rendererVersion: 1,
  outline,
});
const pot = (
  id: string,
  outline: string,
  shade: string,
  highlight: string,
): Primitive => ({
  assetId: "velvetleaf/" + id + "_v1",
  category: "pot",
  anchor: [0, 0],
  bounds: [0, 0, 512, 512],
  paletteSlots: [],
  rendererVersion: 1,
  outline,
  shade,
  highlight,
});
export const primitives: Record<AssetId, Primitive> = {
  leaf_oval: leaf(
    "leaf_oval",
    "M50 128 C34 118 19 109 13 91 C5 69 13 39 27 23 Q40 9 50 7 Q75 17 87 46 C101 80 82 113 50 128Z",
    "M50 128 C71 99 77 69 65 24 Q91 48 89 73 Q91 104 50 128Z",
    "M50 126 Q45 70 50 16 M48 109 Q30 95 23 78 M47 91 Q28 74 26 53 M47 70 L34 37 M49 105 Q70 89 78 70 M48 82 Q66 65 69 44 M49 58 L58 29",
    "M25 72 Q22 47 42 28 Q30 47 32 67Z",
  ),
  leaf_lobed: leaf(
    "leaf_lobed",
    "M50 130 Q33 123 29 112 L14 112 L17 98 Q5 93 7 80 L14 75 L6 61 L19 57 L16 43 L29 43 L27 29 L40 31 L50 7 L60 31 L73 29 L71 43 L84 43 L81 57 L94 61 L86 75 Q97 91 83 98 L86 112 L71 112 Q67 123 50 130Z",
    "M50 130 Q61 93 57 44 L50 7 L60 31 L73 29 L71 43 L84 43 L81 57 L94 61 L86 75 Q97 91 83 98 L86 112 L71 112 Q67 123 50 130Z",
    "M50 127 L50 19 M50 113 L22 105 M50 96 L17 83 M50 78 L20 62 M50 60 L30 43 M50 113 L78 105 M50 96 L83 83 M50 78 L80 62 M50 60 L70 43",
    "M23 79 L29 66 L35 83 L30 99Z",
  ),
  leaf_pointed: leaf(
    "leaf_pointed",
    "M50 131 C24 111 14 88 22 64 Q31 36 50 4 Q66 34 78 64 C90 95 69 119 50 131Z",
    "M50 131 Q66 97 60 58 L50 4 Q66 34 78 64 C90 95 69 119 50 131Z",
    "M50 127 Q45 71 50 15 M48 109 L30 87 M47 91 L32 65 M47 71 L39 43 M49 107 L70 83 M48 87 L68 62 M49 65 L59 39",
    "M30 83 Q28 61 45 33 Q35 58 37 77Z",
  ),
  branch_compact: branch(
    "branch_compact",
    "M256 394 Q249 310 252 195 M253 348 Q219 344 211 325 M254 326 Q289 322 299 304 M253 295 Q226 286 223 268 M253 270 Q279 257 285 242 M252 242 Q234 223 239 212",
  ),
  branch_bushy: branch(
    "branch_bushy",
    "M256 394 Q246 282 260 164 M252 354 Q212 350 188 319 M254 331 Q296 327 325 299 M252 297 Q223 284 207 254 M255 268 Q293 253 311 222 M256 232 Q233 204 239 179 M258 202 Q277 178 278 156",
  ),
  branch_trailing: branch(
    "branch_trailing",
    "M256 394 Q249 298 259 211 M253 348 C219 297 163 318 170 378 M254 347 C304 291 346 322 342 380 M255 300 Q222 275 209 263 M256 271 Q291 255 303 243 M257 239 L241 212",
  ),
  stem: { ...branch("stem", "M256 395 Q251 368 253 342"), category: "stem" },
  flower_stalk: {
    assetId: "velvetleaf/flower_stalk_v1",
    category: "stem",
    anchor: [0, 0],
    bounds: [-10, -100, 20, 100],
    paletteSlots: ["leafShade"],
    rendererVersion: 1,
    outline: "M0 0 Q-8-50 0-100",
  },
  bloom_round: bloom(
    "bloom_round",
    "M25 25 C5 28 3 10 15 9 Q22 8 25 20 C22 0 40 0 41 12 Q42 21 29 24 C49 16 56 31 43 37 Q33 40 28 28 C38 46 22 55 16 43 Q12 35 22 28 C6 42 -2 27 10 22 Q17 19 25 25Z",
  ),
  bloom_star: bloom(
    "bloom_star",
    "M25 3 L31 18 L47 14 L37 28 L47 42 L30 37 L24 49 L20 35 L3 39 L13 25 L3 12 L20 17Z",
  ),
  bloom_cup: bloom(
    "bloom_cup",
    "M25 43 C5 37 3 20 10 11 Q20 9 25 20 Q29 6 39 10 C50 23 42 37 25 43Z",
  ),
  bloom_double: bloom(
    "bloom_double",
    "M25 9 Q35 0 39 12 Q52 12 44 26 Q53 38 39 40 Q35 53 25 43 Q12 52 10 39 Q-1 33 8 24 Q0 11 14 11 Q18 0 25 9Z",
  ),
  pot_terracotta: pot(
    "pot_terracotta",
    "M195 389 L207 468 Q256 487 305 468 L317 389Z",
    "M285 396 L278 477 Q297 474 305 468 L317 389Z",
    "M208 404 L218 461 Q230 466 240 466 L231 405Z",
  ),
  pot_ceramic: pot(
    "pot_ceramic",
    "M195 390 Q188 458 215 472 Q256 485 297 472 Q322 457 317 390Z",
    "M292 398 Q300 448 281 477 Q308 474 314 452 Q321 433 317 390Z",
    "M209 408 Q205 441 218 459 L230 463 Q219 436 224 409Z",
  ),
  shadow: {
    assetId: "velvetleaf/shadow_v1",
    category: "shadow",
    anchor: [0, 0],
    bounds: [0, 0, 512, 512],
    paletteSlots: [],
    rendererVersion: 1,
    outline: "M156 479 C156 462 356 462 356 479 C356 495 156 495 156 479Z",
  },
};
export const variegationPath =
  "M50 8 Q28 41 35 68 Q41 90 22 109 L42 125 Q61 96 50 71 Q41 44 62 22Z M77 45 Q65 65 73 87 L88 74Z";
export const marblePath =
  "M9 54 Q32 26 53 54 T92 62 L93 78 Q66 87 49 69 T10 76Z M14 96 Q32 78 50 99 T83 101 L70 115 Q48 111 38 105 T22 113Z M34 28 Q49 15 67 30 L65 37 Q48 28 38 41Z";
