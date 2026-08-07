import { test, expect } from "@playwright/test";

test("add to kart updates store and badge on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/toy/glow-bow", { waitUntil: "networkidle" });
  await page.waitForSelector(".add-kart-btn");
  await page.waitForTimeout(500);
  await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));

  await page.locator(".add-kart-btn").click();
  await page.waitForFunction(() =>
    localStorage.getItem("kidskatalog-kart")?.includes("glow-bow"),
  );

  const after = await page.evaluate(() => ({
    label: document.querySelector(".add-kart-btn")?.textContent?.trim(),
    pressed: document.querySelector(".add-kart-btn")?.getAttribute("aria-pressed"),
    badge: document.querySelector(".bottom-nav a[href='/kart']")?.textContent?.trim(),
  }));

  expect(after.pressed).toBe("true");
  expect(after.label?.toLowerCase()).toContain("remove");
  expect(after.badge).toBe("1");
});
