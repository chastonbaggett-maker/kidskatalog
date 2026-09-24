import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

async function dismissSplash(page: import("@playwright/test").Page) {
  const tap = page.getByRole("button", { name: /Tap to start/i });
  try {
    await tap.waitFor({ state: "visible", timeout: 2500 });
    await tap.click();
    await tap.waitFor({ state: "hidden", timeout: 10_000 });
  } catch {
    // Already dismissed or not a cold open.
  }
}

test("returning from a toy restores the feed place", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await page.waitForSelector(".page-scroll .feed-card");
  await page.waitForTimeout(400);

  const scroller = page.locator(".page-scroll").first();
  await scroller.evaluate((el) => {
    el.scrollTop = 1100;
  });
  await page.waitForTimeout(120);

  const target = page.locator(".page-scroll .feed-card[data-toy-id]").nth(2);
  const toyId = await target.getAttribute("data-toy-id");
  expect(toyId).toBeTruthy();

  await target.locator("a[href^='/toy/']").first().click();
  await page.waitForURL(/\/toy\//);

  const saved = await page.evaluate(() => sessionStorage.getItem("kk_browse_scroll"));
  expect(saved).toContain(toyId!);

  await page.getByRole("button", { name: "Back" }).click({ force: true });
  await page.waitForURL(/\/shop/);

  await page.waitForSelector(`.page-scroll .feed-card[data-toy-id="${toyId}"]`, {
    timeout: 10_000,
  });

  await expect
    .poll(async () => {
      return page.evaluate((id) => {
        const scrollerEl = document.querySelector(".page-scroll");
        const card = document.querySelector(
          `.page-scroll .feed-card[data-toy-id="${id}"]`,
        );
        if (
          !(scrollerEl instanceof HTMLElement) ||
          !(card instanceof HTMLElement)
        ) {
          return false;
        }
        const sRect = scrollerEl.getBoundingClientRect();
        const cRect = card.getBoundingClientRect();
        return cRect.top < sRect.bottom && cRect.bottom > sRect.top;
      }, toyId);
    }, { timeout: 8_000 })
    .toBe(true);
});
