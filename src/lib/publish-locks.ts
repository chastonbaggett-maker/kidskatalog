import { hasAffiliateLeak, hasKidCommerceLeak, isAmazonProductUrl } from "@/lib/affiliate";
import { isAssociatesLive, resolveParentBuy } from "@/lib/associates";
import { resolveBrandDeal } from "@/lib/brand-deals";
import {
  hasKidCommerceFields,
  toKidToy,
  type KidToy,
} from "@/lib/kid-surface";
import type { Toy } from "@/types/toy";

const AFFILIATE_TAG_RE = /[?&]tag=/i;
const AMAZON_DP_RE = /amazon\.[^"'<\s]+\/(?:dp|gp\/product)\//i;

export type PublishLockError = {
  ok: false;
  error: string;
};

export type PublishLockOk = {
  ok: true;
  kid: KidToy;
};

/**
 * Counsel hard locks for the Submit Approval publish path.
 * 1) Parent Buy href never carries tag= unless AMAZON_ASSOCIATES_LIVE.
 * 2) Kid projection never includes tag=, affiliateUrl, or Amazon Buy UI fields.
 * 3) Brand-deal CTA stays a separate URL from Amazon Buy.
 */
export function assertLiveToyPublishable(toy: Toy): PublishLockOk | PublishLockError {
  if (!toy.id || !toy.name) {
    return { ok: false, error: "Toy is missing id or name" };
  }
  if (!toy.affiliateUrl) {
    return { ok: false, error: "Toy is missing stored affiliateUrl for Parent Buy" };
  }

  const kid = toKidToy(toy);
  if (hasKidCommerceFields(kid) || hasKidCommerceLeak(kid) || hasAffiliateLeak(kid)) {
    return { ok: false, error: "Kid projection leaked commerce fields" };
  }

  const kidJson = JSON.stringify(kid);
  if (AFFILIATE_TAG_RE.test(kidJson) || AMAZON_DP_RE.test(kidJson)) {
    return { ok: false, error: "Kid projection leaked tag= or Amazon Buy URL" };
  }
  if ("affiliateUrl" in kid || "brandAffiliate" in kid || "brandDealUrl" in kid) {
    return { ok: false, error: "Kid projection still carries parent-only keys" };
  }

  const buy = resolveParentBuy(toy.id, toy.affiliateUrl);
  if (!isAssociatesLive()) {
    if (buy.mode !== "placeholder") {
      return { ok: false, error: "Parent Buy must stay on the placeholder while Associates is off" };
    }
    if (AFFILIATE_TAG_RE.test(buy.href) || isAmazonProductUrl(buy.href) || AMAZON_DP_RE.test(buy.href)) {
      return {
        ok: false,
        error: "Parent Buy leaked tag= or amazon.com/dp while AMAZON_ASSOCIATES_LIVE is off",
      };
    }
  } else if (buy.mode === "associates") {
    if (!AFFILIATE_TAG_RE.test(buy.href)) {
      return { ok: false, error: "Live Associates Buy is missing tag=" };
    }
  }

  const brand = resolveBrandDeal(toy);
  if (brand?.href) {
    if (brand.href === toy.affiliateUrl || brand.href === buy.href) {
      return { ok: false, error: "Brand deal must be a separate tap from Amazon Buy" };
    }
    if (isAmazonProductUrl(brand.href) || AFFILIATE_TAG_RE.test(brand.href)) {
      return { ok: false, error: "Brand deal CTA cannot be an Amazon Associates link" };
    }
  }

  return { ok: true, kid };
}

export function kidJsonLooksClean(value: unknown): boolean {
  const json = JSON.stringify(value);
  if (AFFILIATE_TAG_RE.test(json) || AMAZON_DP_RE.test(json)) return false;
  return !hasKidCommerceLeak(value) && !hasKidCommerceFields(value);
}

export function htmlLooksKidClean(html: string): boolean {
  if (AFFILIATE_TAG_RE.test(html) || AMAZON_DP_RE.test(html)) return false;
  if (/Buy on Amazon/i.test(html)) return false;
  if (/Brand partner link/i.test(html)) return false;
  return true;
}
