import { test, expect } from "@playwright/test";

test("mobile add-to-kart uses reduced path without fly ball or confetti", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("pointer: coarse"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
  });
  await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));

  await page.locator(".add-kart-btn").click();
  await page.waitForTimeout(600);

  const state = await page.evaluate(() => ({
    flyBall: !!document.querySelector(".kart-fly-ball"),
    confetti: document.querySelectorAll(".add-kart-confetti__bit").length,
    ariaPressed: document.querySelector(".add-kart-btn")?.getAttribute("aria-pressed"),
    kart: localStorage.getItem("kidskatalog-kart"),
  }));

  expect(state.flyBall).toBe(false);
  expect(state.confetti).toBe(0);
  expect(state.kart, JSON.stringify(state)).toContain("sky-rocket");
});
