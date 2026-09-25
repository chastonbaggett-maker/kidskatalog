import { test, expect } from "@playwright/test";
import { getAffiliateTag, hasKidCommerceLeak, storedParentAffiliateUrl } from "../src/lib/affiliate";
import { hostSelectsKids, resolveDeploymentMode } from "../src/lib/deployment";
import { resolveParentBuy } from "../src/lib/associates";
import { kidNameTileSrc, toKidToy, toParentToy } from "../src/lib/kid-surface";
import type { Toy } from "../src/types/toy";
import {
  canonicalOriginForHost,
  kidHomeRewrite,
  legacyPlaceholderDestination,
  isKidsSurfacePath,
  isParentSurfacePath,
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

test("deployment mode keeps kidskatalog.com on the parent site", () => {
  expect(hostSelectsKids("kidskatalog.com")).toBeFalsy();
  expect(hostSelectsKids("www.kidskatalog.com")).toBeFalsy();
  expect(hostSelectsKids("kidskatalog-abc.vercel.app")).toBeFalsy();
  expect(hostSelectsKids("kidskatalog.app")).toBeTruthy();
  expect(hostSelectsKids("www.kidskatalog.app")).toBeTruthy();
  expect(hostSelectsKids("kids.localhost")).toBeTruthy();
  expect(hostSelectsKids("kids-preview.vercel.app")).toBeTruthy();
  expect(resolveDeploymentMode({ siteMode: "parent", host: "kidskatalog.app" })).toBe("parent");
  expect(resolveDeploymentMode({ siteMode: "kids", host: "kidskatalog.com" })).toBe("kids");
  expect(resolveDeploymentMode({ siteMode: "", host: "localhost" })).toBe("parent");
  expect(resolveDeploymentMode({ siteMode: "", host: "kids.localhost:3456" })).toBe("kids");
  expect(isKidsSurfacePath("/shop")).toBeTruthy();
  expect(isKidsSurfacePath("/toy/sky-rocket")).toBeTruthy();
  expect(isKidsSurfacePath("/p/sky-rocket")).toBeFalsy();
  expect(isParentSurfacePath("/p/sky-rocket")).toBeTruthy();
  expect(isParentSurfacePath("/claim/ABCD2345")).toBeTruthy();
  expect(isParentSurfacePath("/shop")).toBeFalsy();
});

test("hasKidCommerceLeak flags prices, trackers, and Amazon media hosts", () => {
  expect(hasKidCommerceLeak({ price: 4 })).toBeTruthy();
  expect(hasKidCommerceLeak("$9.99")).toBeTruthy();
  expect(hasKidCommerceLeak("https://amazon.com/dp/B000000000")).toBeTruthy();
  expect(hasKidCommerceLeak("https://m.media-amazon.com/images/I/demo.jpg")).toBeTruthy();
  expect(hasKidCommerceLeak("https://images-na.ssl-images-amazon.com/images/I/demo.jpg")).toBeTruthy();
  expect(hasKidCommerceLeak("https://www.youtube.com/embed/abc")).toBeTruthy();
  expect(hasKidCommerceLeak("https://www.googletagmanager.com/gtm.js")).toBeTruthy();
  expect(
    hasKidCommerceLeak("https://happy-pony-1.clerk.accounts.dev/npm/@clerk/clerk-js"),
  ).toBeTruthy();
  expect(hasKidCommerceLeak({ blurb: "Soft plush." })).toBeFalsy();
  expect(hasKidCommerceLeak("https://d5xuirxyqsqf5ctq.public.blob.vercel-storage.com/toy.jpg")).toBeFalsy();

  const amazonToy = {
    id: "dino-drill",
    name: "Dino Drill",
    category: "dinos",
    audience: "all",
    blurb: "Dig in the sand.",
    image: "https://m.media-amazon.com/images/I/81.jpg",
    images: [
      "https://m.media-amazon.com/images/I/81.jpg",
      "https://images-na.ssl-images-amazon.com/images/I/82.jpg",
    ],
    videos: [
      "https://m.media-amazon.com/images/S/vse/clip.m3u8",
      "https://www.youtube.com/watch?v=abc",
    ],
    imageAlt: "Dino drill",
    ageMin: 3,
    ageMax: 8,
    color: "#27AE60",
    price: 19.99,
    rating: 4.5,
    reviewCount: 1200,
  } as Toy & { price: number; rating: number; reviewCount: number };
  const kid = toKidToy(amazonToy);
  expect(JSON.stringify(kid)).not.toMatch(/media-amazon|ssl-images-amazon|youtube|tag=/i);
  expect(kid.image.startsWith("data:image/svg+xml,")).toBeTruthy();
  expect(decodeURIComponent(kid.image)).toContain("Dino Drill");
  expect(decodeURIComponent(kid.image)).toContain("#4A90E2");
  expect(decodeURIComponent(kid.image)).not.toContain("/categories/");
  const other = kidNameTileSrc("Sound Putty", "pretend");
  expect(other).not.toBe(kid.image);
  expect(decodeURIComponent(other)).toContain("Sound Putty");
  expect(decodeURIComponent(other)).toContain("#EF8FB3");
  expect(kid.videos).toBeUndefined();
  expect(hasKidCommerceLeak(kid)).toBeFalsy();

  const parent = toParentToy(amazonToy);
  expect(parent.blurb).toBe("Dig in the sand.");
  expect(parent).not.toHaveProperty("price");
  expect(parent).not.toHaveProperty("rating");
  expect(parent).not.toHaveProperty("reviewCount");
});
