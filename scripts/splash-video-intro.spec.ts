import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

test("splash part1 is mint/white, loads first frame, part2 waits for tap", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });

  const splash = page.locator(".app-splash");
  await expect(splash).toBeVisible();

  // First paint / part1 chrome is mint.
  const splashBg = await splash.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  expect(splashBg).toMatch(/rgb\(\s*62,\s*207,\s*192\s*\)/);

  // First-frame poster is visible immediately.
  const poster = page.locator(".app-splash__poster");
  await expect(poster).toBeVisible();
  await expect(poster).toHaveAttribute(
    "src",
    /intro-part-1-start\.jpg/,
  );

  // Part1 video starts at t≈0 (first frame).
  await expect
    .poll(async () => {
      return page.locator(".app-splash__video--part1").evaluate((el) => {
        const v = el as HTMLVideoElement;
        return {
          time: v.currentTime,
          ready: v.readyState,
          hasFrameReady: el.classList.contains("is-frame-ready"),
        };
      });
    }, { timeout: 8_000 })
    .toMatchObject({ hasFrameReady: true });

  const earlyTime = await page
    .locator(".app-splash__video--part1")
    .evaluate((el) => (el as HTMLVideoElement).currentTime);
  // Should have begun from the start (not mid/end).
  expect(earlyTime).toBeLessThan(1.25);

  // Wait for part1 to finish and hold on the end frame.
  await expect(splash).toHaveClass(/app-splash--hold/, { timeout: 12_000 });
  await expect(page.getByText("Tap to continue")).toBeVisible();
  await expect(splash).toHaveAttribute("data-splash-phase", "hold");

  // Part 2 must NOT start on its own while holding.
  await page.waitForTimeout(1200);
  await expect(splash).toHaveAttribute("data-splash-phase", "hold");
  await expect(page.locator(".app-splash__video--part2")).not.toHaveClass(
    /is-active/,
  );

  await splash.click();
  await expect(splash).toHaveClass(/app-splash--part2/, { timeout: 3_000 });

  // Part2 chrome flips to white (invert of part1).
  const part2Bg = await splash.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  expect(part2Bg).toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)/);

  await expect(splash).toBeHidden({ timeout: 8_000 });
  await expect(page.locator(".feed-card").first()).toBeVisible();
});
