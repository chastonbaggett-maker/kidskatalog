import { test, expect } from "@playwright/test";

test("kart counter and nav pulse wait until fly ball lands", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/toy/glow-bow", { waitUntil: "networkidle" });
  await page.waitForSelector(".add-kart-btn");
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    localStorage.removeItem("kidskatalog-kart");
    location.reload();
  });
  await page.waitForSelector(".add-kart-btn");
  await page.waitForTimeout(1000);

  await page.exposeFunction("recordSample", (sample: unknown) => {
    (globalThis as { __samples?: unknown[] }).__samples ??= [];
    (globalThis as { __samples?: unknown[] }).__samples!.push(sample);
  });

  await page.evaluate(() => {
    (window as unknown as { __samples: unknown[] }).__samples = [];
    const id = window.setInterval(() => {
      const sample = {
        t: performance.now(),
        ball: document.querySelector(".kart-fly-ball") != null,
        landing: document.querySelector(".bottom-nav__kart--land") != null,
        badge:
          document.querySelector(".bottom-nav a[href='/kart']")?.textContent?.trim() ??
          "",
        pressed: document.querySelector(".add-kart-btn")?.getAttribute("aria-pressed"),
      };
      (window as unknown as { __samples: unknown[] }).__samples.push(sample);
    }, 16);
    (window as unknown as { __pollId: number }).__pollId = id;
  });

  const clickAt = Date.now();
  await page.locator(".add-kart-btn").click();
  await page.waitForSelector('.add-kart-btn[aria-pressed="true"]', {
    timeout: 10000,
  });
  await page.waitForTimeout(300);

  const samples = await page.evaluate(() => {
    window.clearInterval((window as unknown as { __pollId: number }).__pollId);
    return (window as unknown as { __samples: Array<{
      t: number;
      ball: boolean;
      landing: boolean;
      badge: string;
      pressed: string | null;
    }> }).__samples;
  });

  expect(samples.length).toBeGreaterThan(10);

  const firstLanding = samples.find((s) => s.landing);
  const firstBadgeOne = samples.find((s) => s.badge === "1");
  const firstPressed = samples.find((s) => s.pressed === "true");
  const lastBall = [...samples].reverse().find((s) => s.ball);

  expect(firstBadgeOne).toBeTruthy();
  expect(firstPressed).toBeTruthy();
  expect(clickAt).toBeGreaterThan(0);

  if (lastBall && firstBadgeOne) {
    expect(firstBadgeOne.t).toBeGreaterThanOrEqual(lastBall.t - 50);
  }

  if (lastBall && firstLanding) {
    expect(firstLanding.t).toBeGreaterThanOrEqual(lastBall.t - 50);
  }
});

test("opening a toy card does not pulse kart nav", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/shop", { waitUntil: "networkidle" });
  await page.waitForSelector(".feed-card");
  await page.waitForTimeout(1200);

  const hadLandingPulse = await page.evaluate(async () => {
    let landing = false;
    const id = window.setInterval(() => {
      if (document.querySelector(".bottom-nav__kart--land")) landing = true;
    }, 16);

    const card = document.querySelector(".feed-card a[href^='/toy/']") as
      | HTMLAnchorElement
      | null;
    card?.click();

    await new Promise((r) => window.setTimeout(r, 900));
    window.clearInterval(id);
    return landing;
  });

  expect(hadLandingPulse).toBe(false);
  await expect(page).toHaveURL(/\/toy\//);
});
