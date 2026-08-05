import { test, expect } from "@playwright/test";

const monitorScript = () => {
  const hits: Array<{ src: string; w: number; h: number; t: number }> = [];
  (window as unknown as { __flashHits: typeof hits }).__flashHits = hits;

  const scan = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
      const r = img.getBoundingClientRect();
      if (r.width >= vw * 0.75 && r.height >= vh * 0.75) {
        hits.push({
          src: img.src.slice(-56),
          w: Math.round(r.width),
          h: Math.round(r.height),
          t: Math.round(performance.now()),
        });
      }
    }
    requestAnimationFrame(scan);
  };

  requestAnimationFrame(scan);
};

test.describe("kart add image flash", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(monitorScript);
  });

  test("add to kart from product header", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3456/toy/sky-rocket", {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));

    await page.locator(".add-kart-btn").click();
    await page.waitForTimeout(1200);

    const hits = await page.evaluate(
      () => (window as unknown as { __flashHits: unknown[] }).__flashHits,
    );
    expect(hits, JSON.stringify(hits.slice(0, 3))).toEqual([]);
  });

  test("add to kart with more toys feed visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3456/toy/sky-rocket", {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));
    await page.locator(".more-toys-feed").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    await page.locator(".add-kart-btn").click();
    await page.waitForTimeout(1200);

    const hits = await page.evaluate(
      () => (window as unknown as { __flashHits: unknown[] }).__flashHits,
    );
    expect(hits, JSON.stringify(hits.slice(0, 3))).toEqual([]);
  });
});
