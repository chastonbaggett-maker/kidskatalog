import { test, expect, type Page } from "@playwright/test";

const AFFILIATE_LEAK = /[?&]tag=|amazon\.[^"'<\s]+\/(?:dp|gp\/product)\//i;

async function dismissSplash(page: Page) {
  const tap = page.getByRole("button", { name: /Tap to start KidsKatalog/i });
  try {
    await tap.waitFor({ state: "visible", timeout: 1500 });
    await tap.click();
    await tap.waitFor({ state: "hidden", timeout: 10_000 });
  } catch {
    // Already dismissed or not a cold open.
  }
}

async function firstCatalogId(request: Page["request"]): Promise<string> {
  const catalog = await request.get("/api/catalog?limit=5");
  const data = (await catalog.json()) as { toys?: Array<{ id: string }> };
  const id = data.toys?.[0]?.id;
  if (!id) throw new Error("catalog is empty");
  return id;
}

test("kid shop and catalog have no affiliate tag URLs", async ({ request, page }) => {
  const catalog = await request.get("/api/catalog?limit=60");
  expect(catalog.ok()).toBeTruthy();
  const catalogText = await catalog.text();
  expect(catalogText).not.toMatch(AFFILIATE_LEAK);
  expect(catalogText).not.toContain("affiliateUrl");

  const id = await firstCatalogId(request);
  const byId = await request.get(`/api/catalog?ids=${id}`);
  expect(byId.ok()).toBeTruthy();
  const byIdJson = (await byId.json()) as { toys: Array<{ id: string; affiliateUrl?: string }> };
  expect(byIdJson.toys[0]?.id).toBe(id);
  expect(byIdJson.toys[0]?.affiliateUrl).toBeUndefined();

  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  expect(await page.content()).not.toMatch(AFFILIATE_LEAK);

  await page.goto(`/toy/${id}`, { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  expect(await page.content()).not.toMatch(AFFILIATE_LEAK);
  await expect(page.locator(".add-kart-btn")).toBeVisible();
  await expect(page.getByRole("link", { name: /Buy on Amazon/i })).toHaveCount(0);
});

test("parent Buy uses placeholder confirmation, not live tagged Amazon URLs", async ({
  page,
  request,
}) => {
  const id = await firstCatalogId(request);

  const buy = await request.get(`/api/parent/buy-urls?ids=${id}`);
  expect(buy.ok()).toBeTruthy();
  const buyJson = (await buy.json()) as { urls: Record<string, string> };
  expect(buyJson.urls[id]).toMatch(/\/p\/buy-placeholder\?toy=/);
  expect(JSON.stringify(buyJson)).not.toMatch(AFFILIATE_LEAK);

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

  await buyLink.click();
  await page.waitForURL(/\/p\/buy-placeholder/);
  await dismissSplash(page);
  await expect(page.locator("#buy-placeholder")).toBeAttached();
  await expect(page.getByText(/Associates link goes here when approved/i)).toBeVisible();
  expect(await page.content()).not.toMatch(AFFILIATE_LEAK);

  await page.goto(`/p?ids=${id}`, { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByRole("link", { name: "Buy on Amazon" }).first()).toBeVisible();
  expect(await page.content()).not.toMatch(AFFILIATE_LEAK);
});
