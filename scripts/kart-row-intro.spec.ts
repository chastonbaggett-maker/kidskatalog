import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

test("kart rows bounce in with stagger on open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidskatalog-kart",
      JSON.stringify({
        state: {
          ids: ["monster-truck", "dance-mat", "bear-hug", "fruit-feeder"],
        },
        version: 0,
      }),
    );
    document.documentElement.removeAttribute("data-splash");
  });

  await page.goto("/kart", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("ul.flex.flex-col.gap-3 li.shelf-panel");

  const rows = page.locator("ul.flex.flex-col.gap-3 li.shelf-panel");
  await expect(rows).toHaveCount(4);

  await page.waitForFunction(() => {
    const items = [
      ...document.querySelectorAll("ul.flex.flex-col.gap-3 li.shelf-panel"),
    ];
    return (
      items.length === 4 &&
      items.every((el) => el.classList.contains("kart-row--enter"))
    );
  });

  const delays = await rows.evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).style.animationDelay || "0ms"),
  );
  expect(delays).toEqual(["0ms", "110ms", "220ms", "330ms"]);

  const animName = await rows.first().evaluate((el) => {
    return getComputedStyle(el).animationName;
  });
  expect(animName).toContain("kart-row-in");
});
