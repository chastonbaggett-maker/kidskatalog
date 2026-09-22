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
const KID_COMMERCE_HTML =
  /[?&]tag=|amazon\.com\/dp|Buy on Amazon|brandDealUrl|brandAffiliate|Brand partner link/i;

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

const ASSOCIATES_BUY =
  /^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}\?tag=kidskatalog-20$/;

test("every live catalog id resolves at /p/{id} with tagged Parent Buy + FTC gate", async ({
  request,
}) => {
  const ids = await allCatalogIds(request);

  for (const id of ids) {
    const pageRes = await request.get(`/p/${id}`);
    expect(pageRes.ok(), `/p/${id} should be 200`).toBeTruthy();
    const html = await pageRes.text();
    expect(html, id).toContain("parent-birth-year-gate");
    expect(html, id).toMatch(/What(?:'|’|&#x27;)s your birth year/i);
    expect(html, id).not.toContain("Buy on Amazon");

    const buy = await request.get(`/api/parent/buy-urls?ids=${id}`);
    expect(buy.ok()).toBeTruthy();
    const buyJson = (await buy.json()) as { urls: Record<string, string> };
    expect(buyJson.urls[id], id).toMatch(ASSOCIATES_BUY);
  }
});

test("parent Buy opens a kidskatalog-20 Associates URL", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await seedParentGateUnlock(page);
  const ids = await allCatalogIds(request);
  const sample = pickSample(ids);

  for (const id of sample) {
    const buy = await request.get(`/api/parent/buy-urls?ids=${id}`);
    const buyJson = (await buy.json()) as { urls: Record<string, string> };
    expect(buyJson.urls[id]).toMatch(ASSOCIATES_BUY);

    await page.goto(`/p/${id}`, { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    const buyLink = page.getByRole("link", { name: "Buy on Amazon" });
    await expect(buyLink).toBeVisible();
    await expect(buyLink).toHaveAttribute("href", buyJson.urls[id]!);
    await expect(buyLink).toHaveAttribute("href", /[?&]tag=kidskatalog-20(?:&|$)/);
    await expect(page.getByText(/Associates link goes here when approved/i)).toHaveCount(0);
    await expect(page.getByText(/Amazon Services LLC Associates Program/i)).toBeVisible();
  }
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

  await expect(page.getByTestId("parent-birth-year-gate")).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(0);
  await page.getByTestId("parent-birth-year").fill("1990");
  await page.getByTestId("parent-birth-year-submit").click();
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);

  const buyLinks = page.getByRole("link", { name: "Buy on Amazon" });
  await expect(buyLinks).toHaveCount(sample.length);
  await expect(page.locator('a[href*="tag=kidskatalog-20"]')).toHaveCount(sample.length);
  await expect(page.locator('a[href*="/p/buy-placeholder?toy="]')).toHaveCount(0);
  for (const id of sample) {
    await expect(page.locator(`a[href="/p/${id}"]`).first()).toBeVisible();
  }
  await expect(page.getByText(/Amazon Services LLC Associates Program/i).first()).toBeVisible();
  await expect(
    page.getByText(/Buy links are placeholders until Associates is approved/i),
  ).toHaveCount(0);

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
  await expect(page.locator('a[href*="tag=kidskatalog-20"]')).toHaveCount(sample.length);

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

  async function assertSeparatePlaceholderCtas(path: string, partner: RegExp) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    const buy = page.getByTestId("parent-buy-cta");
    const brand = page.getByTestId("brand-affiliate-cta");
    await expect(buy).toHaveCount(1);
    await expect(brand).toHaveCount(1);
    await expect(buy).toHaveText("Buy on Amazon");
    await expect(brand).toHaveText("Brand partner link — coming soon");
    await expect(buy).toHaveAttribute("href", ASSOCIATES_BUY);
    await expect(buy).not.toHaveText(/Brand partner/);
    await expect(brand).not.toHaveText(/Amazon/);
    await expect(page.getByRole("link", { name: "Buy on Amazon" })).not.toHaveText(
      /Brand partner/,
    );
    await expect(page.getByText(partner).first()).toBeVisible();
    await expect(page.getByText(/This is a brand partner link/i).first()).toBeVisible();
    await expect(page.getByText(/not Amazon/i).first()).toBeVisible();
    await expect(brand).not.toHaveAttribute("href", /amazon|tag=/i);
  }

  await assertSeparatePlaceholderCtas("/p/sky-rocket", /Yoto-style/i);
  await assertSeparatePlaceholderCtas("/p/roar-rex", /KiwiCo-style/i);

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
