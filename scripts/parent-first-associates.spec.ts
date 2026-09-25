import { test, expect } from "@playwright/test";
import { getAffiliateTag, hasKidCommerceLeak, storedParentAffiliateUrl } from "../src/lib/affiliate";
import { resolveParentBuy } from "../src/lib/associates";
import {
  canonicalOriginForHost,
  kidHomeRewrite,
  legacyPlaceholderDestination,
  parentGateRewrite,
  safeParentReturnPath,
} from "../src/lib/request-routing";

test("affiliate tag comes only from AMAZON_ASSOCIATES_TAG", () => {
  const prev = process.env.AMAZON_ASSOCIATES_TAG;
  try {
    delete process.env.AMAZON_ASSOCIATES_TAG;
    expect(getAffiliateTag()).toBe("");
    expect(storedParentAffiliateUrl("b07ynlxj4l")).toBe("https://www.amazon.com/dp/B07YNLXJ4L");
    expect(storedParentAffiliateUrl("B07YNLXJ4L")).not.toContain("tag=");
    const plain = resolveParentBuy("sky-rocket", storedParentAffiliateUrl("B07YNLXJ4L"));
    expect(plain.href).toBe("https://www.amazon.com/dp/B07YNLXJ4L");

    process.env.AMAZON_ASSOCIATES_TAG = "shelf-test-20";
    const tagged = resolveParentBuy(
      "sky-rocket",
      "https://www.amazon.com/dp/B07YNLXJ4L?tag=other-20",
    );
    expect(tagged.href).toBe("https://www.amazon.com/dp/B07YNLXJ4L?tag=shelf-test-20");
    expect(tagged.href).not.toContain("other-20");
  } finally {
    if (prev === undefined) delete process.env.AMAZON_ASSOCIATES_TAG;
    else process.env.AMAZON_ASSOCIATES_TAG = prev;
  }
});

test("host redirects skip preview vercel.app hosts", () => {
  expect(canonicalOriginForHost("www.kidskatalog.com")).toBe("https://kidskatalog.com");
  expect(canonicalOriginForHost("WWW.KidsKatalog.com:443")).toBe("https://kidskatalog.com");
  expect(canonicalOriginForHost("kidskatalog.vercel.app")).toBe("https://kidskatalog.com");
  expect(canonicalOriginForHost("kidskatalog.com")).toBeNull();
  expect(canonicalOriginForHost("kidskatalog-git-cursor-parent.vercel.app")).toBeNull();
  expect(canonicalOriginForHost("localhost:3456")).toBeNull();
});

test("placeholder routes redirect to the toy or home", () => {
  expect(legacyPlaceholderDestination("/p/buy-placeholder", "sky-rocket")).toBe(
    "/p/sky-rocket",
  );
  expect(legacyPlaceholderDestination("/api/buy-placeholder", "sky-rocket")).toBe(
    "/p/sky-rocket",
  );
  expect(legacyPlaceholderDestination("/api/buy-placeholder", "")).toBe("/");
  expect(legacyPlaceholderDestination("/api/buy-placeholder", "unknown")).toBe("/");
  expect(legacyPlaceholderDestination("/shop", "sky-rocket")).toBeNull();
});

test("kid mode rewrite rules", () => {
  expect(kidHomeRewrite("/", "kid")).toBeTruthy();
  expect(kidHomeRewrite("/", "parent")).toBeFalsy();
  expect(kidHomeRewrite("/shop", "kid")).toBeFalsy();
  expect(parentGateRewrite("/p/sky-rocket", "kid", undefined)).toBeTruthy();
  expect(parentGateRewrite("/p/sky-rocket", "kid", "1")).toBeFalsy();
  expect(parentGateRewrite("/p/sky-rocket", "parent", undefined)).toBeFalsy();
  expect(parentGateRewrite("/api/parent/buy-urls", "kid", undefined)).toBeFalsy();
  expect(safeParentReturnPath("/p/sky-rocket?ids=a")).toBe("/p/sky-rocket?ids=a");
  expect(safeParentReturnPath("https://evil.example")).toBe("/");
});

test("hasKidCommerceLeak flags prices and amazon.com store URLs", () => {
  expect(hasKidCommerceLeak({ price: 4 })).toBeTruthy();
  expect(hasKidCommerceLeak("$9.99")).toBeTruthy();
  expect(hasKidCommerceLeak("https://amazon.com/dp/B000000000")).toBeTruthy();
  expect(hasKidCommerceLeak({ blurb: "Soft plush." })).toBeFalsy();
});
