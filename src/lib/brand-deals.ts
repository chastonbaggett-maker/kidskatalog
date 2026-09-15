import { isAmazonProductUrl } from "@/lib/affiliate";
import type { Toy } from "@/types/toy";

export type BrandDealFields = Pick<Toy, "brandDeal" | "brandDealUrl" | "brandPartner">;

export type ResolvedBrandDeal = {
  partner: string;
  /** External partner URL, or null when the CTA is still a placeholder. */
  href: string | null;
  comingSoon: boolean;
};

/** Parent path reserved so `/p/deals` is never treated as a toy id. */
export const PARENT_BRAND_DEALS_ID = "deals";

/**
 * Demo seeds so Parent Mode can show the brand-deal surface before real
 * partners sign. Stored catalog values win when any brand field is already set.
 * These are placeholders — not live partners, not Amazon.
 */
export const SEEDED_BRAND_DEALS: Record<string, BrandDealFields> = {
  "sky-rocket": {
    brandDeal: true,
    brandPartner: "Example Rocket Co.",
  },
  "roar-rex": {
    brandDeal: true,
    brandPartner: "Example Dino Studio",
    brandDealUrl: "https://example.com/kidskatalog-brand-deal-placeholder",
  },
};

export function hasBrandDeal(toy: BrandDealFields | undefined | null): boolean {
  if (!toy) return false;
  return Boolean(toy.brandDeal || toy.brandDealUrl?.trim() || toy.brandPartner?.trim());
}

function storedBrandFields(toy: BrandDealFields): boolean {
  return (
    toy.brandDeal !== undefined ||
    Boolean(toy.brandDealUrl?.trim()) ||
    Boolean(toy.brandPartner?.trim())
  );
}

export function applySeededBrandDeals(toys: Toy[]): Toy[] {
  return toys.map((toy) => {
    const seed = SEEDED_BRAND_DEALS[toy.id];
    if (!seed || storedBrandFields(toy)) return toy;
    return { ...toy, ...seed };
  });
}

function rejectAmazonPartnerUrl(url: string): string | null {
  const href = url.trim();
  if (!href) return null;
  if (isAmazonProductUrl(href) || /[?&]tag=/i.test(href)) return null;
  try {
    const parsed = new URL(href);
    if (parsed.hostname.includes("amazon.")) return null;
    return href;
  } catch {
    return null;
  }
}

export function resolveBrandDeal(toy: BrandDealFields & { name?: string }): ResolvedBrandDeal | null {
  if (!hasBrandDeal(toy)) return null;
  const href = rejectAmazonPartnerUrl(toy.brandDealUrl ?? "");
  return {
    partner: toy.brandPartner?.trim() || "Brand partner",
    href,
    comingSoon: !href,
  };
}

export function getBrandDealToys(toys: Toy[]): Toy[] {
  return toys.filter((toy) => hasBrandDeal(toy));
}
