/**
 * Amazon Associates helpers. Import from server / admin / parent code only.
 * Kid-facing catalog payloads must go through `toKidToy` so `tag=` never ships.
 *
 * The public tag comes only from AMAZON_ASSOCIATES_TAG. There is no hard-coded
 * fallback. Stored dp URLs may still exist; render paths rebuild from ASIN + tag.
 */

const PRICE_KEY = /^(price|prices|listprice|saleprice|priceamount)$/i;
const PRICE_TEXT = /\$\s?\d/;
const AMAZON_STORE_URL = /https?:\/\/(?:www\.)?amazon\.com(?:[/?#]|$)/i;

function hostIs(host: string, name: string): boolean {
  return host === name || host.endsWith(`.${name}`);
}

/** Amazon CDNs, YouTube, analytics, tag managers, pixels, and Clerk. */
export function kidHostBlocked(host: string): boolean {
  const name = host.toLowerCase().replace(/\.$/, "");
  return (
    hostIs(name, "amazon.com") ||
    hostIs(name, "media-amazon.com") ||
    hostIs(name, "ssl-images-amazon.com") ||
    hostIs(name, "images-amazon.com") ||
    hostIs(name, "youtube.com") ||
    hostIs(name, "youtu.be") ||
    hostIs(name, "youtube-nocookie.com") ||
    hostIs(name, "ytimg.com") ||
    hostIs(name, "googletagmanager.com") ||
    hostIs(name, "google-analytics.com") ||
    hostIs(name, "googleadservices.com") ||
    hostIs(name, "doubleclick.net") ||
    hostIs(name, "facebook.net") ||
    hostIs(name, "facebook.com") ||
    hostIs(name, "clerk.com") ||
    hostIs(name, "clerk.dev") ||
    name.includes(".clerk.")
  );
}

export function isKidBlockedAsset(value: string): boolean {
  const found = value.match(/(?:https?:)?\/\/[^\s"'<>\\]+/gi);
  if (!found) return false;
  return found.some((raw) => {
    const withProtocol = raw.startsWith("//") ? `https:${raw}` : raw;
    try {
      return kidHostBlocked(new URL(withProtocol).hostname);
    } catch {
      return false;
    }
  });
}

export function getAffiliateTag(): string {
  return (process.env.AMAZON_ASSOCIATES_TAG || "").trim();
}

export function buildAffiliateUrl(asin: string): string {
  const clean = asin.trim().toUpperCase();
  const tag = getAffiliateTag();
  if (!tag) return `https://www.amazon.com/dp/${clean}`;
  return `https://www.amazon.com/dp/${clean}?tag=${encodeURIComponent(tag)}`;
}

/** Stored parent URL. No tracking id — Buy hrefs are built at render time. */
export function storedParentAffiliateUrl(asin: string): string {
  const clean = asin.trim().toUpperCase();
  return `https://www.amazon.com/dp/${clean}`;
}

/** Strip any tag from a stored Amazon link so it is not rendered as a Buy href. */
export function withStoredAssociatesTag(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("amazon.")) return url;
    parsed.searchParams.delete("tag");
    return parsed.toString();
  } catch {
    return url;
  }
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

function hasPriceKey(record: Record<string, unknown>): boolean {
  return Object.entries(record).some(([key, nested]) => {
    if (!PRICE_KEY.test(key)) return false;
    return nested !== undefined && nested !== null && nested !== "";
  });
}

/** Kid HTML/JSON must not ship Amazon PAC, prices, or brand-deal commerce. */
export function hasKidCommerceLeak(value: unknown): boolean {
  if (hasAffiliateLeak(value)) return true;
  if (typeof value === "string") {
    return (
      /brandDeal|brandAffiliate|Brand partner link|Buy on Amazon/i.test(value) ||
      PRICE_TEXT.test(value) ||
      AMAZON_STORE_URL.test(value) ||
      isKidBlockedAsset(value)
    );
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
    if (hasPriceKey(record)) return true;
    return Object.values(record).some(hasKidCommerceLeak);
  }
  return false;
}
