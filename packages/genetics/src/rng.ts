import { seedSchema } from "./catalog.js";
/** Mulberry32 v1: signed int32 seed bits; uint32 add/imul/xor; [0,1) output. */
export function createRng(seed: number) {
  let state = seedSchema.parse(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
