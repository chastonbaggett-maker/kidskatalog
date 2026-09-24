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

  // Tap briefly — must not remove.
  const box = await removeBtn.boundingBox();
  expect(box).toBeTruthy();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.up();
  await page.waitForTimeout(200);
  await expect(row).toBeVisible();
  await expect(removeBtn).toHaveAttribute("data-hold-progress", "0.00");

  // Hold for 2s.
  await page.mouse.move(x, y);
  await page.mouse.down();

  await page.waitForTimeout(1000);
  const mid = parseFloat((await removeBtn.getAttribute("data-hold-progress")) || "0");
  expect(mid).toBeGreaterThan(0.3);
  expect(mid).toBeLessThan(0.95);

  const fillTransform = await removeBtn
    .locator(".hold-to-remove__fill")
    .evaluate((el) => getComputedStyle(el).transform);
  expect(fillTransform).not.toBe("none");
  expect(fillTransform).not.toMatch(/^matrix\(0(?:\.0+)?,/);

  await page.waitForTimeout(1200);
  await page.mouse.up();

  await expect(row).toHaveClass(/shelf-panel--pop-out/, { timeout: 1500 });
  await expect(row).toHaveCount(0, { timeout: 3000 });
});
