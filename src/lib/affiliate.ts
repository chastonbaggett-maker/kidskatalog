/**
 * Amazon Associates helpers. Import from server / admin / parent code only.
 * Kid-facing catalog payloads must go through `toKidToy` so `tag=` never ships.
 */

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
