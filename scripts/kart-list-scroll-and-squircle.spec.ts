import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

test("kart list is a 3.5-row scroll box without see-whole-list", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidskatalog-kart",
      JSON.stringify({
        state: {
          ids: [
            "monster-truck",
            "dance-mat",
            "bear-hug",
            "fruit-feeder",
            "mag-tiles",
            "glow-bow",
          ],
        },
        version: 0,
      }),
    );
  });

  await page.goto("/kart", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".kart-list-scroll li.shelf-panel");

  await expect(page.getByRole("button", { name: /See whole list/i })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: /^Collapse$/i })).toHaveCount(0);

  const metrics = await page.locator(".kart-list-scroll").evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      maxHeight: style.maxHeight,
      overflowY: style.overflowY,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      rowCount: el.querySelectorAll("li.shelf-panel").length,
    };
  });

  expect(metrics.overflowY).toBe("auto");
  expect(metrics.rowCount).toBe(6);
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  // ~3.5 * 6.5rem + 3 * 0.75rem = 25rem
  expect(metrics.maxHeight).toBe("400px");
});

test("active bottom-nav bubble uses a squircle radius", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bottom-nav__item--active");

  const radius = await page
    .locator(".bottom-nav__item--active")
    .evaluate((el) => getComputedStyle(el, "::before").borderRadius);
  expect(radius).not.toMatch(/9999?px|50%/);
  expect(radius).toMatch(/24%/);
});
