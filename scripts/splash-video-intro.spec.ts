import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

test("splash plays part1, holds, then part2 reveals a loaded shop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });

  const splash = page.locator(".app-splash");
  await expect(splash).toBeVisible();
  await expect(page.locator(".app-splash__video--part1")).toHaveClass(
    /is-active/,
  );

  // Wait for part1 to finish and hold on the end frame.
  await expect(splash).toHaveClass(/app-splash--hold/, { timeout: 12_000 });
  await expect(page.getByText("Tap to continue")).toBeVisible();

  // Shell should be warm under the overlay once holding + page ready.
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const state = document.documentElement.dataset.splash;
        const shell = document.querySelector(".app-shell");
        const cs = shell ? getComputedStyle(shell) : null;
        return {
          state,
          shellVisible: cs?.visibility === "visible",
          hasFeed: document.querySelectorAll(".feed-card").length > 0,
        };
      });
    }, { timeout: 10_000 })
    .toMatchObject({
      state: "holding",
      shellVisible: true,
      hasFeed: true,
    });

  await splash.click();
  await expect(splash).toHaveClass(/app-splash--part2/, { timeout: 3_000 });
  await expect(page.locator(".app-splash__video--part2")).toHaveClass(
    /is-active/,
  );

  // After part2, splash clears and the already-loaded shop is interactive.
  await expect(splash).toBeHidden({ timeout: 8_000 });
  await expect
    .poll(async () => {
      return page.evaluate(() => document.documentElement.dataset.splash ?? null);
    })
    .toBeNull();
  await expect(page.locator(".feed-card").first()).toBeVisible();
  await expect(page.locator("nav.bottom-nav")).toBeVisible();
});
