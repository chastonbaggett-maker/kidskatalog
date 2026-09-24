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
      const frost = document.querySelector(
        ".bottom-nav__frost",
      ) as HTMLElement | null;
      if (!nav || !frost) return { ok: false as const };
      const navCs = getComputedStyle(nav);
      const frostCs = getComputedStyle(frost);
      return {
        ok: true as const,
        htmlBgImage: html.backgroundImage,
        htmlBgSize: html.backgroundSize,
        htmlBgPos: html.backgroundPosition,
        navBg: navCs.backgroundColor,
        frostBg: frostCs.backgroundColor,
        frostFilter: frostCs.backdropFilter || frostCs.webkitBackdropFilter,
        navPad: navCs.paddingBottom,
      };
    });

    expect(shelfPaint.ok).toBe(true);
    if (!shelfPaint.ok) return;
    // Bottom strip is painted with the shelf color (not left as page field only).
    expect(shelfPaint.htmlBgImage).not.toBe("none");
    expect(shelfPaint.htmlBgImage).toMatch(/rgb|#|linear-gradient/i);
    // Nav shell is transparent; frost paints frosted glass.
    expect(shelfPaint.navBg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
    expect(shelfPaint.frostBg).toMatch(/rgba?\(/);
    expect(shelfPaint.frostFilter).toMatch(/blur/i);
    expect(parseFloat(shelfPaint.navPad)).toBeGreaterThanOrEqual(34);

    // Safari chrome tint probes must exist and track accent / shelf colors.
    const probes = await page.evaluate(() => {
      const top = document.querySelector(
        ".safari-chrome-tint--top",
      ) as HTMLElement | null;
      const bottom = document.querySelector(
        ".safari-chrome-tint--bottom",
      ) as HTMLElement | null;
      if (!top || !bottom) return { ok: false as const };
      const topCs = getComputedStyle(top);
      const bottomCs = getComputedStyle(bottom);
      return {
        ok: true as const,
        topBg: topCs.backgroundColor,
        bottomBg: bottomCs.backgroundColor,
        topPos: topCs.position,
        bottomPos: bottomCs.position,
        statusVar: getComputedStyle(document.documentElement)
          .getPropertyValue("--status-bar")
          .trim(),
        shelfVar: getComputedStyle(document.documentElement)
          .getPropertyValue("--bottom-shelf")
          .trim(),
      };
    });
    expect(probes.ok).toBe(true);
    if (!probes.ok) return;
    expect(probes.topPos).toBe("fixed");
    expect(probes.bottomPos).toBe("fixed");
    expect(probes.statusVar.toLowerCase()).toBe("#2bb8a8");
    expect(probes.shelfVar.toLowerCase()).toBe("#ffffff");

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
