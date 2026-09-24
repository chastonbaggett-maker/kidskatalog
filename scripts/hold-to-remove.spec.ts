import { test, expect, type Page } from "@playwright/test";
import { seedParentGateUnlock } from "./parent-gate";

test.use({ channel: "chrome" });

async function dismissSplash(page: Page) {
  const splash = page.locator(".app-splash").first();
  try {
    await splash.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    return;
  }
  for (let i = 0; i < 40; i++) {
    const hold = await page.locator(".app-splash--hold").count();
    if (hold > 0) {
      await page.locator(".app-splash").click({ force: true });
      break;
    }
    const gone = await page.locator(".app-splash").count();
    if (gone === 0) return;
    await page.waitForTimeout(250);
  }
  await page
    .locator(".app-splash")
    .waitFor({ state: "detached", timeout: 20_000 })
    .catch(() => {});
}

test("hold Remove 2s fills purple then pops card off list", async ({ page }) => {
  await seedParentGateUnlock(page);

  const toyId = "block-wood";
  await page.goto(`/p?ids=${toyId}`, { waitUntil: "domcontentloaded" });
  await dismissSplash(page);

  const row = page.getByTestId(`parent-wishlist-row-${toyId}`);
  await expect(row).toBeVisible({ timeout: 15_000 });

  const removeBtn = row.getByTestId("hold-to-remove");
  await expect(removeBtn).toBeVisible();
  await expect(removeBtn.locator(".hold-to-remove__hint").first()).toBeVisible();

  const box = await removeBtn.boundingBox();
  expect(box).toBeTruthy();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;

  // Tap briefly — must not remove.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.up();
  await page.waitForTimeout(250);
  await expect(row).toBeVisible();
  await expect(removeBtn).not.toHaveClass(/is-holding/);

  // Hold for 2s (wall-clock timeout).
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(removeBtn).toHaveClass(/is-holding/);

  await page.waitForTimeout(1000);
  // Mid-hold: CSS transition should show a partial scaleX fill.
  const midScaleX = await removeBtn.locator(".hold-to-remove__fill").evaluate((el) => {
    const t = getComputedStyle(el).transform;
    if (!t || t === "none") return 0;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    return parseFloat(m[1].split(",")[0]!);
  });
  expect(midScaleX).toBeGreaterThan(0.25);
  expect(midScaleX).toBeLessThan(0.9);

  // Complete near 2s total hold.
  await page.waitForTimeout(1100);
  await page.mouse.up();

  await expect(row).toHaveClass(/shelf-panel--pop-out/, { timeout: 800 });
  await expect(row).toHaveCount(0, { timeout: 3000 });
});
