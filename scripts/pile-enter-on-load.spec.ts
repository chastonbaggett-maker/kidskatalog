import { test, expect } from "@playwright/test";

test("pile and crazy modes do not restore from localStorage on load", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3456/shop", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem(
      "kidskatalog-toy-pile-mode",
      JSON.stringify({ state: { toyPileMode: true }, version: 0 }),
    );
    localStorage.setItem(
      "kidskatalog-crazy-mode",
      JSON.stringify({ state: { crazyMode: true }, version: 0 }),
    );
    localStorage.setItem(
      "kidskatalog-accent",
      JSON.stringify({ state: { audience: "girls" }, version: 0 }),
    );
  });
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.locator(".app-shell--pile")).toHaveCount(0);
  await expect(page.locator(".app-shell--crazy")).toHaveCount(0);
  await expect(page.locator(".bottom-nav--pile")).toHaveCount(0);
  await expect(page.locator(".toy-pile-viewport")).toHaveCount(0);

  const accent = await page.evaluate(
    () => document.documentElement.dataset.accent ?? "",
  );
  expect(accent).toBe("both");

  // Legacy keys are cleared on boot.
  const leftover = await page.evaluate(() => ({
    pile: localStorage.getItem("kidskatalog-toy-pile-mode"),
    crazy: localStorage.getItem("kidskatalog-crazy-mode"),
    accent: localStorage.getItem("kidskatalog-accent"),
  }));
  expect(leftover).toEqual({ pile: null, crazy: null, accent: null });
});
