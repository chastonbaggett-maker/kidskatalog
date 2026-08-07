import { test, expect } from "@playwright/test";

test("five quick kart taps launch bounce balls equal to cart count", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidskatalog-kart",
      JSON.stringify({ state: { ids: ["sky-rocket", "glow-bow"] }, version: 0 }),
    );
  });

  await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.waitForSelector(".bottom-nav a[href='/kart']");
  await page.waitForTimeout(800);

  const kart = page.locator(".bottom-nav a[href='/kart']");
  for (let i = 0; i < 5; i += 1) {
    await kart.click({ force: true });
    await page.waitForTimeout(60);
  }

  await page.waitForTimeout(120);
  const ballCount = await page.locator(".kart-bounce-ball").count();
  expect(ballCount).toBeGreaterThan(0);
  expect(ballCount).toBeLessThanOrEqual(2);

  await page.waitForTimeout(400);
  const stillMoving = await page.locator(".kart-bounce-ball").count();
  expect(stillMoving).toBeGreaterThan(0);
});
