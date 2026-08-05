import { test, expect } from "@playwright/test";

test.describe("page load image flash", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
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
    });
  });

  test("toy page load", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3456/toy/sky-rocket", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1500);

    const hits = await page.evaluate(
      () => (window as unknown as { __flashHits: unknown[] }).__flashHits,
    );
    expect(hits, JSON.stringify(hits.slice(0, 3))).toEqual([]);
  });

  test("shop page load", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3456/shop", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const hits = await page.evaluate(
      () => (window as unknown as { __flashHits: unknown[] }).__flashHits,
    );
    expect(hits, JSON.stringify(hits.slice(0, 3))).toEqual([]);
  });
});
