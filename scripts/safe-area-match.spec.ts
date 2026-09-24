/**
 * Browser vs PWA bottom-nav shelf + music waits for splash.
 *
 * Browser: solid white shelf (no frosted glass).
 * Installed PWA (data-standalone): frosted glass on absolute .bottom-nav__frost.
 * Fixed/sticky edge shells stay transparent so Safari 26 chrome can stay glass.
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

async function readChrome(page: Page) {
  return page.evaluate(() => {
    const backdropFn = (el: CSSStyleDeclaration) =>
      el.backdropFilter ||
      (el as CSSStyleDeclaration & { webkitBackdropFilter?: string })
        .webkitBackdropFilter ||
      "none";
    const header = getComputedStyle(document.querySelector(".feed-header")!);
    const nav = getComputedStyle(document.querySelector(".bottom-nav")!);
    const frost = getComputedStyle(
      document.querySelector(".bottom-nav__frost")!,
    );
    return {
      splash: document.documentElement.dataset.splash ?? null,
      standalone: document.documentElement.dataset.standalone ?? null,
      headerBgColor: header.backgroundColor,
      headerFilter: backdropFn(header),
      navBg: nav.backgroundColor,
      navFilter: backdropFn(nav),
      frostPos: frost.position,
      frostBg: frost.backgroundColor,
      frostFilter: backdropFn(frost),
      theme: [
        ...document.querySelectorAll('meta[name="theme-color"]'),
      ].map((m) => m.getAttribute("content")),
    };
  });
}

test.describe("browser solid / PWA frost nav shelf", () => {
  test("browser: solid white frost child; edge shells transparent", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    await page.waitForSelector(".bottom-nav__frost", { timeout: 20_000 });

    // Ensure we are in browser mode (not PWA).
    await page.evaluate(() => {
      delete document.documentElement.dataset.standalone;
    });

    const chrome = await readChrome(page);

    expect(chrome.splash).toBeNull();
    expect(chrome.standalone).toBeNull();
    expect(chrome.headerBgColor).toMatch(
      /rgba?\(0,\s*0,\s*0,\s*0\)|transparent/,
    );
    expect(chrome.headerFilter).toMatch(/^none$/i);
    expect(chrome.navBg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
    expect(chrome.navFilter).toMatch(/^none$/i);
    expect(chrome.frostPos).toBe("absolute");
    // Solid white — no blur in browser.
    expect(chrome.frostBg).toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)/);
    expect(chrome.frostFilter).toMatch(/^none$/i);
    for (const c of chrome.theme) {
      expect(c).toBe("transparent");
    }

    await page.screenshot({
      path: path.join(ARTIFACTS, "browser_solid_white_nav.png"),
      fullPage: false,
    });
  });

  test("PWA: frosted glass on absolute frost child", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    await page.waitForSelector(".bottom-nav__frost", { timeout: 20_000 });

    await page.evaluate(() => {
      document.documentElement.dataset.standalone = "true";
    });

    const chrome = await readChrome(page);

    expect(chrome.standalone).toBe("true");
    expect(chrome.navBg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
    expect(chrome.navFilter).toMatch(/^none$/i);
    expect(chrome.frostPos).toBe("absolute");
    expect(chrome.frostBg).toMatch(/rgba?\(255,\s*255,\s*255/i);
    expect(chrome.frostFilter).toMatch(/blur/i);

    await page.screenshot({
      path: path.join(ARTIFACTS, "pwa_frosted_nav.png"),
      fullPage: false,
    });
  });
});
