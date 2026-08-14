import { test, expect } from "@playwright/test";

test("crazy mode randomizes feed order and flashes from the crazy button", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const randomRequests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/catalog/random")) randomRequests.push(req.url());
  });

  await page.goto("/shop", { waitUntil: "networkidle" });

  const crazyToggle = page.getByRole("button", { name: /Crazy Mode/i }).first();
  await expect(crazyToggle).toBeVisible();
  await crazyToggle.click();

  await expect(page.locator(".app-shell--crazy")).toBeVisible();
  await expect(page.locator(".filter-crazy-btn--active").first()).toBeVisible();

  const beforeIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-feed-slot]")).map(
      (el) => (el as HTMLElement).dataset.toyId ?? "",
    ),
  );
  expect(beforeIds.length).toBeGreaterThan(1);

  // Wait for a flash rooted at a visible Crazy button (3–7s cadence).
  const flashOrigin = await page.waitForFunction(() => {
    const flash = document.querySelector(
      ".crazy-screen-flash",
    ) as HTMLElement | null;
    if (!flash) return null;

    const flashX = Number.parseFloat(flash.style.getPropertyValue("--flash-x"));
    const flashY = Number.parseFloat(flash.style.getPropertyValue("--flash-y"));
    if (!Number.isFinite(flashX) || !Number.isFinite(flashY)) return null;

    const buttons = Array.from(
      document.querySelectorAll<HTMLElement>(".filter-crazy-btn--active"),
    );
    let bestDist = Infinity;
    let best: { btnX: number; btnY: number } | null = null;
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const btnX = rect.left + rect.width / 2;
      const btnY = rect.top + rect.height / 2;
      const dist = Math.hypot(flashX - btnX, flashY - btnY);
      if (dist < bestDist) {
        bestDist = dist;
        best = { btnX, btnY };
      }
    }
    if (!best || bestDist > 24) return null;
    return { flashX, flashY, ...best, bestDist };
  }, undefined, { timeout: 9000 });

  const origin = await flashOrigin.jsonValue();
  expect(origin.bestDist).toBeLessThan(24);

  // Order should reshuffle like Randomize (same ids, new sequence).
  await page.waitForFunction(
    (initial) => {
      const ids = Array.from(document.querySelectorAll("[data-feed-slot]")).map(
        (el) => (el as HTMLElement).dataset.toyId ?? "",
      );
      if (ids.length !== initial.length) return false;
      const sameSet =
        [...ids].sort().join("|") === [...initial].sort().join("|");
      const reordered = ids.some((id, i) => id !== initial[i]);
      return sameSet && reordered;
    },
    beforeIds,
    { timeout: 9000 },
  );

  expect(randomRequests, "crazy mode must not call catalog/random").toEqual([]);
});

test("crazy chrome persists on product page within the session", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: /Crazy Mode/i }).first().click();
  await expect(page.locator(".app-shell--crazy")).toBeVisible();

  const firstCard = page.locator("[data-feed-slot] a").first();
  await firstCard.click();
  await page.waitForURL(/\/toy\//, { timeout: 8000 });

  await expect(page.locator(".app-shell--crazy")).toBeVisible();
  await expect(page.locator(".bottom-nav--crazy")).toBeVisible();
  await expect(page.locator(".shelf-header .filter-crazy-btn--active")).toBeVisible();
});
