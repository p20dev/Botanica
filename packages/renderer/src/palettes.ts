import type { Phenotype } from "@botanica/genetics";
import type { Palette } from "./types.js";
export const palettes = {
  fern: {
    leafBase: "#537b49",
    leafShade: "#264a38",
    vein: "#b3c88a",
    variegation: "#e7dfad",
  },
  sage: {
    leafBase: "#698966",
    leafShade: "#315747",
    vein: "#bccc9f",
    variegation: "#eee6bb",
  },
  plum: {
    leafBase: "#865273",
    leafShade: "#422d4e",
    vein: "#ce96ad",
    variegation: "#e7cfb5",
  },
  aubergine: {
    leafBase: "#8c5977",
    leafShade: "#462f49",
    vein: "#d6a1b7",
    variegation: "#ebdca5",
  },
  copper: {
    leafBase: "#b56b58",
    leafShade: "#6c3c44",
    vein: "#e7b28c",
    variegation: "#f1d7a0",
  },
  citron: {
    leafBase: "#b7b95d",
    leafShade: "#657242",
    vein: "#f0df9b",
    variegation: "#faf0c3",
  },
} as const;
export function paletteFor(p: Phenotype): Palette {
  const name =
    p.pigment === "green"
      ? p.leafPattern === "solid"
        ? "fern"
        : "sage"
      : p.pigment === "purple"
        ? p.leafPattern === "solid"
          ? "plum"
          : "aubergine"
        : p.pigment === "red"
          ? "copper"
          : "citron";
  return {
    ...palettes[name],
    vein: p.mutations.includes("golden_veins")
      ? "#e4b84e"
      : palettes[name].vein,
    flower: {
      white: "#f3e9cf",
      pink: "#d797a1",
      blue: "#899dc4",
      red: "#bf605e",
    }[p.flowerColor],
  };
}
