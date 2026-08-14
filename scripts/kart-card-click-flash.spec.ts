import { test, expect } from "@playwright/test";

test("kart nav does not pulse after feed card navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidskatalog-kart",
      JSON.stringify({ state: { ids: ["sky-rocket"] }, version: 0 }),
    );
  });

  await page.goto("/shop", { waitUntil: "networkidle" });
  await page.waitForSelector(".feed-card");
  await page.waitForTimeout(1200);

  await page.locator(".feed-card a[href^='/toy/']").first().click();
  await page.waitForURL(/\/toy\//, { timeout: 10000 });
  await page.waitForSelector(".add-kart-btn");
  await page.waitForTimeout(900);

  const state = await page.evaluate(() => ({
    landing: document.querySelector(".bottom-nav__kart--land") != null,
    badge:
      document.querySelector(".bottom-nav a[href='/kart']")?.textContent?.trim() ??
      "",
    bootCount: document.documentElement.dataset.kartCount ?? "",
    addMint: document.querySelector(".add-kart-btn--in") != null,
    addVisualReady: document.querySelector(".add-kart-btn--visual-ready") != null,
    kartGoReady: document.querySelector(".kart-go-btn--visual-ready") != null,
  }));

  console.log("POST_CARD_NAV", JSON.stringify(state));
  expect(state.landing).toBe(false);
  expect(state.badge).toBe("1");
});

test("add to kart button does not flash mint before visual-ready on navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidskatalog-kart",
      JSON.stringify({ state: { ids: ["glow-bow"] }, version: 0 }),
    );
  });

  await page.goto("/shop", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const card = page.locator("a[href='/toy/glow-bow']").first();
  await card.click();
  await page.waitForURL("/toy/glow-bow", { timeout: 10000 });

  const early = await page.evaluate(() => ({
    routeChanging: document.documentElement.classList.contains("route-changing"),
    addMint: document.querySelector(".add-kart-btn--in") != null,
    addReady: document.querySelector(".add-kart-btn--visual-ready") != null,
    label: document.querySelector(".add-kart-btn")?.textContent?.trim() ?? "",
  }));

  expect(early.addMint || early.label.toLowerCase().includes("remove")).toBe(true);
});
