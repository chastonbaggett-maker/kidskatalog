import { test, expect } from "@playwright/test";

/**
 * Flash window tuned to kart nav pulse (~700–1300ms after click on mobile viewport).
 */
test("no oversized image flash during kart nav pulse window", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidskatalog-crazy-mode",
      JSON.stringify({ state: { crazyMode: false }, version: 0 }),
    );
  });

  await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));
  await page.locator(".more-toys-feed").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    type Hit = {
      t: number;
      src: string;
      cls: string;
      w: number;
      h: number;
      landing: boolean;
    };
    const hits: Hit[] = [];
    const t0 = performance.now();
    (window as unknown as { __pulseHits: Hit[] }).__pulseHits = hits;

    const scan = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      const landing = document.querySelector(".bottom-nav--kart-landing") != null;

      for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
        const r = img.getBoundingClientRect();
        if (r.width >= vw * 0.65 && r.height >= vh * 0.55) {
          const t = Math.round(performance.now() - t0);
          if (t >= 500 && t <= 1500) {
            hits.push({
              t,
              src: img.src.slice(-48),
              cls: img.className,
              w: Math.round(r.width),
              h: Math.round(r.height),
              landing,
            });
          }
        }
      }
      requestAnimationFrame(scan);
    };
    requestAnimationFrame(scan);
  });

  await page.locator(".add-kart-btn").click();
  await page.waitForTimeout(1600);

  const result = await page.evaluate(() => {
    const hits =
      (window as unknown as {
        __pulseHits: Array<{ t: number; cls: string; landing: boolean }>;
      }).__pulseHits ?? [];
    return {
      pulseHits: hits.length,
      sample: hits.slice(0, 5),
      sawLanding: !!document.querySelector(".bottom-nav--kart-landing"),
      navLandingClass: document
        .querySelector(".bottom-nav")
        ?.classList.contains("bottom-nav--kart-landing"),
    };
  });

  console.log("PULSE_WINDOW", JSON.stringify(result, null, 2));
  expect(
    result.pulseHits,
    `flash during nav pulse: ${JSON.stringify(result.sample)}`,
  ).toBe(0);
});
