import { test, expect } from "@playwright/test";

test("diagnose flash sources in the first 400ms after add click", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidskatalog-crazy-mode",
      JSON.stringify({ state: { crazyMode: false }, version: 0 }),
    );
  });

  await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.waitForSelector(".add-kart-btn");
  await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    type Sample = {
      t: number;
      sheets: number;
      bodyFont: string;
      htmlAttrs: string;
      flyBall: boolean;
      fxChildren: number;
      badge: string;
      btnIn: boolean;
      imgFlash: number;
      viewBtnFlash: number;
      largestCls: string;
      largestPct: number;
    };
    const samples: Sample[] = [];
    (window as unknown as { __clickDiag: Sample[] }).__clickDiag = samples;
    const t0 = performance.now();

    const scan = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      let imgFlash = 0;
      let viewBtnFlash = 0;
      let largestPct = 0;
      let largestCls = "";

      for (const el of document.querySelectorAll<HTMLElement>(
        "img, .feed-card__photo, .product-gallery__photo, .feed-card__view-btn, svg",
      )) {
        const r = el.getBoundingClientRect();
        const ow = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
        const oh = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        const pct = Math.round(((ow * oh) / (vw * vh)) * 100);
        if (pct > largestPct) {
          largestPct = pct;
          largestCls = el.className || el.tagName;
        }
        if (pct >= 45) {
          if (el.classList.contains("feed-card__view-btn")) viewBtnFlash += 1;
          else imgFlash += 1;
        }
      }

      samples.push({
        t: Math.round(performance.now() - t0),
        sheets: document.styleSheets.length,
        bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 48),
        htmlAttrs: document.documentElement.getAttributeNames().join(","),
        flyBall: document.querySelector(".kart-fly-ball") != null,
        fxChildren: document.getElementById("kart-fx-root")?.childElementCount ?? -1,
        badge:
          document.querySelector(".bottom-nav a[href='/kart']")?.textContent?.trim() ??
          "",
        btnIn: document.querySelector(".add-kart-btn--in") != null,
        imgFlash,
        viewBtnFlash,
        largestCls: String(largestCls).slice(0, 40),
        largestPct,
      });

      if (performance.now() - t0 < 800) requestAnimationFrame(scan);
    };
    requestAnimationFrame(scan);
  });

  await page.locator(".add-kart-btn").click();
  await page.waitForTimeout(900);

  const result = await page.evaluate(() => {
    const samples =
      (window as unknown as { __clickDiag: Array<Record<string, unknown>> })
        .__clickDiag ?? [];
    const early = samples.filter((s) => (s.t as number) <= 400);
    const flash = early.filter(
      (s) => (s.imgFlash as number) > 0 || (s.viewBtnFlash as number) > 0,
    );
    const sheetCounts = early.map((s) => s.sheets as number);
    const fonts = new Set(early.map((s) => s.bodyFont as string));
    const flyStart = early.find((s) => s.flyBall);
    const badgeStart = early.find((s) => s.badge === "1");
    const btnIn = early.find((s) => s.btnIn);
    return {
      earlyCount: early.length,
      flashCount: flash.length,
      flashSamples: flash.slice(0, 6),
      minSheets: Math.min(...sheetCounts),
      maxSheets: Math.max(...sheetCounts),
      fontCount: fonts.size,
      flyAt: flyStart?.t ?? null,
      badgeAt: badgeStart?.t ?? null,
      btnInAt: btnIn?.t ?? null,
      peakLargest: early.reduce(
        (a, s) =>
          (s.largestPct as number) > (a.largestPct as number) ? s : a,
        early[0] ?? { largestPct: 0, largestCls: "", t: 0 },
      ),
      timeline: early.filter((_, i) => i % 3 === 0).slice(0, 12),
    };
  });

  console.log("CLICK_FLASH_DIAG", JSON.stringify(result, null, 2));
  expect(result.btnInAt).not.toBeNull();
});
