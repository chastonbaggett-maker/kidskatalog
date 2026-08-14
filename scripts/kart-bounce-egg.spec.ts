import { test, expect } from "@playwright/test";

test("five quick kart taps launch loft balls that burst into confetti", async ({
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

  await page.waitForTimeout(80);
  const launched = await page.locator(".kart-bounce-ball").count();
  expect(launched).toBeGreaterThan(0);

  await page.waitForFunction(
    () => document.querySelectorAll(".add-kart-confetti__bit").length > 0,
    { timeout: 3000 },
  );

  const confetti = await page.locator(".add-kart-confetti__bit").count();
  expect(confetti).toBeGreaterThan(0);
});
