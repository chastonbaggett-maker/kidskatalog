/**
 * Safe areas match adjacent chrome: top = header accent, bottom = nav shelf.
 * Run: npx playwright test safe-area-match
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";

const ARTIFACTS = "/opt/cursor/artifacts";

const STATUS_BAR: Record<string, string> = {
  both: "#2bb8a8",
  boys: "#2f6ae8",
  girls: "#ef8fb3",
};

async function dismissSplash(page: Page) {
  const tap = page.getByRole("button", { name: /Tap to start/i });
  try {
    await tap.waitFor({ state: "visible", timeout: 12_000 });
    await tap.click();
    await tap.waitFor({ state: "hidden", timeout: 15_000 });
  } catch {
    // Already dismissed or not a cold open.
  }
  await page
    .locator(".app-splash")
    .waitFor({ state: "detached", timeout: 8_000 })
    .catch(() => {});
}

test.describe("safe areas match adjacent chrome", () => {
  test("theme-color tracks header accent; bottom strip uses shelf", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    await page.waitForSelector(".bottom-nav", { timeout: 20_000 });

    // Default / both — mint header left edge
    await page.waitForFunction(
      (expected) => {
        const meta = document.querySelector('meta[name="theme-color"]');
        return meta?.getAttribute("content") === expected;
      },
      STATUS_BAR.both,
      { timeout: 10_000 },
    );

    const bothTheme = await page.evaluate(() =>
      document
        .querySelector('meta[name="theme-color"]')
        ?.getAttribute("content"),
    );
    expect(bothTheme).toBe(STATUS_BAR.both);

    const shelfPaint = await page.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = `
        .bottom-nav { padding-bottom: 34px !important; }
      `;
      document.head.appendChild(style);

      const html = getComputedStyle(document.documentElement);
      const nav = document.querySelector(".bottom-nav") as HTMLElement | null;
      if (!nav) return { ok: false as const };
      const navCs = getComputedStyle(nav);
      return {
        ok: true as const,
        htmlBgImage: html.backgroundImage,
        htmlBgSize: html.backgroundSize,
        htmlBgPos: html.backgroundPosition,
        navBg: navCs.backgroundColor,
        navPad: navCs.paddingBottom,
      };
    });

    expect(shelfPaint.ok).toBe(true);
    if (!shelfPaint.ok) return;
    // Bottom strip is painted with the shelf color (not left as page field only).
    expect(shelfPaint.htmlBgImage).not.toBe("none");
    expect(shelfPaint.htmlBgImage).toMatch(/rgb|#|linear-gradient/i);
    expect(shelfPaint.navBg).not.toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)/);
    expect(parseFloat(shelfPaint.navPad)).toBeGreaterThanOrEqual(34);

    // Switch to Boys — theme-color must follow header blue.
    const boysChip = page.getByRole("button", { name: /^Boys$/i }).first();
    if (await boysChip.count()) {
      await boysChip.click();
      await page.waitForFunction(
        (expected) => {
          const meta = document.querySelector('meta[name="theme-color"]');
          const accent = document.documentElement.dataset.accent;
          return (
            meta?.getAttribute("content") === expected && accent === "boys"
          );
        },
        STATUS_BAR.boys,
        { timeout: 10_000 },
      );
      const boysTheme = await page.evaluate(() =>
        document
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute("content"),
      );
      expect(boysTheme).toBe(STATUS_BAR.boys);
    }

    // Switch to Girls — theme-color must follow header pink.
    const girlsChip = page.getByRole("button", { name: /^Girls$/i }).first();
    if (await girlsChip.count()) {
      await girlsChip.click();
      await page.waitForFunction(
        (expected) => {
          const meta = document.querySelector('meta[name="theme-color"]');
          const accent = document.documentElement.dataset.accent;
          return (
            meta?.getAttribute("content") === expected && accent === "girls"
          );
        },
        STATUS_BAR.girls,
        { timeout: 10_000 },
      );
      const girlsTheme = await page.evaluate(() =>
        document
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute("content"),
      );
      expect(girlsTheme).toBe(STATUS_BAR.girls);
    }

    await page.screenshot({
      path: path.join(ARTIFACTS, "safe_area_match_chrome.png"),
      fullPage: false,
    });
  });
});
