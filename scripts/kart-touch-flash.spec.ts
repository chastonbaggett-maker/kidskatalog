import { test, expect } from "@playwright/test";

test("coarse pointer add-to-kart has no viewport flash", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches:
          query.includes("pointer: coarse") ||
          query.includes("display-mode: standalone"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    localStorage.setItem(
      "kidskatalog-crazy-mode",
      JSON.stringify({ state: { crazyMode: false }, version: 0 }),
    );
  });

  await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));
  await page.locator(".more-toys-feed").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    type Snapshot = { w: number; h: number; overlapPct: number };
    type Hit = {
      t: number;
      kind: string;
      cls: string;
      w: number;
      h: number;
      overlapPct: number;
    };

    const baseline = new Map<string, Snapshot>();
    const hits: Hit[] = [];
    const t0 = performance.now();
    let clicked = false;

    (window as unknown as { __touchFlash: { hits: Hit[]; clicked: () => void } }).__touchFlash =
      {
        hits,
        clicked: () => {
          clicked = true;
        },
      };

    const overlapPct = (r: DOMRect, vw: number, vh: number) => {
      const ow = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const oh = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      return Math.round(((ow * oh) / (vw * vh)) * 100);
    };

    const scan = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      const t = Math.round(performance.now() - t0);

      for (const el of document.querySelectorAll<HTMLElement>(
        "img, .feed-card__photo, .feed-card__view-btn, .product-gallery__photo",
      )) {
        const r = el.getBoundingClientRect();
        const pct = overlapPct(r, vw, vh);
        const key = `${el.className}|${Math.round(r.top)}|${Math.round(r.left)}`;
        const snap = { w: Math.round(r.width), h: Math.round(r.height), overlapPct: pct };

        if (!clicked) {
          baseline.set(key, snap);
          continue;
        }

        const before = baseline.get(key);
        const grewToFullscreen =
          snap.w >= vw * 0.85 &&
          snap.h >= vh * 0.55 &&
          (!before || before.w < vw * 0.55 || before.h < vh * 0.4);
        const overlapSpike =
          snap.overlapPct >= 55 &&
          (!before || before.overlapPct < snap.overlapPct - 25);

        if (grewToFullscreen || overlapSpike) {
          hits.push({
            t,
            kind: el.tagName,
            cls: el.className,
            w: snap.w,
            h: snap.h,
            overlapPct: snap.overlapPct,
          });
        }
      }

      if (performance.now() - t0 < 2200) requestAnimationFrame(scan);
    };
    requestAnimationFrame(scan);
  });

  await page.locator(".add-kart-btn").click();
  await page.evaluate(() => {
    (window as unknown as { __touchFlash: { clicked: () => void } }).__touchFlash.clicked();
  });
  await page.waitForFunction(() =>
    localStorage.getItem("kidskatalog-kart")?.includes("sky-rocket"),
  );
  await page.waitForTimeout(1400);

  const result = await page.evaluate(() => {
    const hits =
      (window as unknown as { __touchFlash: { hits: unknown[] } }).__touchFlash.hits ?? [];
    return {
      reducedFlag:
        document.documentElement.getAttribute("data-kart-effects-reduced") === "true",
      flyBall: document.querySelector(".kart-fly-ball") != null,
      hits: hits.length,
      sample: hits.slice(0, 6),
    };
  });

  console.log("TOUCH_FLASH", JSON.stringify(result));
  expect(result.reducedFlag).toBe(true);
  expect(result.flyBall).toBe(false);
  expect(result.hits, JSON.stringify(result.sample)).toBe(0);
});
