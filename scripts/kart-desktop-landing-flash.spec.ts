import { test, expect } from "@playwright/test";

/** Desktop fly-ball path: no stylesheet drop or viewport flash at landing. */
test("desktop fly-ball landing does not flash unstyled", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidskatalog-crazy-mode",
      JSON.stringify({ state: { crazyMode: false }, version: 0 }),
    );
  });

  await page.goto("/toy/sky-rocket", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".add-kart-btn");
  await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    type Sample = {
      t: number;
      sheets: number;
      bodyFont: string;
      shellBg: string;
      flyBall: boolean;
      landing: boolean;
      imgFlash: number;
    };
    const samples: Sample[] = [];
    const t0 = performance.now();
    (window as unknown as { __desk: Sample[] }).__desk = samples;

    const scan = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      let imgFlash = 0;
      for (const el of document.querySelectorAll<HTMLElement>(
        "img, .feed-card__photo, .product-gallery__photo",
      )) {
        const r = el.getBoundingClientRect();
        if (r.width >= vw * 0.85 && r.height >= vh * 0.55) imgFlash += 1;
      }

      const shell = document.querySelector(".app-shell");
      samples.push({
        t: Math.round(performance.now() - t0),
        sheets: document.styleSheets.length,
        bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 40),
        shellBg: shell ? getComputedStyle(shell).backgroundColor : "none",
        flyBall: document.querySelector(".kart-fly-ball") != null,
        landing: document.querySelector(".bottom-nav__kart--land") != null,
        imgFlash,
      });

      if (performance.now() - t0 < 2500) requestAnimationFrame(scan);
    };
    requestAnimationFrame(scan);
  });

  await page.locator(".add-kart-btn").click();
  await page.waitForTimeout(2200);

  const result = await page.evaluate(() => {
    const samples =
      (window as unknown as { __desk: Array<Record<string, unknown>> }).__desk ??
      [];
    const sheetCounts = samples.map((s) => s.sheets as number);
    const minSheets = Math.min(...sheetCounts);
    const maxSheets = Math.max(...sheetCounts);
    const landingWindow = samples.filter(
      (s) => (s.t as number) >= 550 && (s.t as number) <= 1200,
    );
    const imgFlashHits = landingWindow.filter((s) => (s.imgFlash as number) > 0);
    const fontStable = new Set(samples.map((s) => s.bodyFont)).size <= 1;
    const kart = localStorage.getItem("kidskatalog-kart") ?? "";
    return {
      minSheets,
      maxSheets,
      fontStable,
      imgFlashHits: imgFlashHits.length,
      imgSamples: imgFlashHits.slice(0, 4),
      landingSamples: landingWindow.filter((s) => s.landing).slice(0, 4),
      kartHasToy: kart.includes("sky-rocket"),
    };
  });

  console.log("DESKTOP_LANDING", JSON.stringify(result));
  expect(result.kartHasToy).toBe(true);
  expect(result.maxSheets - result.minSheets, "stylesheet count dropped").toBe(0);
  expect(result.fontStable).toBe(true);
  expect(result.imgFlashHits, JSON.stringify(result.imgSamples)).toBe(0);
});
