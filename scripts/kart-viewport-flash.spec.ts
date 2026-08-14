import { test, expect } from "@playwright/test";

/** Detect img that visually covers the viewport (intersects + large overlap). */
function isViewportFlash(img: DOMRect, vw: number, vh: number) {
  const overlapW = Math.max(0, Math.min(img.right, vw) - Math.max(img.left, 0));
  const overlapH = Math.max(0, Math.min(img.bottom, vh) - Math.max(img.top, 0));
  const overlapArea = overlapW * overlapH;
  const viewportArea = vw * vh;
  return overlapArea >= viewportArea * 0.45;
}

test("precise viewport flash detection at kart pulse", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3456/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("kidskatalog-kart");
    localStorage.setItem(
      "kidskatalog-crazy-mode",
      JSON.stringify({ state: { crazyMode: false }, version: 0 }),
    );
  });

  await page.evaluate(() => {
    type Hit = {
      t: number;
      src: string;
      cls: string;
      overlapPct: number;
      kartEffect: boolean;
      kartLanding: boolean;
    };
    const hits: Hit[] = [];
    const t0 = performance.now();
    (window as unknown as { __vhits: Hit[] }).__vhits = hits;

    const scan = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      const kartEffect = document.documentElement.classList.contains("kart-effect-active");
      const kartLanding = document.querySelector(".bottom-nav--kart-landing") != null;

      for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
        const r = img.getBoundingClientRect();
        const overlapW = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
        const overlapH = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        const overlapPct = Math.round(
          ((overlapW * overlapH) / (vw * vh)) * 100,
        );
        if (overlapPct >= 45) {
          hits.push({
            t: Math.round(performance.now() - t0),
            src: img.src.slice(-48),
            cls: img.className,
            overlapPct,
            kartEffect,
            kartLanding,
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
    const hits = (window as unknown as { __vhits: Array<Record<string, unknown>> }).__vhits ?? [];
    const flags = hits.map((h) => ({
      t: h.t,
      kartEffect: h.kartEffect,
      kartLanding: h.kartLanding,
    }));
    const flashHits = hits.filter((h) => (h.overlapPct as number) >= 55);
    const pulseWindow = hits.filter(
      (h) => (h.t as number) >= 500 && (h.t as number) <= 1400,
    );
    const uniqueFlash = [...new Map(flashHits.map((h) => [h.t + h.src, h])).values()];
    return {
      totalSamples: hits.length,
      flashCount: uniqueFlash.length,
      flashSamples: uniqueFlash.slice(0, 6),
      pulseWindowSamples: pulseWindow.length,
      kartEffectEver: flags.some((f) => f.kartEffect),
      kartLandingEver: flags.some((f) => f.kartLanding),
      flagTimeline: flags.filter((_, i) => i % 8 === 0).slice(0, 20),
    };
  });

  console.log("VIEWPORT_FLASH", JSON.stringify(result, null, 2));

  expect(result.kartEffectEver, "kart-effect-active must engage during add").toBe(true);
  expect(result.kartLandingEver, "bottom-nav--kart-landing must engage during pulse").toBe(
    true,
  );
  expect(
    result.flashCount,
    `viewport flash: ${JSON.stringify(result.flashSamples)}`,
  ).toBe(0);
});
