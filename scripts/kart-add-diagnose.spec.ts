import { test, expect } from "@playwright/test";

/**
 * High-frequency monitor tuned for add-to-kart landing window.
 * Logs hits + kart store transitions to stdout for debug analysis.
 */
test("diagnose add-to-kart flash windows", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.addInitScript(() => {
    type Hit = {
      t: number;
      src: string;
      w: number;
      h: number;
      cls: string;
      kartAddActive: number;
      flyBall: boolean;
    };
    const hits: Hit[] = [];
    (window as unknown as { __diag: { hits: Hit[] } }).__diag = { hits };

    const scan = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      const kart = (
        window as unknown as {
          __kartSnap?: { flyBall: boolean; kartAddActive: number };
        }
      ).__kartSnap ?? { flyBall: false, kartAddActive: 0 };

      for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
        const r = img.getBoundingClientRect();
        if (r.width >= vw * 0.65 && r.height >= vh * 0.6) {
          hits.push({
            t: Math.round(performance.now()),
            src: img.src.slice(-48),
            w: Math.round(r.width),
            h: Math.round(r.height),
            cls: img.className,
            kartAddActive: kart.kartAddActive,
            flyBall: kart.flyBall,
          });
        }
      }
      requestAnimationFrame(scan);
    };
    requestAnimationFrame(scan);
  });

  await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));

  // Enable crazy mode to test crazy-screen-flash hypothesis
  await page.evaluate(() => {
    localStorage.setItem(
      "kidskatalog-crazy-mode",
      JSON.stringify({ state: { crazyMode: true }, version: 0 }),
    );
  });
  await page.reload({ waitUntil: "networkidle" });

  await page.evaluate(() => {
    (window as unknown as { __diag: { hits: unknown[]; t0: number } }).__diag =
      { hits: [], t0: performance.now() };
  });

  // Poll kart store from page context via exposed hook
  await page.evaluate(() => {
    const snap = () => {
      const w = window as unknown as {
        __kartSnap?: { flyBall: boolean; kartAddActive: number };
      };
      // zustand store is not global — infer from DOM markers instead
      w.__kartSnap = {
        flyBall: !!document.querySelector(".kart-fly-ball"),
        kartAddActive: document.documentElement.classList.contains(
          "kart-add-active",
        )
          ? 1
          : 0,
      };
    };
    setInterval(snap, 16);
  });

  await page.locator(".more-toys-feed").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const tClick = Date.now();
  await page.locator(".add-kart-btn").click();
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    const diag = (
      window as unknown as {
        __diag: {
          hits: Array<{
            t: number;
            src: string;
            w: number;
            h: number;
            cls: string;
          }>;
          t0: number;
        };
      }
    ).__diag;
    const rel = diag.hits.map((h) => ({ ...h, t: h.t - diag.t0 }));
    const crazyFlashes = document.querySelectorAll(".crazy-screen-flash").length;
    return {
      hitCount: rel.length,
      sample: rel.slice(0, 8),
      crazyFlashes,
      clickToDone: performance.now() - diag.t0,
    };
  });

  console.log("DIAG_RESULT", JSON.stringify(result, null, 2));
  console.log("CLICK_AT", tClick);

  // Fail if any oversized toy photo flash detected
  expect(
    result.hitCount,
    `oversized img hits: ${JSON.stringify(result.sample)}`,
  ).toBe(0);
});
