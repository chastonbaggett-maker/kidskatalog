import { test, expect } from "@playwright/test";

test.describe("navigation image flash", () => {
  test("shop to product navigation avoids fullscreen toy photos", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3456/shop", { waitUntil: "networkidle" });

    await page.evaluate(() => {
      (window as unknown as { __navFlashHits: unknown[] }).__navFlashHits = [];
      const start = performance.now();
      const scan = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
          const r = img.getBoundingClientRect();
          if (r.width >= vw * 0.95 || r.height >= vh * 0.85) {
            (window as unknown as { __navFlashHits: unknown[] }).__navFlashHits.push({
              src: img.src.slice(-48),
              w: Math.round(r.width),
              h: Math.round(r.height),
              t: Math.round(performance.now() - start),
              path: location.pathname,
            });
          }
        }
        requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    });

    await page.click('a[href="/toy/roar-rex"]');
    await page.waitForURL("**/toy/roar-rex");
    await page.waitForTimeout(800);

    const hits = await page.evaluate(
      () => (window as unknown as { __navFlashHits: unknown[] }).__navFlashHits,
    );
    const early = (hits as Array<{ t: number }>).filter((h) => h.t < 400);

    expect(early, JSON.stringify(early.slice(0, 3))).toEqual([]);
  });

  test("product back to shop navigation avoids fullscreen toy photos", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3456/toy/roar-rex", { waitUntil: "networkidle" });

    await page.evaluate(() => {
      (window as unknown as { __navFlashHits: unknown[] }).__navFlashHits = [];
      const start = performance.now();
      const scan = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
          const r = img.getBoundingClientRect();
          if (r.width >= vw * 0.95 || r.height >= vh * 0.85) {
            (window as unknown as { __navFlashHits: unknown[] }).__navFlashHits.push({
              src: img.src.slice(-48),
              w: Math.round(r.width),
              h: Math.round(r.height),
              t: Math.round(performance.now() - start),
              path: location.pathname,
            });
          }
        }
        requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    });

    await page.click(".shelf-back-btn");
    await page.waitForURL("**/shop");
    await page.waitForTimeout(800);

    const hits = await page.evaluate(
      () => (window as unknown as { __navFlashHits: unknown[] }).__navFlashHits,
    );
    const early = (hits as Array<{ t: number }>).filter((h) => h.t < 400);

    expect(early, JSON.stringify(early.slice(0, 3))).toEqual([]);
  });
});
