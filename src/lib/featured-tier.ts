import type { Toy } from "@/types/toy";

/** How often a toy is pushed toward the front of browse/pile shuffles. */
export type FeaturedTier = 0 | 1 | 2 | 3;

export const FEATURED_TIER_OPTIONS: {
  value: FeaturedTier;
  label: string;
  hint: string;
}[] = [
  { value: 0, label: "Normal", hint: "Standard rotation" },
  { value: 1, label: "Boost", hint: "Shows up a bit more" },
  { value: 2, label: "Featured", hint: "Shows up often" },
  { value: 3, label: "Spotlight", hint: "Shows up the most" },
];

/** Relative shuffle weights — higher = earlier / more often in view. */
const TIER_WEIGHT: Record<FeaturedTier, number> = {
  0: 1,
  1: 2.5,
  2: 5,
  3: 10,
};

export function normalizeFeaturedTier(value: unknown): FeaturedTier {
  const n = typeof value === "number" ? value : Number(value);
  if (n === 1 || n === 2 || n === 3) return n;
  return 0;
}

/** Resolve tier from new field, falling back to legacy `featured: true` → tier 2. */
export function resolveFeaturedTier(
  toy: Pick<Toy, "featured" | "featuredTier">,
): FeaturedTier {
  if (toy.featuredTier != null) return normalizeFeaturedTier(toy.featuredTier);
  if (toy.featured) return 2;
  return 0;
}

export function featuredTierWeight(tier: FeaturedTier): number {
  return TIER_WEIGHT[tier] ?? 1;
}

export function featuredTierLabel(tier: FeaturedTier): string {
  return FEATURED_TIER_OPTIONS.find((o) => o.value === tier)?.label ?? "Normal";
}
