import { isAmazonProductUrl } from "@/lib/affiliate";
import type { BrandAffiliate, Toy } from "@/types/toy";

export type BrandDealFields = Pick<
  Toy,
  "brandDeal" | "brandDealUrl" | "brandPartner" | "brandAffiliate"
>;

export type ResolvedBrandDeal = {
  partner: string;
  network: string;
  /** External partner URL, or null when the CTA is still a placeholder. */
  href: string | null;
  comingSoon: boolean;
  live: boolean;
};

/** Parent path reserved so `/p/deals` is never treated as a toy id. */
export const PARENT_BRAND_DEALS_ID = "deals";

/**
 * Demo seeds so Parent Mode can show the brand-deal surface before real
 * partners sign. Stored catalog values win when any brand field is already set.
 * These are placeholders — not live partners, not Amazon.
 */
export const SEEDED_BRAND_DEALS: Record<
  string,
  Pick<Toy, "brandDeal" | "brandDealUrl" | "brandPartner">
> = {
  "sky-rocket": {
    brandDeal: true,
    brandPartner: "Yoto-style",
  },
  "roar-rex": {
    brandDeal: true,
    brandPartner: "KiwiCo-style",
  },
};

/**
 * Overlay CTAs. `live: false` until a real non-Amazon URL is approved.
 * Stored `brandAffiliate` on a toy wins; otherwise these labels demo the UI.
 */
export const SEEDED_BRAND_AFFILIATES: Record<string, BrandAffiliate> = {
  "sky-rocket": {
    partner: "Yoto-style",
    network: "impact",
    url: "",
    live: false,
  },
  "roar-rex": {
    partner: "KiwiCo-style",
    network: "impact",
    url: "",
    live: false,
  },
};

export function normalizeBrandAffiliate(
  value: BrandAffiliate | undefined | null,
): BrandAffiliate | undefined {
  if (!value || typeof value !== "object") return undefined;
  const partner = value.partner?.trim() ?? "";
  const network = value.network?.trim() ?? "";
  const url = value.url?.trim() ?? "";
  const live = value.live === true;
  if (!partner && !network && !url && !live) return undefined;
  const next: BrandAffiliate = { live };
  if (partner) next.partner = partner;
  if (network) next.network = network;
  if (url) next.url = url;
  return next;
}

function hasStoredBrandAffiliate(toy: BrandDealFields): boolean {
  return Boolean(normalizeBrandAffiliate(toy.brandAffiliate));
}

export function hasBrandDeal(toy: BrandDealFields | undefined | null): boolean {
  if (!toy) return false;
  return Boolean(
    toy.brandDeal ||
      toy.brandDealUrl?.trim() ||
      toy.brandPartner?.trim() ||
      hasStoredBrandAffiliate(toy),
  );
}

function storedLegacyBrandFields(toy: BrandDealFields): boolean {
  return (
    toy.brandDeal !== undefined ||
    Boolean(toy.brandDealUrl?.trim()) ||
    Boolean(toy.brandPartner?.trim())
  );
}

export function applySeededBrandDeals(toys: Toy[]): Toy[] {
  return toys.map((toy) => {
    let next = toy;
    const affiliateSeed = SEEDED_BRAND_AFFILIATES[toy.id];
    if (affiliateSeed && !hasStoredBrandAffiliate(toy)) {
      next = { ...next, brandAffiliate: { ...affiliateSeed, live: false } };
    }
    const legacySeed = SEEDED_BRAND_DEALS[toy.id];
    if (legacySeed && !storedLegacyBrandFields(toy)) {
      next = { ...next, ...legacySeed };
    }
    return next;
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

export function resolveBrandDeal(
  toy: BrandDealFields & { name?: string },
): ResolvedBrandDeal | null {
  if (!hasBrandDeal(toy)) return null;
  const affiliate = normalizeBrandAffiliate(toy.brandAffiliate);
  const partner =
    affiliate?.partner?.trim() || toy.brandPartner?.trim() || "Brand partner";
  const network = affiliate?.network?.trim() || "";
  const live = affiliate?.live === true;
  const rawUrl = (affiliate?.url ?? toy.brandDealUrl ?? "").trim();
  const href = live ? rejectAmazonPartnerUrl(rawUrl) : null;
  return {
    partner,
    network,
    href,
    comingSoon: !href,
    live: Boolean(href),
  };
}

export function getBrandDealToys(toys: Toy[]): Toy[] {
  return toys.filter((toy) => hasBrandDeal(toy));
}
