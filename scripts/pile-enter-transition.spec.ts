import { test, expect } from "@playwright/test";

test("pile mode enter shows grid after header transition", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3456/shop", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("kidskatalog-toy-pile-mode");
  });
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.locator(".feed-card").first()).toBeVisible();

  await page.getByRole("button", { name: /Toy Pile/i }).click();

  await expect(page.locator(".pile-header-enter.is-visible")).toBeVisible({
    timeout: 5000,
  });
  await expect(page.locator(".bottom-nav--pile.is-shelf-raised")).toBeVisible({
    timeout: 2000,
  });
  await expect(page.locator(".bottom-nav--pile.bottom-nav-enter.is-enter-visible")).toBeVisible({
    timeout: 5000,
  });

  await expect(page.locator(".toy-pile-viewport")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".bottom-nav__pile-shelf")).toHaveCount(0);

  await page.waitForTimeout(900);

  await expect(page.locator(".feed-card")).toHaveCount(0);
  await expect(page.locator(".toy-pile-card").first()).toBeVisible();
});
