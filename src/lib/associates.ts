import { getAffiliateTag } from "@/lib/affiliate";
import { parseAsin } from "@/lib/amazon-import";

export type ParentBuyMode = "placeholder" | "associates";

export type ParentBuyTarget = {
  href: string;
  mode: ParentBuyMode;
};

/**
 * Public Buy links use AMAZON_ASSOCIATES_TAG only.
 * AMAZON_ASSOCIATES_LIVE is ignored — there is no placeholder mode.
 */
export function getAssociatesTag(): string | null {
  const tag = getAffiliateTag();
  return tag || null;
}

export function buildSpecialLink(asin: string, tag: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${encodeURIComponent(tag)}`;
}

/**
 * Render-time Buy href. Parses ASIN from storage and rebuilds the URL.
 * Stored affiliateUrl values are never returned as the href.
 */
export function resolveParentBuy(
  toyId: string,
  affiliateUrl?: string,
): ParentBuyTarget {
  const asin = affiliateUrl ? parseAsin(affiliateUrl) : null;
  const tag = getAssociatesTag();
  if (asin && tag) {
    return { href: buildSpecialLink(asin, tag), mode: "associates" };
  }
  if (asin) {
    return { href: `https://www.amazon.com/dp/${asin}`, mode: "associates" };
  }
  return { href: `/p/${encodeURIComponent(toyId)}`, mode: "associates" };
}

export function resolveParentBuyUrls(
  toys: Array<{ id: string; affiliateUrl?: string }>,
): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const toy of toys) {
    urls[toy.id] = resolveParentBuy(toy.id, toy.affiliateUrl).href;
  }
  return urls;
}
