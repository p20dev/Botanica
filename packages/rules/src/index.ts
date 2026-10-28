export const RARITY_POLICY_VERSION = 1 as const;
export const rarityTiers = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
  "Mythic",
] as const;
export type RarityTier = (typeof rarityTiers)[number];
export interface RarityPolicy {
  unusual: Record<string, readonly string[]>;
  patterns: readonly string[];
  combination: Record<string, string>;
}
export function scoreRarity(
  traits: Record<string, string>,
  mutations: readonly string[],
  policy: RarityPolicy,
) {
  const reasons: { label: string; points: number }[] = [];
  const unusual = Object.entries(policy.unusual).filter(([locus, values]) =>
    values.includes(traits[locus]),
  );
  for (const [locus] of unusual.slice(0, 2))
    reasons.push({ label: "Unusual recessive " + locus, points: 20 });
  if (policy.patterns.includes(traits.leafPattern))
    reasons.push({ label: "Patterned foliage", points: 20 });
  if (mutations.includes("golden_veins"))
    reasons.push({ label: "Golden veins", points: 25 });
  if (
    Object.entries(policy.combination).every(
      ([locus, value]) => traits[locus] === value,
    )
  )
    reasons.push({ label: "Uncommon trait combination", points: 15 });
  const score = Math.min(
    100,
    reasons.reduce((sum, r) => sum + r.points, 0),
  );
  const tier: RarityTier =
    score >= 85
      ? "Mythic"
      : score >= 65
        ? "Legendary"
        : score >= 45
          ? "Epic"
          : score >= 25
            ? "Rare"
            : score >= 10
              ? "Uncommon"
              : "Common";
  return { score, tier, rarityPolicyVersion: RARITY_POLICY_VERSION, reasons };
}
