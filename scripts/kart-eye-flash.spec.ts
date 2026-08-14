import { test, expect } from "@playwright/test";

test.describe("eye icon flash on add-to-kart", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem(
        "kidskatalog-crazy-mode",
        JSON.stringify({ state: { crazyMode: false }, version: 0 }),
      );
    });
  });

  for (const scroll of ["top", "more-toys"] as const) {
    test(`no fullscreen eye at scroll=${scroll}`, async ({ page }) => {
      await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
      await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));

      if (scroll === "more-toys") {
        await page.locator(".more-toys-feed").scrollIntoViewIfNeeded();
      } else {
        await page.evaluate(() => {
          const s = document.querySelector(".page-scroll");
          if (s) s.scrollTop = 0;
        });
      }
      await page.waitForTimeout(300);

      await page.evaluate(() => {
        type Hit = { t: number; tag: string; cls: string; w: number; h: number };
        const hits: Hit[] = [];
        const t0 = performance.now();
        (window as unknown as { __eyeHits: Hit[] }).__eyeHits = hits;

        const scan = () => {
          const vw = innerWidth;
          const vh = innerHeight;
          for (const el of document.querySelectorAll<SVGElement | HTMLElement>(
            "svg, .feed-card__view-btn",
          )) {
            const r = el.getBoundingClientRect();
            const ow = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
            const oh = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
            const pct = (ow * oh) / (vw * vh);
            if (r.width >= vw * 0.45 || r.height >= vh * 0.45 || pct > 0.35) {
              hits.push({
                t: Math.round(performance.now() - t0),
                tag: el.tagName,
                cls: typeof el.className === "string" ? el.className : "",
                w: Math.round(r.width),
                h: Math.round(r.height),
              });
            }
          }
          if (performance.now() - t0 < 2500) requestAnimationFrame(scan);
        };
        requestAnimationFrame(scan);
      });

      await page.locator(".add-kart-btn").click();
      await page.waitForTimeout(2200);

      const result = await page.evaluate(() => {
        const hits =
          (window as unknown as { __eyeHits: unknown[] }).__eyeHits ?? [];
        const viewBtns = document.querySelectorAll(".feed-card__view-btn").length;
        const svgs = document.querySelectorAll(".feed-card svg").length;
        return { hits: hits.length, sample: hits.slice(0, 4), viewBtns, svgs };
      });

      console.log(`EYE_${scroll}`, JSON.stringify(result));
      expect(result.svgs, "feed cards should not use inline svg eye").toBe(0);
      expect(result.hits, JSON.stringify(result.sample)).toBe(0);
    });
  }
});
