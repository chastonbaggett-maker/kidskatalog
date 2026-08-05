import { test, expect } from "@playwright/test";

type Hit = {
  src: string;
  w: number;
  h: number;
  t: number;
  path: string;
  cls: string;
};

const MONITOR = () => {
  const hits: Hit[] = [];
  (window as unknown as { __flashHits: Hit[] }).__flashHits = hits;
  const start = performance.now();

  const scan = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
      const r = img.getBoundingClientRect();
      if (r.width >= vw * 0.7 && r.height >= vh * 0.65) {
        hits.push({
          src: img.src.slice(-64),
          w: Math.round(r.width),
          h: Math.round(r.height),
          t: Math.round(performance.now() - start),
          path: location.pathname,
          cls: img.className,
        });
      }
    }
    requestAnimationFrame(scan);
  };
  requestAnimationFrame(scan);
};

test.describe("flash stress", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(MONITOR);
  });

  test("shop scroll load-more", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      (window as unknown as { __flashHits: Hit[] }).__flashHits = [];
    });

    const scroller = page.locator(".page-scroll").first();
    for (let i = 0; i < 8; i++) {
      await scroller.evaluate((el) => {
        el.scrollTop += 700;
      });
      await page.waitForTimeout(350);
    }

    const hits = await page.evaluate(
      () => (window as unknown as { __flashHits: Hit[] }).__flashHits ?? [],
    );
    expect(hits, JSON.stringify(hits.slice(0, 5))).toEqual([]);
  });

  test("shop to toy to shop nav loop", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop", { waitUntil: "networkidle" });

    for (const toy of ["roar-rex", "sky-rocket", "roar-rex"]) {
      await page.evaluate(() => {
        (window as unknown as { __flashHits: Hit[] }).__flashHits = [];
      });
      await page.locator(`a[href="/toy/${toy}"]`).first().click();
      await page.waitForURL(`**/toy/${toy}`);
      await page.waitForTimeout(500);
      await page.locator(".shelf-back-btn").click();
      await page.waitForURL("**/shop");
      await page.waitForTimeout(500);
    }

    const hits = await page.evaluate(
      () => (window as unknown as { __flashHits: Hit[] }).__flashHits ?? [],
    );
    expect(hits, JSON.stringify(hits.slice(0, 5))).toEqual([]);
  });

  test("add to kart x3 on product page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const id of ["sky-rocket", "roar-rex", "sky-rocket"]) {
      await page.goto(`/toy/${id}`, { waitUntil: "networkidle" });
      await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));
      await page.evaluate(() => {
        (window as unknown as { __flashHits: Hit[] }).__flashHits = [];
      });
      await page.locator(".add-kart-btn").click();
      await page.waitForTimeout(1200);
      await page.locator(".add-kart-btn").click(); // remove
      await page.waitForTimeout(900);
    }

    const hits = await page.evaluate(
      () => (window as unknown as { __flashHits: Hit[] }).__flashHits ?? [],
    );
    expect(hits, JSON.stringify(hits.slice(0, 5))).toEqual([]);
  });
});
