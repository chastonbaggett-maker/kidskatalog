/**
 * Browser vs PWA chrome:
 * - Bottom nav: solid white in browser; frost in PWA.
 * - Top header: solid mode color in browser (safe-area tint); gradient in PWA.
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
    const root = getComputedStyle(document.documentElement);
    const header = getComputedStyle(document.querySelector(".feed-header")!);
    const nav = getComputedStyle(document.querySelector(".bottom-nav")!);
    const frost = getComputedStyle(
      document.querySelector(".bottom-nav__frost")!,
    );
    return {
      splash: document.documentElement.dataset.splash ?? null,
      standalone: document.documentElement.dataset.standalone ?? null,
      accent: document.documentElement.dataset.accent ?? null,
      headerSolid: root.getPropertyValue("--header-solid").trim(),
      statusBar: root.getPropertyValue("--status-bar").trim(),
      headerBgColor: header.backgroundColor,
      headerBgImage: header.backgroundImage,
      headerFilter: backdropFn(header),
      navBg: nav.backgroundColor,
      navFilter: backdropFn(nav),
      frostPos: frost.position,
      frostBg: frost.backgroundColor,
      frostFilter: backdropFn(frost),
    };
  });
}

function rgbOfHex(hex: string) {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

test.describe("browser solid / PWA frost + header", () => {
  test("browser: solid white nav + solid mode header; accent updates color", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    await page.waitForSelector(".bottom-nav__frost", { timeout: 20_000 });
    await page.waitForSelector(".feed-header", { timeout: 20_000 });

    await page.evaluate(() => {
      delete document.documentElement.dataset.standalone;
    });

    const both = await readChrome(page);
    expect(both.standalone).toBeNull();
    expect(both.navBg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
    expect(both.frostBg).toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)/);
    expect(both.frostFilter).toMatch(/^none$/i);
    // Solid mint header — no gradient in browser.
    expect(both.headerBgImage).toBe("none");
    expect(both.headerBgColor).toBe(rgbOfHex(both.headerSolid || both.statusBar));
    expect(both.headerBgColor).toBe(rgbOfHex("#2bb8a8"));

    await page.screenshot({
      path: path.join(ARTIFACTS, "browser_solid_header_both.png"),
      fullPage: false,
    });

    await page.getByRole("button", { name: /Boys/i }).click();
    await page.waitForFunction(
      () => document.documentElement.dataset.accent === "boys",
    );
    // Safe-area probe remounts with the new solid so Safari can re-tint in sync.
    await page.waitForFunction(() => {
      const probe = document.querySelector(".safari-safe-area-tint");
      if (!probe) return false;
      const bg = getComputedStyle(probe).backgroundColor;
      return bg === "rgb(47, 106, 232)";
    });
    const boys = await readChrome(page);
    expect(boys.accent).toBe("boys");
    expect(boys.headerBgImage).toBe("none");
    expect(boys.headerBgColor).toBe(rgbOfHex("#2f6ae8"));
    expect(
      await page.evaluate(
        () =>
          getComputedStyle(document.querySelector(".safari-safe-area-tint")!)
            .backgroundColor,
      ),
    ).toBe(rgbOfHex("#2f6ae8"));

    await page.screenshot({
      path: path.join(ARTIFACTS, "browser_solid_header_boys.png"),
      fullPage: false,
    });

    await page.getByRole("button", { name: /Girls/i }).click();
    await page.waitForFunction(
      () => document.documentElement.dataset.accent === "girls",
    );
    await page.waitForFunction(() => {
      const probe = document.querySelector(".safari-safe-area-tint");
      if (!probe) return false;
      return (
        getComputedStyle(probe).backgroundColor === "rgb(239, 143, 179)"
      );
    });
    const girls = await readChrome(page);
    expect(girls.accent).toBe("girls");
    expect(girls.headerBgImage).toBe("none");
    expect(girls.headerBgColor).toBe(rgbOfHex("#ef8fb3"));
    expect(
      await page.evaluate(
        () =>
          getComputedStyle(document.querySelector(".safari-safe-area-tint")!)
            .backgroundColor,
      ),
    ).toBe(rgbOfHex("#ef8fb3"));

    await page.screenshot({
      path: path.join(ARTIFACTS, "browser_solid_header_girls.png"),
      fullPage: false,
    });
  });

  test("PWA: frosted nav + gradient header unchanged", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    await page.waitForSelector(".bottom-nav__frost", { timeout: 20_000 });

    await page.evaluate(() => {
      document.documentElement.dataset.standalone = "true";
    });

    const chrome = await readChrome(page);
    expect(chrome.standalone).toBe("true");
    expect(chrome.frostFilter).toMatch(/blur/i);
    expect(chrome.headerBgColor).toMatch(
      /rgba?\(0,\s*0,\s*0,\s*0\)|transparent/,
    );
    expect(chrome.headerBgImage).toMatch(/linear-gradient/i);

    await page.screenshot({
      path: path.join(ARTIFACTS, "pwa_gradient_header.png"),
      fullPage: false,
    });
  });
});
