/**
 * Safe areas match adjacent chrome via real header/nav edges (Safari 26).
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
  test("header/nav edges carry sampleable colors; no tint probes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    await page.waitForSelector(".bottom-nav", { timeout: 20_000 });
    await page.waitForSelector(".feed-header", { timeout: 20_000 });

    // No visible Safari probe strips.
    expect(await page.locator(".safari-chrome-tint").count()).toBe(0);

    await page.waitForFunction(
      (expected) => {
        const meta = document.querySelector('meta[name="theme-color"]');
        return meta?.getAttribute("content") === expected;
      },
      STATUS_BAR.both,
      { timeout: 10_000 },
    );

    const edgeChrome = await page.evaluate(() => {
      const header = document.querySelector(".feed-header") as HTMLElement;
      const nav = document.querySelector(".bottom-nav") as HTMLElement;
      if (!header || !nav) return { ok: false as const };
      const headerCs = getComputedStyle(header);
      const navCs = getComputedStyle(nav);
      return {
        ok: true as const,
        headerPos: headerCs.position,
        headerTop: headerCs.top,
        headerBg: headerCs.backgroundColor,
        statusVar: getComputedStyle(document.documentElement)
          .getPropertyValue("--status-bar")
          .trim(),
        navPos: navCs.position,
        navBottom: navCs.bottom,
        navBg: navCs.backgroundColor,
        navFilter: navCs.backdropFilter || navCs.webkitBackdropFilter,
      };
    });

    expect(edgeChrome.ok).toBe(true);
    if (!edgeChrome.ok) return;

    expect(edgeChrome.headerPos).toBe("sticky");
    expect(edgeChrome.headerTop).toBe("0px");
    expect(edgeChrome.statusVar.toLowerCase()).toBe("#2bb8a8");
    // Solid status-bar color on the header element (Safari samples this).
    expect(edgeChrome.headerBg).toMatch(/rgb\(43,\s*184,\s*168\)|#2bb8a8/i);

    expect(edgeChrome.navPos).toBe("fixed");
    expect(edgeChrome.navBottom).toBe("0px");
    expect(edgeChrome.navBg).toMatch(/rgba?\(255,\s*255,\s*255/i);
    expect(edgeChrome.navFilter).toMatch(/blur/i);

    // Boys — header status color follows accent.
    const boysChip = page.getByRole("button", { name: /^Boys$/i }).first();
    if (await boysChip.count()) {
      await boysChip.click();
      await page.waitForFunction(
        (expected) =>
          document.documentElement.dataset.accent === "boys" &&
          getComputedStyle(document.documentElement)
            .getPropertyValue("--status-bar")
            .trim()
            .toLowerCase() === expected,
        STATUS_BAR.boys,
        { timeout: 10_000 },
      );
      const boysHeaderBg = await page.evaluate(
        () => getComputedStyle(document.querySelector(".feed-header")!)
          .backgroundColor,
      );
      expect(boysHeaderBg).toMatch(/rgb\(47,\s*106,\s*232\)|#2f6ae8/i);
    }

    await page.screenshot({
      path: path.join(ARTIFACTS, "safe_area_edge_chrome.png"),
      fullPage: false,
    });
  });
});
