import { parseAsin } from "@/lib/amazon-import";
import { parentBuyPlaceholderPath } from "@/lib/parent-paths";

export type ParentBuyMode = "placeholder" | "associates";

export type ParentBuyTarget = {
  href: string;
  mode: ParentBuyMode;
};

/**
 * Live Associates Special Links stay OFF until Chaston flips this.
 * Swap later: set AMAZON_ASSOCIATES_LIVE=true and AMAZON_ASSOCIATES_TAG.
 * Per-toy `affiliateUrl` is used only when live.
 */
export function isAssociatesLive(): boolean {
  const flag = (process.env.AMAZON_ASSOCIATES_LIVE || "").trim().toLowerCase();
  if (flag !== "1" && flag !== "true" && flag !== "yes") return false;
  return Boolean(getAssociatesTag());
}

export function getAssociatesTag(): string | null {
  const tag = (process.env.AMAZON_ASSOCIATES_TAG || "").trim();
  return tag || null;
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

/** Single swap point for Parent Mode Buy. */
export function resolveParentBuy(
  toyId: string,
  affiliateUrl?: string,
): ParentBuyTarget {
  if (isAssociatesLive()) {
    const tag = getAssociatesTag();
    if (tag) {
      const href = specialLinkFromStored(affiliateUrl, tag);
      if (href) return { href, mode: "associates" };
    }
  }
  return { href: parentBuyPlaceholderPath(toyId), mode: "placeholder" };
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
