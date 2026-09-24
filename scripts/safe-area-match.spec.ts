/**
 * Transparent Safari chrome (Liquid Glass) + music waits for splash to clear.
 *
 * Safari 26 samples background-color / backdrop-filter on fixed/sticky edge
 * elements. Keep those transparent on .bottom-nav / .feed-header; frost lives
 * on absolute .bottom-nav__frost so chrome stays see-through around the search bar.
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

test.describe("splash music + transparent chrome", () => {
  test("edge shells stay transparent; frost on absolute child; music gated", async ({
    page,
  }) => {
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
    await page.waitForSelector(".bottom-nav__frost", { timeout: 20_000 });

    expect(await page.locator(".safari-chrome-tint").count()).toBe(0);

    const chrome = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement);
      const header = getComputedStyle(document.querySelector(".feed-header")!);
      const nav = getComputedStyle(document.querySelector(".bottom-nav")!);
      const frost = getComputedStyle(
        document.querySelector(".bottom-nav__frost")!,
      );
      const backdrop = (el: CSSStyleDeclaration) =>
        el.backdropFilter ||
        (el as CSSStyleDeclaration & { webkitBackdropFilter?: string })
          .webkitBackdropFilter ||
        "none";
      return {
        htmlBgImage: html.backgroundImage,
        splash: document.documentElement.dataset.splash ?? null,
        headerPos: header.position,
        headerBgColor: header.backgroundColor,
        headerBgImage: header.backgroundImage,
        headerFilter: backdrop(header),
        navPos: nav.position,
        navBg: nav.backgroundColor,
        navFilter: backdrop(nav),
        frostPos: frost.position,
        frostBg: frost.backgroundColor,
        frostFilter: backdrop(frost),
        theme: [
          ...document.querySelectorAll('meta[name="theme-color"]'),
        ].map((m) => m.getAttribute("content")),
      };
    });

    expect(chrome.splash).toBeNull();
    expect(chrome.htmlBgImage).toBe("none");
    expect(chrome.headerPos).toBe("sticky");
    // No solid / sampled fill on sticky header — gradient image only.
    expect(chrome.headerBgColor).toMatch(
      /rgba?\(0,\s*0,\s*0,\s*0\)|transparent/,
    );
    expect(chrome.headerBgImage).toMatch(/linear-gradient/i);
    expect(chrome.headerFilter).toMatch(/^none$/i);
    expect(chrome.navPos).toBe("fixed");
    // Fixed nav shell must stay transparent so Safari chrome stays glass.
    expect(chrome.navBg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
    expect(chrome.navFilter).toMatch(/^none$/i);
    // Frosted look is on the absolute child — not sampled for toolbar tint.
    expect(chrome.frostPos).toBe("absolute");
    expect(chrome.frostBg).toMatch(/rgba?\(255,\s*255,\s*255/i);
    expect(chrome.frostFilter).toMatch(/blur/i);
    for (const c of chrome.theme) {
      expect(c).toBe("transparent");
    }

    await page.screenshot({
      path: path.join(ARTIFACTS, "transparent_chrome_after_splash.png"),
      fullPage: false,
    });
  });
});
