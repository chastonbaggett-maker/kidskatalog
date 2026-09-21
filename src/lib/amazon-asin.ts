const ASIN = "([A-Z0-9]{10})";
const PATH_ASIN = new RegExp(
  `/(?:dp|gp/product|gp/aw/d|gp/offer-listing|exec/obidos/ASIN|exec/obidos/tg/detail/-)/${ASIN}(?=[/?#&]|$)`,
  "i",
);
const QUERY_ASIN = new RegExp(
  `[?&](?:asin|creativeASIN)=${ASIN}(?=&|$)`,
  "i",
);

export function cleanAmazonToken(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/^[\s"'`<>]+|[\s"'`<>.,)]+$/g, "")
    .replace(/^href=/i, "")
    .trim();
}

function asAsin(value: string | undefined): string | null {
  if (!value || !/^[A-Z0-9]{10}$/i.test(value)) return null;
  return value.toUpperCase();
}

function asinInText(text: string): string | null {
  return asAsin(text.match(PATH_ASIN)?.[1]) || asAsin(text.match(QUERY_ASIN)?.[1]);
}

/** Pull a product ASIN from a bare id, /dp/ URL, or Associates link. */
export function parseAsin(url: string): string | null {
  const raw = cleanAmazonToken(url);
  if (!raw) return null;
  const bare = asAsin(raw);
  if (bare) return bare;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw.replace(/\+/g, "%20"));
  } catch {
    decoded = raw;
  }
  decoded = decoded.replace(/&amp;/gi, "&");

  const direct = asinInText(decoded);
  if (direct) return direct;

  const withScheme = /^https?:\/\//i.test(decoded) ? decoded : `https://${decoded}`;
  try {
    const parsed = new URL(withScheme);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("amazon.") && host !== "amzn.to" && host !== "a.co") {
      return null;
    }
    const fromUrl =
      asinInText(`${parsed.pathname}?${parsed.searchParams.toString()}`) ||
      asAsin(parsed.searchParams.get("asin") || undefined) ||
      asAsin(parsed.searchParams.get("creativeASIN") || undefined);
    if (fromUrl) return fromUrl;
    for (const value of parsed.searchParams.values()) {
      const nested = asinInText(value);
      if (nested) return nested;
    }
  } catch {
    return asinInText(decoded);
  }

  return null;
}

export function isShortAmazonLink(value: string): boolean {
  const token = cleanAmazonToken(value);
  if (!token || parseAsin(token)) return false;
  const withScheme = /^https?:\/\//i.test(token) ? token : `https://${token}`;
  try {
    const host = new URL(withScheme).hostname.toLowerCase();
    return (
      host === "amzn.to" ||
      host === "a.co" ||
      host.endsWith(".amzn.to") ||
      host.includes("amazon.")
    );
  } catch {
    return false;
  }
}

/** Split pasted bulk text into unique ASINs (max 100). */
export function parseBulkAmazonInputs(text: string): {
  asins: string[];
  invalid: string[];
  truncated: boolean;
} {
  const tokens = text
    .split(/[\s,;]+/)
    .map((token) => cleanAmazonToken(token))
    .filter(Boolean);

  const asins: string[] = [];
  const seen = new Set<string>();
  const invalid: string[] = [];
  let truncated = false;

  for (const token of tokens) {
    const asin = parseAsin(token);
    if (!asin) {
      invalid.push(token.slice(0, 120));
      continue;
    }
    if (seen.has(asin)) continue;
    if (asins.length >= 100) {
      truncated = true;
      break;
    }
    seen.add(asin);
    asins.push(asin);
  }

  return { asins, invalid, truncated };
}
