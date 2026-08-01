import { test, expect } from "@playwright/test";

test("pile mode enter transition reaches grid", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/shop", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("kidskatalog-toy-pile-mode");
  });
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.locator(".feed-card").first()).toBeVisible();

  await page.locator(".filter-pile-btn").last().click();

  await page.waitForTimeout(200);
  await page.screenshot({ path: "/tmp/pile-enter-200ms.png" });

  await expect(page.locator(".pile-header-enter.is-visible")).toBeVisible({
    timeout: 2000,
  });
  await expect(page.locator(".bottom-nav__pile-shelf.is-raised")).toBeVisible({
    timeout: 2000,
  });

  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/pile-enter-500ms.png" });

  await expect(page.locator(".toy-pile-viewport")).toBeVisible({ timeout: 3000 });
  await expect(page.locator(".bottom-nav__pile-filter .filter-row-scroll")).toBeVisible({
    timeout: 3000,
  });

  await page.waitForTimeout(1800);

  await expect(page.locator(".feed-card")).toHaveCount(0);
  await expect(page.locator(".toy-pile-card").first()).toBeVisible();
  await expect(page.locator(".toy-pile-card--loading")).toHaveCount(0, {
    timeout: 4000,
  });
});
