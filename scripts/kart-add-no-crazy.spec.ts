import { test, expect } from "@playwright/test";

/**
 * Deep monitor with crazy mode explicitly OFF.
 * Logs every oversized img hit with class + kart state for debug analysis.
 */
test.describe("add-to-kart flash (crazy mode OFF)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem(
        "kidskatalog-crazy-mode",
        JSON.stringify({ state: { crazyMode: false }, version: 0 }),
      );
    });
  });

  test("10 rapid add/remove cycles with more toys visible", async ({ page }) => {
    await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));

    await page.locator(".more-toys-feed").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      type Hit = {
        t: number;
        src: string;
        cls: string;
        w: number;
        h: number;
        kartActive: boolean;
        flyBall: boolean;
        cardCount: number;
      };
      const hits: Hit[] = [];
      const t0 = performance.now();
      (window as unknown as { __ncHits: Hit[]; __ncT0: number }).__ncHits = hits;
      (window as unknown as { __ncT0: number }).__ncT0 = t0;

      const scan = () => {
        const vw = innerWidth;
        const vh = innerHeight;
        const kartActive = document.documentElement.classList.contains(
          "kart-effect-active",
        );
        const flyBall = !!document.querySelector(".kart-fly-ball");

        for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
          const r = img.getBoundingClientRect();
          if (r.width >= vw * 0.65 && r.height >= vh * 0.55) {
            hits.push({
              t: Math.round(performance.now() - t0),
              src: img.src.slice(-56),
              cls: img.className,
              w: Math.round(r.width),
              h: Math.round(r.height),
              kartActive,
              flyBall,
              cardCount: document.querySelectorAll("[data-feed-slot]").length,
            });
          }
        }
        requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    });

    for (let i = 0; i < 10; i++) {
      await page.locator(".add-kart-btn").click();
      await page.waitForTimeout(900);
      await page.locator(".add-kart-btn").click(); // remove
      await page.waitForTimeout(700);
    }

    const result = await page.evaluate(() => {
      const hits =
        (window as unknown as { __ncHits: Array<{ t: number; cls: string }> })
          .__ncHits ?? [];
      const heroHits = hits.filter((h) => h.cls.includes("product-gallery"));
      const feedHits = hits.filter((h) => h.cls.includes("feed-card"));
      const crazyOn = document.querySelector(".page-scroll--crazy") != null;
      return {
        totalHits: hits.length,
        heroHits: heroHits.length,
        feedHits: feedHits.length,
        sample: hits.slice(0, 6),
        crazyOn,
        kartClassNow: document.documentElement.classList.contains(
          "kart-effect-active",
        ),
      };
    });

    console.log("NO_CRAZY_RESULT", JSON.stringify(result, null, 2));
    expect(result.crazyOn, "crazy mode must be off").toBe(false);
    expect(
      result.totalHits,
      `oversized img during kart add (crazy off): ${JSON.stringify(result.sample)}`,
    ).toBe(0);
  });

  test("load-more blocked during kart add", async ({ page }) => {
    await page.route("**/api/catalog?**", async (route) => {
      await new Promise((r) => setTimeout(r, 350));
      await route.continue();
    });

    await page.goto("/toy/roar-rex", { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));

    await page.locator(".more-toys-feed").scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const scroller = document.querySelector(".page-scroll");
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    });
    await page.waitForTimeout(200);

    const beforeCount = await page.evaluate(
      () => document.querySelectorAll("[data-feed-slot]").length,
    );

    await page.locator(".add-kart-btn").click();
    await page.waitForTimeout(500);

    const afterCount = await page.evaluate(
      () => document.querySelectorAll("[data-feed-slot]").length,
    );

    expect(afterCount, "cards should not load-more during kart add").toBe(
      beforeCount,
    );
  });

  test("kart-effect-active class toggles on click", async ({ page }) => {
    await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));

    await page.locator(".add-kart-btn").click();

    const during = await page.evaluate(() =>
      document.documentElement.classList.contains("kart-effect-active"),
    );
    expect(during, "kart-effect-active should be on during add").toBe(true);

    await page.waitForTimeout(2500);

    const after = await page.evaluate(() =>
      document.documentElement.classList.contains("kart-effect-active"),
    );
    expect(after, "kart-effect-active should clear after settle").toBe(false);
  });
});
