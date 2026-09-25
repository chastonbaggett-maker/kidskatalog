import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { seedParentGateUnlock } from "./parent-gate";

const KID_COMMERCE_KEYS = [
  "affiliateUrl",
  "brandDeal",
  "brandDealUrl",
  "brandPartner",
  "brandAffiliate",
];

function hasKidCommerceFields(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasKidCommerceFields);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  for (const key of KID_COMMERCE_KEYS) {
    if (key in record && record[key] !== undefined) return true;
  }
  return Object.values(record).some(hasKidCommerceFields);
}

const AFFILIATE_LEAK = /[?&]tag=|amazon\.[^"'<\s]+\/(?:dp|gp\/product)\//i;
const TAGGED_BUY = /https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}\?tag=[^"'<\s]+/;
const DISCLOSURE = "As an Amazon Associate I earn from qualifying purchases.";
const KID_COMMERCE_HTML =
  /[?&]tag=|https?:\/\/(?:www\.)?amazon\.com(?:[/?#]|$)|Buy on Amazon|brandDealUrl|brandAffiliate|Brand partner link|\$\d+\.\d{2}/i;

const SAMPLE_IDS = ["sky-rocket", "roar-rex", "mag-train", "glow-bow", "hair-gem", "ocean-rescue"];

async function dismissSplash(page: Page) {
  const tap = page.getByRole("button", { name: /Tap to start KidsKatalog/i });
  try {
    await tap.waitFor({ state: "visible", timeout: 8000 });
    await tap.click();
    await tap.waitFor({ state: "hidden", timeout: 15_000 });
  } catch {
    // Already dismissed or not a cold open.
  }
}

async function allCatalogIds(request: APIRequestContext): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;
  const limit = 60;
  for (;;) {
    const res = await request.get(`/api/catalog?limit=${limit}&offset=${offset}`);
    expect(res.ok()).toBeTruthy();
    const data = (await res.json()) as {
      toys?: Array<{ id: string }>;
      hasMore?: boolean;
    };
    const page = data.toys ?? [];
    for (const toy of page) {
      if (toy.id) ids.push(toy.id);
    }
    if (!data.hasMore || page.length === 0) break;
    offset += page.length;
  }
  if (ids.length === 0) throw new Error("catalog is empty");
  return ids;
}

function pickSample(ids: string[]): string[] {
  const preferred = SAMPLE_IDS.filter((id) => ids.includes(id));
  const rest = ids.filter((id) => !preferred.includes(id));
  const sample = [...preferred, ...rest].slice(0, Math.min(4, ids.length));
  return [...new Set(sample)];
}

test("kid shop, toy pages, and catalog have no affiliate or brand-deal leaks", async ({
  request,
  page,
}) => {
  const ids = await allCatalogIds(request);
  expect(ids.length).toBeGreaterThan(0);

  const catalog = await request.get("/api/catalog?limit=60");
  expect(catalog.ok()).toBeTruthy();
  const catalogJson = (await catalog.json()) as { toys: unknown[] };
  expect(catalogJson.toys.length).toBeGreaterThan(0);
  expect(hasKidCommerceFields(catalogJson)).toBeFalsy();
  expect(JSON.stringify(catalogJson)).not.toMatch(AFFILIATE_LEAK);

  const sample = pickSample(ids);
  const byId = await request.get(`/api/catalog?ids=${sample.join(",")}`);
  expect(byId.ok()).toBeTruthy();
  const byIdJson = (await byId.json()) as { toys: Array<{ id: string }> };
  expect(byIdJson.toys.map((t) => t.id)).toEqual(sample.filter((id) => ids.includes(id)));
  expect(hasKidCommerceFields(byIdJson)).toBeFalsy();

  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  expect(await page.content()).not.toMatch(KID_COMMERCE_HTML);

  const toyId = sample[0]!;
  await page.goto(`/toy/${toyId}`, { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  expect(await page.content()).not.toMatch(KID_COMMERCE_HTML);
  await expect(page.locator(".add-kart-btn")).toBeVisible();
  await expect(page.getByRole("link", { name: /Buy on Amazon/i })).toHaveCount(0);
  await expect(page.getByText(/Brand partner link/i)).toHaveCount(0);
});

test("parent home lists every live toy with a tagged Buy link; Kid Mode cookie stays clean", async ({
  request,
}) => {
  test.setTimeout(120_000);
  const ids = await allCatalogIds(request);
  const home = await request.get("/");
  expect(home.ok()).toBeTruthy();
  const html = await home.text();
  const links = html.match(/href="https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}\?tag=[^"]+"/g) || [];
  expect(links.length).toBe(ids.length);
  expect(html).toContain(DISCLOSURE);
  expect(html).toContain(">Kid Mode<");
  expect(html).toContain('rel="sponsored noopener"');
  expect(html).not.toContain("noreferrer");
  expect(html).not.toContain("parent-birth-year-gate");

  const kidHome = await request.get("/", { headers: { cookie: "kk_mode=kid" } });
  expect(kidHome.ok()).toBeTruthy();
  expect(await kidHome.text()).not.toMatch(KID_COMMERCE_HTML);

  const kidShop = await request.get("/shop", { headers: { cookie: "kk_mode=kid" } });
  expect(kidShop.ok()).toBeTruthy();
  expect(await kidShop.text()).not.toMatch(KID_COMMERCE_HTML);

  for (const path of ["/menu", "/profile", "/kart"]) {
    const res = await request.get(path, { headers: { cookie: "kk_mode=kid" } });
    expect(res.ok(), path).toBeTruthy();
    expect(await res.text(), path).not.toMatch(KID_COMMERCE_HTML);
  }

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const robotsText = await robots.text();
  expect(robotsText).toMatch(/Sitemap:\s+https:\/\/kidskatalog\.com\/sitemap\.xml/i);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("https://kidskatalog.com/</loc>");
  expect(sitemapText).toContain("https://kidskatalog.com/p/sky-rocket</loc>");
  expect(sitemapText).not.toContain("/shop");
  expect(sitemapText).not.toContain("buy-placeholder");

  const www = await request.get("/", {
    maxRedirects: 0,
    headers: { "x-forwarded-host": "www.kidskatalog.com", "x-forwarded-proto": "https" },
  });
  expect(www.status()).toBe(301);
  expect(www.headers()["location"]).toBe("https://kidskatalog.com/");

  const vercelHost = await request.get("/p/sky-rocket", {
    maxRedirects: 0,
    headers: { "x-forwarded-host": "kidskatalog.vercel.app", "x-forwarded-proto": "https" },
  });
  expect(vercelHost.status()).toBe(301);
  expect(vercelHost.headers()["location"]).toBe("https://kidskatalog.com/p/sky-rocket");

  const preview = await request.get("/", {
    maxRedirects: 0,
    headers: {
      "x-forwarded-host": "kidskatalog-git-cursor-parent.vercel.app",
      "x-forwarded-proto": "https",
    },
  });
  expect(preview.status()).not.toBe(301);
});

test("every live catalog id resolves at /p/{id} with a tagged Buy anchor + disclosure", async ({
  request,
}) => {
  test.setTimeout(180_000);
  const ids = await allCatalogIds(request);

  for (const id of ids) {
    const pageRes = await request.get(`/p/${id}`);
    expect(pageRes.ok(), `/p/${id} should be 200`).toBeTruthy();
    const html = await pageRes.text();
    expect(html, id).not.toContain("parent-birth-year-gate");
    expect(html, id).toContain("Buy on Amazon");
    expect(html, id).toContain(DISCLOSURE);
    expect(html, id).toContain('rel="sponsored noopener"');
    expect(html, id).toMatch(TAGGED_BUY);
    expect(html, id).not.toMatch(/buy-placeholder|not approved/i);

    const buy = await request.get(`/api/parent/buy-urls?ids=${id}`);
    expect(buy.ok()).toBeTruthy();
    const buyJson = (await buy.json()) as { urls: Record<string, string> };
    expect(buyJson.urls[id]).toMatch(TAGGED_BUY);
  }
});

test("parent Buy is a tagged Amazon anchor and old placeholder URLs redirect", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const ids = await allCatalogIds(request);
  const sample = pickSample(ids);

  for (const id of sample) {
    const stub = await request.get(`/api/buy-placeholder?toy=${id}`, { maxRedirects: 0 });
    expect(stub.status()).toBe(301);
    expect(stub.headers()["location"] || "").toMatch(new RegExp(`/p/${id}$`));

    const pageStub = await request.get(`/p/buy-placeholder?toy=${id}`, { maxRedirects: 0 });
    expect(pageStub.status()).toBe(301);
    expect(pageStub.headers()["location"] || "").toMatch(new RegExp(`/p/${id}$`));

    await page.goto(`/p/${id}`, { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    const buyLink = page.getByRole("link", { name: "Buy on Amazon" }).first();
    await expect(buyLink).toBeVisible();
    await expect(buyLink).toHaveAttribute("href", TAGGED_BUY);
    await expect(buyLink).toHaveAttribute("rel", "sponsored noopener");
    expect(await page.content()).toContain(DISCLOSURE);
    expect(await page.content()).not.toMatch(/buy-placeholder|not approved/i);
    await expect(page.getByText(/Amazon Services LLC Associates Program/i).first()).toBeVisible();
  }

  const missing = await request.get("/api/buy-placeholder", { maxRedirects: 0 });
  expect(missing.status()).toBe(301);
  expect(missing.headers()["location"] || "").toMatch(/\/$/);
});

test("kart builds a shareable multi-toy wish list URL for Parent Mode", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(90_000);
  const ids = await allCatalogIds(request);
  const sample = pickSample(ids).slice(0, Math.min(3, ids.length));
  expect(sample.length).toBeGreaterThan(1);
  const expectedPath = `/p?ids=${sample.map((id) => encodeURIComponent(id)).join(",")}`;

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript((seedIds: string[]) => {
    localStorage.setItem(
      "kidskatalog-kart",
      JSON.stringify({ state: { ids: seedIds }, version: 0 }),
    );
    localStorage.removeItem("kidskatalog-parent-wishlist");
  }, sample);

  await page.goto("/kart", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);

  expect(await page.content()).not.toMatch(KID_COMMERCE_HTML);
  await expect(page.getByRole("link", { name: /Buy on Amazon/i })).toHaveCount(0);
  await expect(page.getByText(/Brand partner link/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Send Kart PDF/i })).toHaveCount(0);
  await expect(page.getByLabel(/Parent email/i)).toHaveCount(0);
  await expect(page.getByTestId("parent-signup-link")).toHaveCount(0);

  const shareUrl = page.getByTestId("wishlist-share-url");
  await expect(shareUrl).toBeVisible();
  await expect(shareUrl).toHaveValue(new RegExp(`${expectedPath.replace("?", "\\?")}$`));

  const openParent = page.getByTestId("open-parent-wishlist");
  await expect(openParent).toHaveAttribute("href", expectedPath);

  await page.getByTestId("copy-wishlist-link").click();
  await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
  try {
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toMatch(new RegExp(`${expectedPath.replace("?", "\\?")}$`));
  } catch {
    // Clipboard read can be blocked; the generated URL field is the source of truth.
  }

  await expect(page.getByTestId("for-parents-entry")).toHaveAttribute("href", "/p/deals");

  await openParent.click();
  await page.waitForURL((url) => url.pathname === "/p" && url.searchParams.get("ids") === sample.join(","));
  await dismissSplash(page);

  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  const buyLinks = page.getByRole("link", { name: "Buy on Amazon" });
  await expect(buyLinks).toHaveCount(sample.length);
  await expect(buyLinks.first()).toHaveAttribute("href", TAGGED_BUY);
  await expect(buyLinks.first()).toHaveAttribute("rel", "sponsored noopener");
  expect(await page.content()).toContain(DISCLOSURE);
  expect(await page.content()).not.toMatch(/buy-placeholder|not approved/i);
  for (const id of sample) {
    await expect(page.locator(`a[href="/p/${id}"]`).first()).toBeVisible();
  }
  await expect(page.getByText(/Amazon Services LLC Associates Program/i).first()).toBeVisible();

  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  expect(await page.content()).not.toMatch(KID_COMMERCE_HTML);
  await expect(page.getByRole("link", { name: /Buy on Amazon/i })).toHaveCount(0);

  await page.goto(`/toy/${sample[0]}`, { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  expect(await page.content()).not.toMatch(KID_COMMERCE_HTML);
  await expect(page.locator(".add-kart-btn")).toBeVisible();
  await expect(page.getByRole("link", { name: /Buy on Amazon/i })).toHaveCount(0);
  await expect(page.getByText(/Brand partner link/i)).toHaveCount(0);

  await page.goto("/menu", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  expect(await page.content()).not.toMatch(KID_COMMERCE_HTML);
  await expect(page.getByRole("link", { name: /Buy on Amazon/i })).toHaveCount(0);
});

test("wish list accepts multiple real ids", async ({ page, request }) => {
  test.setTimeout(60_000);
  await seedParentGateUnlock(page);
  const ids = await allCatalogIds(request);
  const sample = pickSample(ids).slice(0, Math.min(4, ids.length));
  expect(sample.length).toBeGreaterThan(1);

  await page.goto(`/p?ids=${sample.join(",")}`, { waitUntil: "domcontentloaded" });
  await dismissSplash(page);

  const buyLinks = page.getByRole("link", { name: "Buy on Amazon" });
  await expect(buyLinks).toHaveCount(sample.length);
  await expect(buyLinks.first()).toHaveAttribute("href", TAGGED_BUY);
  expect(await page.content()).toContain(DISCLOSURE);

  for (const id of sample) {
    await expect(page.locator(`a[href="/p/${id}"]`).first()).toBeVisible();
  }
});

test("parent brand-deal surface is not Amazon and stays off kid pages", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await seedParentGateUnlock(page);
  await page.goto("/p/deals", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByText(/Brand deals/i).first()).toBeVisible();
  await expect(page.getByText(/not Amazon/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(0);
  await expect(page.getByTestId("parent-buy-cta")).toHaveCount(0);
  expect(await page.content()).not.toMatch(AFFILIATE_LEAK);
  await expect(page.getByTestId("brand-affiliate-cta").first()).toBeVisible();
  await expect(page.getByText(/Yoto-style/i).first()).toBeVisible();
  await expect(page.getByText(/KiwiCo-style/i).first()).toBeVisible();
  await expect(page.getByText(/Brand partner link — coming soon/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Brand partner link/i })).toHaveCount(0);

  async function assertSeparateBuyAndBrand(path: string, partner: RegExp) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    const buy = page.getByTestId("parent-buy-cta");
    const brand = page.getByTestId("brand-affiliate-cta");
    await expect(buy).toHaveCount(1);
    await expect(brand).toHaveCount(1);
    await expect(buy).toHaveText("Buy on Amazon");
    await expect(brand).toHaveText("Brand partner link — coming soon");
    await expect(buy).toHaveAttribute("href", TAGGED_BUY);
    await expect(buy).toHaveAttribute("rel", "sponsored noopener");
    await expect(buy).not.toHaveText(/Brand partner/);
    await expect(brand).not.toHaveText(/Amazon/);
    await expect(page.getByRole("link", { name: "Buy on Amazon" })).not.toHaveText(
      /Brand partner/,
    );
    await expect(page.getByText(partner).first()).toBeVisible();
    await expect(page.getByText(/This is a brand partner link/i).first()).toBeVisible();
    await expect(page.getByText(/not Amazon/i).first()).toBeVisible();
    expect(await page.content()).toContain(DISCLOSURE);
  }

  await assertSeparateBuyAndBrand("/p/sky-rocket", /Yoto-style/i);
  await assertSeparateBuyAndBrand("/p/roar-rex", /KiwiCo-style/i);

  const catalog = await request.get("/api/catalog?ids=sky-rocket,roar-rex");
  const catalogJson = await catalog.json();
  expect(hasKidCommerceFields(catalogJson)).toBeFalsy();
  expect(JSON.stringify(catalogJson)).not.toMatch(/brandAffiliate/);

  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  expect(await page.content()).not.toMatch(KID_COMMERCE_HTML);
  await expect(page.getByText(/Brand partner link/i)).toHaveCount(0);
  await expect(page.getByTestId("brand-affiliate-cta")).toHaveCount(0);
});
