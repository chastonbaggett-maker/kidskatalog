/**
 * Amazon Associates helpers. Import from server / admin / parent code only.
 * Kid-facing catalog payloads must go through `toKidToy` so `tag=` never ships.
 */

/** Stored on catalog/drafts for the later Associates flip. Never emitted on kid surfaces. */
export const FALLBACK_AFFILIATE_TAG = "kidskatalog-20";

export function getAffiliateTag(): string {
  return (
    process.env.AFFILIATE_TAG ||
    process.env.NEXT_PUBLIC_AFFILIATE_TAG ||
    FALLBACK_AFFILIATE_TAG
  );
}

export function buildAffiliateUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${getAffiliateTag()}`;
}

/**
 * Parent-Buy storage URL. Always uses `kidskatalog-20`.
 * Public Parent Buy hrefs go through `resolveParentBuy()` and use the same tag.
 */
export function storedParentAffiliateUrl(asin: string): string {
  const clean = asin.trim().toUpperCase();
  return `https://www.amazon.com/dp/${clean}?tag=${FALLBACK_AFFILIATE_TAG}`;
}

/** Rewrite a proposed Amazon link to the stored Associates tag. */
export function withStoredAssociatesTag(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("amazon.")) return url;
    parsed.searchParams.set("tag", FALLBACK_AFFILIATE_TAG);
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Parent Buy href that already carries the locked Associates tag. */
export function isAssociatesBuyHref(href: string): boolean {
  return (
    /amazon\./i.test(href) &&
    new RegExp(`[?&]tag=${FALLBACK_AFFILIATE_TAG}(?:&|$)`, "i").test(href)
  );
}

export function isAmazonProductUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("amazon.")) return false;
    return /\/(?:dp|gp\/product)\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function hasAffiliateLeak(value: unknown): boolean {
  if (typeof value === "string") {
    return /[?&]tag=/i.test(value) || isAmazonProductUrl(value);
  }
  if (Array.isArray(value)) return value.some(hasAffiliateLeak);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
      if (key === "affiliateUrl") return Boolean(nested);
      return hasAffiliateLeak(nested);
    });
  }
  return false;
}

/** Kid HTML/JSON must not ship Amazon PAC or brand-deal commerce. */
export function hasKidCommerceLeak(value: unknown): boolean {
  if (hasAffiliateLeak(value)) return true;
  if (typeof value === "string") {
    return /brandDeal|brandAffiliate|Brand partner link|Buy on Amazon/i.test(value);
  }
  if (Array.isArray(value)) return value.some(hasKidCommerceLeak);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (
      "brandDeal" in record ||
      "brandDealUrl" in record ||
      "brandPartner" in record ||
      "brandAffiliate" in record
    ) {
      return true;
    }
    return Object.values(record).some(hasKidCommerceLeak);
  }
  return false;
}
