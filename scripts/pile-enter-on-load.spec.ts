import { test, expect } from "@playwright/test";

test("pile mode page load animates header and bottom nav", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3456/shop", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem(
      "kidskatalog-toy-pile-mode",
      JSON.stringify({ state: { toyPileMode: true }, version: 0 }),
    );
  });
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.locator(".pile-header-enter")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".bottom-nav--pile.bottom-nav-enter")).toBeVisible({
    timeout: 5000,
  });

  await expect(page.locator(".pile-header-enter.is-visible")).toBeVisible({
    timeout: 5000,
  });
  await expect(page.locator(".bottom-nav--pile.bottom-nav-enter.is-enter-visible")).toBeVisible({
    timeout: 5000,
  });
  await expect(page.locator(".toy-pile-viewport")).toBeVisible({ timeout: 5000 });
});
