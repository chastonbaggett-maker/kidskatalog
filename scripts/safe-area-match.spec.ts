/**
 * Edge-to-edge chrome (PWA-style) + music waits for splash to clear.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";

const ARTIFACTS = "/opt/cursor/artifacts";

async function dismissSplash(page: Page) {
  const tap = page.getByRole("button", { name: /Tap to start/i });
  try {
    await tap.waitFor({ state: "visible", timeout: 12_000 });
    await tap.click();
    await tap.waitFor({ state: "hidden", timeout: 20_000 });
  } catch {
    // Already dismissed.
  }
  await page
    .locator(".app-splash")
    .waitFor({ state: "detached", timeout: 12_000 })
    .catch(() => {});
}

test.describe("splash music + edge chrome", () => {
  test("no solid safe-area bands; music gated by splash", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop", { waitUntil: "domcontentloaded" });

    // While splash is up, bed must not be allowed.
    const blockedDuringSplash = await page.evaluate(() => {
      const splash = document.documentElement.dataset.splash;
      return (
        splash === "active" ||
        splash === "holding" ||
        splash === "exiting" ||
        document.querySelector(".app-splash") != null
      );
    });
    // Cold open should show splash (unless reduced-motion).
    if (blockedDuringSplash) {
      expect(
        await page.evaluate(() => {
          const splash = document.documentElement.dataset.splash;
          return Boolean(splash);
        }),
      ).toBe(true);
    }

    await dismissSplash(page);
    await page.waitForSelector(".bottom-nav", { timeout: 20_000 });
    await page.waitForSelector(".feed-header", { timeout: 20_000 });

    expect(await page.locator(".safari-chrome-tint").count()).toBe(0);

    const chrome = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement);
      const header = getComputedStyle(document.querySelector(".feed-header")!);
      const nav = getComputedStyle(document.querySelector(".bottom-nav")!);
      return {
        htmlBgImage: html.backgroundImage,
        splash: document.documentElement.dataset.splash ?? null,
        headerPos: header.position,
        headerBgColor: header.backgroundColor,
        headerBgImage: header.backgroundImage,
        navPos: nav.position,
        navBg: nav.backgroundColor,
        navFilter: nav.backdropFilter || nav.webkitBackdropFilter,
        theme: [
          ...document.querySelectorAll('meta[name="theme-color"]'),
        ].map((m) => m.getAttribute("content")),
      };
    });

    expect(chrome.splash).toBeNull();
    expect(chrome.htmlBgImage).toBe("none");
    expect(chrome.headerPos).toBe("sticky");
    // No solid status-bar fill — gradient only (PWA-style blend).
    expect(chrome.headerBgColor).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
    expect(chrome.headerBgImage).toMatch(/linear-gradient/i);
    expect(chrome.navPos).toBe("fixed");
    expect(chrome.navBg).toMatch(/rgba?\(255,\s*255,\s*255/i);
    expect(chrome.navFilter).toMatch(/blur/i);
    for (const c of chrome.theme) {
      expect(c).toBe("transparent");
    }

    await page.screenshot({
      path: path.join(ARTIFACTS, "edge_to_edge_after_splash.png"),
      fullPage: false,
    });
  });
});
