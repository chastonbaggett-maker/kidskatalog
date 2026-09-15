import type { CatalogPageResult } from "@/lib/catalog-query";
import type { Toy } from "@/types/toy";

/** Kid-facing toy: commerce fields stripped (Amazon + brand deals). */
export type KidToy = Omit<
  Toy,
  "affiliateUrl" | "brandDeal" | "brandDealUrl" | "brandPartner" | "brandAffiliate"
>;

const KID_COMMERCE_KEYS = [
  "affiliateUrl",
  "brandDeal",
  "brandDealUrl",
  "brandPartner",
  "brandAffiliate",
] as const;

export function toKidToy(toy: Toy): KidToy {
  const {
    affiliateUrl: _affiliateUrl,
    brandDeal: _brandDeal,
    brandDealUrl: _brandDealUrl,
    brandPartner: _brandPartner,
    brandAffiliate: _brandAffiliate,
    ...rest
  } = toy;
  return rest;
}

export function toKidToys(toys: Toy[]): KidToy[] {
  return toys.map(toKidToy);
}

/** Parent client payload: drop Amazon URLs, keep brand-deal fields. */
export function toParentToy(toy: Toy): Omit<Toy, "affiliateUrl"> {
  const { affiliateUrl: _affiliateUrl, ...rest } = toy;
  return rest;
}

export function toParentToys(toys: Toy[]): Array<Omit<Toy, "affiliateUrl">> {
  return toys.map(toParentToy);
}

export function toKidCatalogPage(page: CatalogPageResult): CatalogPageResult {
  return {
    ...page,
    toys: toKidToys(page.toys) as Toy[],
  };
}

export function hasKidCommerceFields(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasKidCommerceFields);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  for (const key of KID_COMMERCE_KEYS) {
    if (key in record && record[key] !== undefined) return true;
  }
  return Object.values(record).some(hasKidCommerceFields);
}
