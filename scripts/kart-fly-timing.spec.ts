import { test, expect } from "@playwright/test";

test("add is instant; fly ball is decorative only", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/toy/glow-bow", { waitUntil: "networkidle" });
  await page.waitForSelector(".add-kart-btn");
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    localStorage.removeItem("kidskatalog-kart");
    location.reload();
  });
  await page.waitForSelector(".add-kart-btn");
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    (window as unknown as { __samples: unknown[] }).__samples = [];
    const id = window.setInterval(() => {
      (window as unknown as { __samples: unknown[] }).__samples.push({
        t: performance.now(),
        ball: document.querySelector(".kart-fly-ball") != null,
        landing: document.querySelector(".bottom-nav__kart--land") != null,
        badge:
          document.querySelector(".bottom-nav a[href='/kart']")?.textContent?.trim() ??
          "",
        pressed: document.querySelector(".add-kart-btn")?.getAttribute("aria-pressed"),
        inStore: (localStorage.getItem("kidskatalog-kart") ?? "").includes("glow-bow"),
      });
    }, 16);
    (window as unknown as { __pollId: number }).__pollId = id;
  });

  await page.locator(".add-kart-btn").click();
  await page.waitForSelector('.add-kart-btn[aria-pressed="true"]', {
    timeout: 5000,
  });
  await page.waitForTimeout(900);

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
          inStore: boolean;
        }>;
      }
    ).__samples;
  });

  const firstPressed = samples.find((s) => s.pressed === "true");
  const firstInStore = samples.find((s) => s.inStore);
  const firstBadge = samples.find((s) => s.badge === "1");
  const firstBall = samples.find((s) => s.ball);
  const anyLanding = samples.some((s) => s.landing);

  expect(firstPressed).toBeTruthy();
  expect(firstInStore).toBeTruthy();
  expect(firstBadge).toBeTruthy();
  expect(anyLanding, "nav pulse must stay off").toBe(false);

  if (firstBall && firstPressed) {
    expect(firstPressed.t).toBeLessThanOrEqual(firstBall.t + 80);
  }
  if (firstBall && firstInStore) {
    expect(firstInStore.t).toBeLessThanOrEqual(firstBall.t + 80);
  }
});

test("opening a toy card does not pulse kart nav", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/shop", { waitUntil: "networkidle" });
  await page.waitForSelector(".feed-card");
  await page.waitForTimeout(1200);

  await page.locator(".feed-card a[href^='/toy/']").first().click();
  await page.waitForURL(/\/toy\//, { timeout: 10000 });
  await page.waitForTimeout(700);

  const landing = await page.evaluate(
    () => document.querySelector(".bottom-nav__kart--land") != null,
  );
  expect(landing).toBe(false);
});
