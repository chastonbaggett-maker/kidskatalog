import { test, expect } from "@playwright/test";

/**
 * Crazy mode now shuffles like Randomize (no catalog/random fetch).
 * Kart add should not leave oversized image flashes on screen.
 */
test("kart add stays clean while crazy mode is armed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("kidskatalog-kart");
    localStorage.setItem(
      "kidskatalog-crazy-mode",
      JSON.stringify({ state: { crazyMode: true }, version: 0 }),
    );
  });
  await page.reload({ waitUntil: "networkidle" });

  await page.locator(".add-kart-btn").click();
  await page.waitForTimeout(900);

  const after = await page.evaluate(() => ({
    oversized: Array.from(document.querySelectorAll<HTMLImageElement>("img"))
      .filter((img) => {
        const r = img.getBoundingClientRect();
        return r.width >= innerWidth * 0.7 && r.height >= innerHeight * 0.65;
      })
      .map((img) => ({ src: img.src.slice(-48), w: img.width, h: img.height })),
  }));

  expect(after.oversized, JSON.stringify(after.oversized)).toEqual([]);
});
