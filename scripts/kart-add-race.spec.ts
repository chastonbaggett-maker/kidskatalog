import { test, expect } from "@playwright/test";

/**
 * Reproduce async crazy-flash race: fetch starts, kart add fires mid-flight.
 * Before fix, card swap + screen flash could land during add-to-kart.
 */
test("crazy flash aborted when kart add starts mid-fetch", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.route("**/api/catalog/random**", async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.continue();
  });

  await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("kidskatalog-kart");
    localStorage.setItem(
      "kidskatalog-crazy-mode",
      JSON.stringify({ state: { crazyMode: true }, version: 0 }),
    );
  });
  await page.reload({ waitUntil: "networkidle" });

  await page.locator(".more-toys-feed").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const scroller = document.querySelector(".page-scroll");
    if (scroller) scroller.scrollTop = 120;
  });
  await page.waitForTimeout(800);

  const beforeIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-feed-slot]")).map(
      (el) => (el as HTMLElement).dataset.toyId ?? "",
    ),
  );

  await page.evaluate(() => {
    (window as unknown as { __raceT0: number }).__raceT0 = performance.now();
  });

  // Let crazy interval fire (fetch will be delayed 400ms)
  await page.waitForTimeout(100);
  await page.locator(".add-kart-btn").click();

  await page.waitForTimeout(1800);

  const after = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll("[data-feed-slot]")).map(
      (el) => (el as HTMLElement).dataset.toyId ?? "",
    );
    return {
      ids,
      crazyFlashes: document.querySelectorAll(".crazy-screen-flash").length,
      kartEffectActive: document.documentElement.classList.contains(
        "kart-effect-active",
      ),
      oversized: Array.from(document.querySelectorAll<HTMLImageElement>("img"))
        .filter((img) => {
          const r = img.getBoundingClientRect();
          return r.width >= innerWidth * 0.7 && r.height >= innerHeight * 0.65;
        })
        .map((img) => ({ src: img.src.slice(-48), w: img.width, h: img.height })),
    };
  });

  expect(after.crazyFlashes, "crazy flash should not appear during kart add").toBe(
    0,
  );
  expect(after.oversized, JSON.stringify(after.oversized)).toEqual([]);
  expect(after.ids, "card ids should not swap during kart add").toEqual(beforeIds);
});
