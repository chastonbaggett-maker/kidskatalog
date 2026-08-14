import { test, expect } from "@playwright/test";

/**
 * Crazy mode is session-only (no catalog/random fetch).
 * Kart add should not leave oversized image flashes on screen.
 */
test("kart add stays clean while crazy mode is armed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/shop", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Crazy Mode/i }).first().click();
  await expect(page.locator(".app-shell--crazy")).toBeVisible();

  // Client navigation keeps the session crazy flag.
  const rocket = page.locator('a[href="/toy/sky-rocket"]').first();
  if ((await rocket.count()) > 0) {
    await rocket.click();
  } else {
    await page.locator("[data-feed-slot] a").first().click();
  }
  await page.waitForURL(/\/toy\//, { timeout: 8000 });

  await page.locator(".add-kart-btn").click();
  await page.waitForTimeout(900);

  const after = await page.evaluate(() => ({
    oversized: Array.from(document.querySelectorAll<HTMLImageElement>("img"))
      .filter((img) => {
        const r = img.getBoundingClientRect();
        return r.width >= innerWidth * 0.7 && r.height >= innerHeight * 0.65;
      })
      .map((img) => ({ src: img.src.slice(-48), w: img.width, h: img.height })),
    crazyShell: document.querySelector(".app-shell--crazy") != null,
  }));

  expect(after.crazyShell, "crazy chrome should persist on product page").toBe(
    true,
  );
  expect(after.oversized, JSON.stringify(after.oversized)).toEqual([]);
});
