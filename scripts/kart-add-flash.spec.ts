import { test, expect } from "@playwright/test";

test("add to kart never shows viewport-sized feed image", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3456/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));
  await page.reload({ waitUntil: "networkidle" });

  const btn = page.locator(".add-kart-btn");
  await expect(btn).toBeVisible();

  const escaped = await page.evaluate(async () => {
    const btn = document.querySelector<HTMLButtonElement>(".add-kart-btn");
    if (!btn) return { error: "no button" };

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let worst: { src: string; w: number; h: number; t: number } | null = null;

    const scan = () => {
      for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
        const r = img.getBoundingClientRect();
        if (r.width < vw * 0.75 || r.height < vh * 0.75) continue;
        const entry = {
          src: img.src.slice(-48),
          w: Math.round(r.width),
          h: Math.round(r.height),
          t: performance.now(),
        };
        if (!worst || r.width * r.height > worst.w * worst.h) worst = entry;
      }
    };

    const until = performance.now() + 1200;
    btn.click();
    while (performance.now() < until) {
      scan();
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    }
    return worst;
  });

  expect(escaped, JSON.stringify(escaped)).toBeNull();
});

test("add to kart after scrolling to more toys feed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3456/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));
  await page.reload({ waitUntil: "networkidle" });

  await page.locator(".more-toys-feed").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const escaped = await page.evaluate(async () => {
    const btn = document.querySelector<HTMLButtonElement>(".add-kart-btn");
    if (!btn) return { error: "no button" };

    btn.scrollIntoView({ block: "center" });
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let worst: { src: string; w: number; h: number; t: number } | null = null;

    const scan = () => {
      for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
        const r = img.getBoundingClientRect();
        if (r.width < vw * 0.75 || r.height < vh * 0.75) continue;
        const entry = {
          src: img.src.slice(-48),
          w: Math.round(r.width),
          h: Math.round(r.height),
          t: performance.now(),
        };
        if (!worst || r.width * r.height > worst.w * worst.h) worst = entry;
      }
    };

    const until = performance.now() + 1200;
    btn.click();
    while (performance.now() < until) {
      scan();
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    }
    return worst;
  });

  expect(escaped, JSON.stringify(escaped)).toBeNull();
});
