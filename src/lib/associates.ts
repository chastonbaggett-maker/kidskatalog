import { FALLBACK_AFFILIATE_TAG, isAssociatesBuyHref } from "@/lib/affiliate";
import { parseAsin } from "@/lib/amazon-import";
import { parentBuyPlaceholderPath } from "@/lib/parent-paths";

export type ParentBuyMode = "placeholder" | "associates";

export type ParentBuyTarget = {
  href: string;
  mode: ParentBuyMode;
};

/**
 * Parent Mode Buy always uses the locked Associates tag.
 * `AMAZON_ASSOCIATES_LIVE` / `AMAZON_ASSOCIATES_TAG` no longer gate the href.
 */
export function isAssociatesLive(): boolean {
  return true;
}

export function getAssociatesTag(): string {
  return FALLBACK_AFFILIATE_TAG;
}

export function buildSpecialLink(asin: string, tag: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${tag}`;
}

function specialLinkFromStored(affiliateUrl: string | undefined, tag: string): string | null {
  if (!affiliateUrl) return null;
  const asin = parseAsin(affiliateUrl);
  if (asin) return buildSpecialLink(asin, tag);
  try {
    const parsed = new URL(affiliateUrl);
    if (!parsed.hostname.includes("amazon.")) return null;
    parsed.searchParams.set("tag", tag);
    return parsed.toString();
  } catch {
    return null;
  }
}

function isTaggedOrAmazonBuyHref(href: string): boolean {
  return /[?&]tag=/i.test(href) || /amazon\.[^/]*\/(?:dp|gp\/product)\//i.test(href);
}

export { isAssociatesBuyHref } from "@/lib/affiliate";

/**
 * Single Parent Mode Buy href.
 * Toys with an ASIN always open https://www.amazon.com/dp/{ASIN}?tag=kidskatalog-20.
 * A missing ASIN stays on the in-app placeholder (no tag to attach).
 */
export function resolveParentBuy(
  toyId: string,
  affiliateUrl?: string,
): ParentBuyTarget {
  const href = specialLinkFromStored(affiliateUrl, FALLBACK_AFFILIATE_TAG);
  if (href && isAssociatesBuyHref(href)) {
    return { href, mode: "associates" };
  }
  const placeholder = parentBuyPlaceholderPath(toyId);
  if (isTaggedOrAmazonBuyHref(placeholder)) {
    return { href: `/p/buy-placeholder?toy=${encodeURIComponent(toyId)}`, mode: "placeholder" };
  }
  return { href: placeholder, mode: "placeholder" };
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
