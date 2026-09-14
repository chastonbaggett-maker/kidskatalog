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

test("kid shop and catalog have no affiliate tag URLs", async ({ request, page }) => {
  const catalog = await request.get("/api/catalog?limit=60");
  expect(catalog.ok()).toBeTruthy();
  const catalogText = await catalog.text();
  expect(catalogText).not.toMatch(AFFILIATE_LEAK);
  expect(catalogText).not.toContain("affiliateUrl");

  const byId = await request.get("/api/catalog?ids=ocean-rescue");
  expect(byId.ok()).toBeTruthy();
  const byIdJson = (await byId.json()) as { toys: Array<{ id: string; affiliateUrl?: string }> };
  expect(byIdJson.toys[0]?.id).toBe("ocean-rescue");
  expect(byIdJson.toys[0]?.affiliateUrl).toBeUndefined();

  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  const shopHtml = await page.content();
  expect(shopHtml).not.toMatch(AFFILIATE_LEAK);

  await page.goto("/toy/ocean-rescue", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  const toyHtml = await page.content();
  expect(toyHtml).not.toMatch(AFFILIATE_LEAK);
  await expect(page.locator(".add-kart-btn")).toBeVisible();
  await expect(page.getByRole("link", { name: /Buy on Amazon/i })).toHaveCount(0);
});

test("parent mode has Buy special link and disclosure", async ({ page, request }) => {
  const buy = await request.get("/api/parent/buy-urls?ids=ocean-rescue");
  expect(buy.ok()).toBeTruthy();
  const buyJson = (await buy.json()) as { urls: Record<string, string> };
  expect(buyJson.urls["ocean-rescue"]).toMatch(/amazon\.com\/dp\/.+\?tag=/);

  await page.goto("/p/ocean-rescue", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  const buyLink = page.getByRole("link", { name: "Buy on Amazon" });
  await expect(buyLink).toBeVisible();
  await expect(buyLink).toHaveAttribute("href", /amazon\.com\/dp\/.+\?tag=/);
  await expect(buyLink).toHaveAttribute("target", "_blank");
  await expect(buyLink).toHaveAttribute("rel", /noopener/);
  await expect(page.getByText(/Amazon Services LLC Associates Program/i)).toBeVisible();

  await page.goto("/p?ids=ocean-rescue", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByRole("link", { name: "Buy on Amazon" }).first()).toBeVisible();
  await expect(page.getByText(/Amazon Services LLC Associates Program/i)).toBeVisible();
});
