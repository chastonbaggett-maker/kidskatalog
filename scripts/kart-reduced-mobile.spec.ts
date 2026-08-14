import { test, expect } from "@playwright/test";

test("mobile add-to-kart still fires fly ball and confetti", async ({
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
  await page.waitForTimeout(80);

  const state = await page.evaluate(() => {
    const ball = document.querySelector(".kart-fly-ball") as HTMLElement | null;
    const style = ball ? getComputedStyle(ball) : null;
    return {
      flyBallVisible:
        !!ball &&
        style?.display !== "none" &&
        style?.visibility !== "hidden" &&
        Number(style?.opacity || "0") > 0,
      confetti: document.querySelectorAll(".add-kart-confetti__bit").length,
      ariaPressed: document
        .querySelector(".add-kart-btn")
        ?.getAttribute("aria-pressed"),
      kart: localStorage.getItem("kidskatalog-kart"),
    };
  });

  expect(state.flyBallVisible).toBe(true);
  expect(state.confetti).toBeGreaterThan(0);
  expect(state.kart, JSON.stringify(state)).toContain("sky-rocket");
});
