import { test, expect } from "@playwright/test";

test("add is instant; only kart nav pulse waits for fly ball landing", async ({
  page,
}) => {
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
        mint: document.querySelector(".add-kart-btn--in") != null,
        inStore: (localStorage.getItem("kidskatalog-kart") ?? "").includes("glow-bow"),
      };
      (window as unknown as { __samples: unknown[] }).__samples.push(sample);
    }, 16);
    (window as unknown as { __pollId: number }).__pollId = id;
  });

  await page.locator(".add-kart-btn").click();
  await page.waitForSelector('.add-kart-btn[aria-pressed="true"]', {
    timeout: 10000,
  });
  await page.waitForFunction(
    () => document.querySelector(".bottom-nav__kart--land") != null,
    { timeout: 10000 },
  );
  await page.waitForTimeout(200);

  const samples = await page.evaluate(() => {
    window.clearInterval((window as unknown as { __pollId: number }).__pollId);
    return (
      window as unknown as {
        __samples: Array<{
          t: number;
          ball: boolean;
          landing: boolean;
          badge: string;
          pressed: string | null;
          mint: boolean;
          inStore: boolean;
        }>;
      }
    ).__samples;
  });

  expect(samples.length).toBeGreaterThan(10);

  const firstPressed = samples.find((s) => s.pressed === "true");
  const firstMint = samples.find((s) => s.mint);
  const firstInStore = samples.find((s) => s.inStore);
  const firstLanding = samples.find((s) => s.landing);
  const firstBall = samples.find((s) => s.ball);
  const lastBall = [...samples].reverse().find((s) => s.ball);

  expect(firstPressed).toBeTruthy();
  expect(firstMint).toBeTruthy();
  expect(firstInStore).toBeTruthy();

  if (firstBall && firstPressed) {
    expect(
      firstPressed.t,
      "button should flip before/during ball flight",
    ).toBeLessThanOrEqual(firstBall.t + 80);
  }

  if (firstBall && firstInStore) {
    expect(
      firstInStore.t,
      "item should be in cart before/during ball flight",
    ).toBeLessThanOrEqual(firstBall.t + 80);
  }

  if (lastBall && firstLanding) {
    expect(
      firstLanding.t,
      "nav pulse should wait until ball lands",
    ).toBeGreaterThanOrEqual(lastBall.t - 50);
  } else {
    expect(firstLanding, "nav pulse should fire after landing").toBeTruthy();
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
