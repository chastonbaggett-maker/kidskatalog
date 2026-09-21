import "server-only";
import { isShortAmazonLink, parseAsin } from "@/lib/amazon-asin";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function absoluteUrl(value: string): string | null {
  const token = value.trim();
  if (!token) return null;
  const withScheme = /^https?:\/\//i.test(token) ? token : `https://${token}`;
  try {
    const parsed = new URL(withScheme);
    const host = parsed.hostname.toLowerCase();
    const allowed =
      host === "amzn.to" ||
      host === "a.co" ||
      host.endsWith(".amzn.to") ||
      host.includes("amazon.");
    return allowed ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Read an ASIN from a full Associates URL, or follow amzn.to / a.co
 * redirects until the product id shows up.
 */
export async function resolveAmazonAsin(input: string): Promise<string | null> {
  const direct = parseAsin(input);
  if (direct) return direct;
  if (!isShortAmazonLink(input)) return null;

  let current = absoluteUrl(input);
  if (!current) return null;

  for (let hop = 0; hop < 5; hop += 1) {
    let res: Response;
    try {
      res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        cache: "no-store",
      });
    } catch {
      return null;
    }

    const location = res.headers.get("location");
    if (location && res.status >= 300 && res.status < 400) {
      const next = absoluteUrl(new URL(location, current).toString());
      const asin = parseAsin(location) || (next ? parseAsin(next) : null);
      if (asin) return asin;
      if (!next || next === current) return null;
      current = next;
      continue;
    }

    return parseAsin(res.url || current);
  }

  return parseAsin(current);
}
