import { test, expect } from "@playwright/test";
import { hasKidCommerceLeak } from "../src/lib/affiliate";
import {
  applySeededBrandDeals,
  resolveBrandDeal,
  SEEDED_BRAND_AFFILIATES,
} from "../src/lib/brand-deals";
import { hasKidCommerceFields, toKidToy } from "../src/lib/kid-surface";
import type { Toy } from "../src/types/toy";

function toy(partial: Partial<Toy> & Pick<Toy, "id" | "name">): Toy {
  return {
    category: "stem",
    audience: "all",
    blurb: "Demo toy.",
    image: "/toys/sky-rocket.jpg",
    imageAlt: "Demo",
    ageMin: 3,
    ageMax: 8,
    color: "#3498DB",
    ...partial,
  };
}

test("brandAffiliate defaults empty and not live", () => {
  expect(resolveBrandDeal(toy({ id: "plain", name: "Plain" }))).toBeNull();
  expect(SEEDED_BRAND_AFFILIATES["sky-rocket"]?.live).toBe(false);
  expect(SEEDED_BRAND_AFFILIATES["roar-rex"]?.live).toBe(false);
});

test("not-live overlay is a coming-soon CTA even when a URL is present", () => {
  const deal = resolveBrandDeal(
    toy({
      id: "sky-rocket",
      name: "Sky Rocket",
      brandAffiliate: {
        partner: "Yoto-style",
        network: "impact",
        url: "https://yoto.example/kk",
        live: false,
      },
    }),
  );
  expect(deal).toEqual({
    partner: "Yoto-style",
    network: "impact",
    href: null,
    comingSoon: true,
    live: false,
  });
});

test("live + non-Amazon url resolves a partner href, never an Amazon Buy target", () => {
  const href = "https://www.kiwico.com/kidskatalog-demo";
  const deal = resolveBrandDeal(
    toy({
      id: "roar-rex",
      name: "Roar Rex",
      affiliateUrl: "https://www.amazon.com/dp/B0GR4H66J5?tag=kidskatalog-20",
      brandAffiliate: {
        partner: "KiwiCo-style",
        network: "impact",
        url: href,
        live: true,
      },
    }),
  );
  expect(deal?.href).toBe(href);
  expect(deal?.comingSoon).toBe(false);
  expect(deal?.href).not.toMatch(/amazon/i);
  expect(deal?.href).not.toMatch(/[?&]tag=/i);
});

test("live Amazon URLs are rejected so the brand CTA cannot dual-claim Associates", () => {
  const deal = resolveBrandDeal(
    toy({
      id: "x",
      name: "X",
      brandAffiliate: {
        partner: "Yoto-style",
        url: "https://www.amazon.com/dp/B0BBRGJTD7?tag=kidskatalog-20",
        live: true,
      },
    }),
  );
  expect(deal?.href).toBeNull();
  expect(deal?.comingSoon).toBe(true);
});

test("overlay seeds Yoto-style / KiwiCo-style as not live", () => {
  const seeded = applySeededBrandDeals([
    toy({ id: "sky-rocket", name: "Sky Rocket" }),
    toy({ id: "roar-rex", name: "Roar Rex" }),
    toy({ id: "mag-train", name: "Mag Train" }),
  ]);
  expect(resolveBrandDeal(seeded[0]!)?.partner).toBe("Yoto-style");
  expect(resolveBrandDeal(seeded[1]!)?.partner).toBe("KiwiCo-style");
  expect(resolveBrandDeal(seeded[0]!)?.comingSoon).toBe(true);
  expect(resolveBrandDeal(seeded[1]!)?.comingSoon).toBe(true);
  expect(resolveBrandDeal(seeded[2]!)).toBeNull();
});

test("kid surfaces strip brandAffiliate", () => {
  const parent = toy({
    id: "sky-rocket",
    name: "Sky Rocket",
    affiliateUrl: "https://www.amazon.com/dp/B0BBRGJTD7?tag=kidskatalog-20",
    brandDeal: true,
    brandPartner: "Yoto-style",
    brandAffiliate: {
      partner: "Yoto-style",
      network: "impact",
      live: false,
    },
  });
  const kid = toKidToy(parent);
  expect(kid).not.toHaveProperty("brandAffiliate");
  expect(kid).not.toHaveProperty("brandDeal");
  expect(kid).not.toHaveProperty("affiliateUrl");
  expect(hasKidCommerceFields(kid)).toBeFalsy();
  expect(hasKidCommerceLeak(kid)).toBeFalsy();
  expect(hasKidCommerceFields(parent)).toBeTruthy();
  expect(hasKidCommerceLeak({ price: 19.99 })).toBeTruthy();
  expect(hasKidCommerceLeak({ listPrice: "12.00" })).toBeTruthy();
  expect(hasKidCommerceLeak("On sale for $8")).toBeTruthy();
  expect(hasKidCommerceLeak("https://www.amazon.com/dp/B0BBRGJTD7?tag=kidskatalog-20")).toBeTruthy();
  expect(hasKidCommerceLeak("https://www.amazon.com/s?k=toys")).toBeTruthy();
  expect(hasKidCommerceLeak("Buy on Amazon")).toBeTruthy();
  expect(hasKidCommerceLeak({ name: "Sky Rocket", blurb: "Launches up." })).toBeFalsy();
  expect(hasKidCommerceLeak("https://m.media-amazon.com/images/I/demo.jpg")).toBeFalsy();
});
