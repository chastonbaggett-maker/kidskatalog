import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

test("splash part1 is full-size mint plate with stable color and last-frame hold", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });

  const splash = page.locator(".app-splash");
  await expect(splash).toBeVisible();

  // Brand mint plate — same throughout part 1.
  const samples: string[] = [];
  for (let i = 0; i < 6; i++) {
    samples.push(
      await splash.evaluate((el) => getComputedStyle(el).backgroundColor),
    );
    await page.waitForTimeout(150);
  }
  for (const bg of samples) {
    expect(bg).toMatch(/rgb\(\s*62,\s*207,\s*192\s*\)/);
  }

  // Full size — no shrink transform on the stage.
  const stageTransform = await page
    .locator(".app-splash__stage")
    .evaluate((el) => getComputedStyle(el).transform);
  expect(stageTransform === "none" || /matrix\(1,\s*0,\s*0,\s*1/.test(stageTransform)).toBe(
    true,
  );

  // Part1 video uses screen blend over the mint plate.
  const blend = await page
    .locator(".app-splash__video--part1")
    .evaluate((el) => getComputedStyle(el).mixBlendMode);
  expect(blend).toBe("screen");

  await expect(splash).toHaveClass(/app-splash--hold/, { timeout: 12_000 });
  await expect(page.locator(".app-splash__end-frame.is-visible")).toBeVisible();

  const holdBg = await splash.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  expect(holdBg).toMatch(/rgb\(\s*62,\s*207,\s*192\s*\)/);

  await splash.click();
  await expect(splash).toHaveClass(/app-splash--part2/, { timeout: 3_000 });
});
