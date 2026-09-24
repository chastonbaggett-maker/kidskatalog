import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

test("splash is 80% scale, mint-stable, and freezes on true last frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });

  const splash = page.locator(".app-splash");
  await expect(splash).toBeVisible();

  // Mint matches encoded frames (61, 208, 192) — no open color shift to brand mint.
  const splashBg = await splash.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  expect(splashBg).toMatch(/rgb\(\s*61,\s*208,\s*192\s*\)/);

  const stageScale = await page.locator(".app-splash__stage").evaluate((el) => {
    const t = getComputedStyle(el).transform;
    // matrix(sx, 0, 0, sy, ...) or matrix3d
    const m = t.match(/matrix\(([^,]+)/);
    return m ? Number.parseFloat(m[1]) : 1;
  });
  expect(stageScale).toBeCloseTo(0.8, 2);

  await expect(splash).toHaveClass(/app-splash--hold/, { timeout: 12_000 });
  await expect(page.getByText("Tap to continue")).toBeVisible();

  // Hold uses the static true last frame — video must not seek backwards.
  const holdState = await page.evaluate(() => {
    const end = document.querySelector(
      ".app-splash__end-frame",
    ) as HTMLImageElement | null;
    const video = document.querySelector(
      ".app-splash__video--part1",
    ) as HTMLVideoElement | null;
    return {
      endVisible: end?.classList.contains("is-visible") ?? false,
      endSrc: end?.getAttribute("src") ?? "",
      paused: video?.paused ?? true,
      currentTime: video?.currentTime ?? 0,
      duration: video?.duration ?? 0,
    };
  });

  expect(holdState.endVisible).toBe(true);
  expect(holdState.endSrc).toContain("intro-part-1-mint-end");
  expect(holdState.paused).toBe(true);
  // Must be near the end — not jumped back to an earlier keyframe.
  expect(holdState.currentTime).toBeGreaterThan(holdState.duration - 0.2);

  // Stay frozen (no time regression) while holding.
  await page.waitForTimeout(400);
  const laterTime = await page
    .locator(".app-splash__video--part1")
    .evaluate((el) => (el as HTMLVideoElement).currentTime);
  expect(laterTime).toBeGreaterThanOrEqual(holdState.currentTime - 0.01);

  await splash.click();
  await expect(splash).toHaveClass(/app-splash--part2/, { timeout: 3_000 });
});
