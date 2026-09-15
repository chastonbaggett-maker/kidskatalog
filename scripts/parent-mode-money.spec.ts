import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const KID_COMMERCE_KEYS = ["affiliateUrl", "brandDeal", "brandDealUrl", "brandPartner"];

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
const KID_COMMERCE_HTML = /[?&]tag=|amazon\.com\/dp|Buy on Amazon|brandDealUrl|Brand partner link/i;

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

test("every live catalog id resolves at /p/{id} with Parent Buy placeholder + FTC", async ({
  request,
}) => {
  const ids = await allCatalogIds(request);

  for (const id of ids) {
    const pageRes = await request.get(`/p/${id}`);
    expect(pageRes.ok(), `/p/${id} should be 200`).toBeTruthy();
    const html = await pageRes.text();
    expect(html, id).toContain("Buy on Amazon");
    expect(html, id).toMatch(/Amazon Services LLC Associates Program/i);
    expect(html, id).toMatch(/Associates link goes here when approved/i);
    expect(html, id).not.toMatch(AFFILIATE_LEAK);
    expect(html, id).toMatch(/\/p\/buy-placeholder\?toy=/);

    const buy = await request.get(`/api/parent/buy-urls?ids=${id}`);
    expect(buy.ok()).toBeTruthy();
    const buyJson = (await buy.json()) as { urls: Record<string, string> };
    expect(buyJson.urls[id]).toMatch(/\/p\/buy-placeholder\?toy=/);
    expect(JSON.stringify(buyJson)).not.toMatch(AFFILIATE_LEAK);
  }
});

test("parent Buy uses placeholder confirmation, not live tagged Amazon URLs", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const ids = await allCatalogIds(request);
  const sample = pickSample(ids);

  for (const id of sample) {
    const stub = await request.get(`/api/buy-placeholder?toy=${id}`, { maxRedirects: 0 });
    expect(stub.status()).toBe(302);
    expect(stub.headers()["location"] || "").toMatch(/buy-placeholder/);

    await page.goto(`/p/${id}`, { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    const buyLink = page.getByRole("link", { name: "Buy on Amazon" });
    await expect(buyLink).toBeVisible();
    await expect(buyLink).toHaveAttribute("href", /\/p\/buy-placeholder\?toy=/);
    expect(await page.content()).not.toMatch(AFFILIATE_LEAK);
    await expect(page.getByText(/Associates link goes here when approved/i)).toBeVisible();
    await expect(page.getByText(/Amazon Services LLC Associates Program/i)).toBeVisible();
  }

  const first = sample[0]!;
  await page.goto(`/p/${first}`, { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await page.getByRole("link", { name: "Buy on Amazon" }).click();
  await page.waitForURL(/\/p\/buy-placeholder/);
  await dismissSplash(page);
  await expect(page.locator("#buy-placeholder")).toBeAttached();
  await expect(page.getByText(/Associates link goes here when approved/i)).toBeVisible();
  expect(await page.content()).not.toMatch(AFFILIATE_LEAK);
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

  const buyLinks = page.getByRole("link", { name: "Buy on Amazon" });
  await expect(buyLinks).toHaveCount(sample.length);
  await expect(page.locator('a[href*="/p/buy-placeholder?toy="]')).toHaveCount(sample.length);
  expect(await page.content()).not.toMatch(AFFILIATE_LEAK);
  for (const id of sample) {
    await expect(page.locator(`a[href="/p/${id}"]`).first()).toBeVisible();
  }
  await expect(page.getByText(/Amazon Services LLC Associates Program/i).first()).toBeVisible();
  await expect(
    page.getByText(/Buy links are placeholders until Associates is approved/i).first(),
  ).toBeVisible();

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
  const ids = await allCatalogIds(request);
  const sample = pickSample(ids).slice(0, Math.min(4, ids.length));
  expect(sample.length).toBeGreaterThan(1);

  await page.goto(`/p?ids=${sample.join(",")}`, { waitUntil: "domcontentloaded" });
  await dismissSplash(page);

  const buyLinks = page.getByRole("link", { name: "Buy on Amazon" });
  await expect(buyLinks).toHaveCount(sample.length);
  expect(await page.content()).not.toMatch(AFFILIATE_LEAK);

  for (const id of sample) {
    await expect(page.locator(`a[href="/p/${id}"]`).first()).toBeVisible();
  }
});

test("parent brand-deal surface is not Amazon and stays off kid pages", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await page.goto("/p/deals", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByText(/Brand deals/i).first()).toBeVisible();
  await expect(page.getByText(/not Amazon/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(0);
  expect(await page.content()).not.toMatch(AFFILIATE_LEAK);
  await expect(page.getByText(/Brand partner link/i).first()).toBeVisible();
  await expect(page.getByText(/Example Rocket Co/i).first()).toBeVisible();
  await expect(page.getByText(/Example Dino Studio/i).first()).toBeVisible();
  await expect(page.getByText(/Brand partner link — coming soon/i)).toBeVisible();
  await expect(
    page.locator('a[href="https://example.com/kidskatalog-brand-deal-placeholder"]'),
  ).toBeVisible();

  await page.goto("/p/sky-rocket", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toBeVisible();
  await expect(page.getByText(/Brand partner link — coming soon/i)).toBeVisible();
  await expect(page.getByText(/This is a brand partner link/i).first()).toBeVisible();
  expect(await page.content()).not.toMatch(AFFILIATE_LEAK);

  await page.goto("/p/roar-rex", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toBeVisible();
  const partner = page.locator(
    'a[href="https://example.com/kidskatalog-brand-deal-placeholder"]',
  );
  await expect(partner).toBeVisible();
  await expect(partner).toHaveText(/Brand partner link/);
  await expect(partner).not.toHaveText(/Amazon/);

  const catalog = await request.get("/api/catalog?ids=sky-rocket,roar-rex");
  const catalogJson = await catalog.json();
  expect(hasKidCommerceFields(catalogJson)).toBeFalsy();

  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  expect(await page.content()).not.toMatch(KID_COMMERCE_HTML);
  await expect(page.getByText(/Brand partner link/i)).toHaveCount(0);
});
