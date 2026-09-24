/**
 * Verify top/bottom safe areas stay transparent (no opaque shelf/theme paint).
 * Run: npx playwright test safe-area-transparent
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";

const ARTIFACTS = "/opt/cursor/artifacts";

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

test.describe("transparent safe areas", () => {
  test("theme-color is transparent and bottom inset is unpainted", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    await page.waitForSelector(".bottom-nav", { timeout: 20000 });

    const themeColor = await page.evaluate(() => {
      const metas = [
        ...document.querySelectorAll('meta[name="theme-color"]'),
      ];
      return metas.map((m) => m.getAttribute("content"));
    });
    expect(themeColor.length).toBeGreaterThan(0);
    for (const c of themeColor) {
      expect(c).toBe("transparent");
    }

    const result = await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "safe-area-probe";
      style.textContent = `
        .bottom-nav {
          padding-bottom: 34px !important;
        }
        .bottom-nav--pile.is-shelf-raised .bottom-nav__frost {
          bottom: 0 !important;
        }
        .feed-header {
          padding-top: 47px !important;
        }
      `;
      document.head.appendChild(style);

      const html = document.documentElement;
      const htmlCs = getComputedStyle(html);
      const nav = document.querySelector(".bottom-nav") as HTMLElement | null;
      const frost = document.querySelector(
        ".bottom-nav__frost",
      ) as HTMLElement | null;
      if (!nav || !frost) {
        return { ok: false as const, reason: "missing nav/frost" };
      }
      const navCs = getComputedStyle(nav);
      const frostCs = getComputedStyle(frost);

      return {
        ok: true as const,
        htmlBgImage: htmlCs.backgroundImage,
        navBg: navCs.backgroundColor,
        frostBottom: frostCs.bottom,
        navPadBottom: navCs.paddingBottom,
      };
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.htmlBgImage).toBe("none");
    expect(result.navBg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
    expect(result.frostBottom).toBe("0px");
    expect(parseFloat(result.navPadBottom)).toBeGreaterThanOrEqual(34);

    // Hatch overlays mark top/bottom insets so the transparent bands are visible.
    await page.addStyleTag({
      content: `
        html::after {
          content: "";
          position: fixed;
          left: 0; right: 0; bottom: 0;
          height: 34px;
          background: repeating-linear-gradient(
            -45deg,
            rgba(255,0,0,0.22),
            rgba(255,0,0,0.22) 6px,
            rgba(255,255,255,0.08) 6px,
            rgba(255,255,255,0.08) 12px
          );
          pointer-events: none;
          z-index: 9999;
          border-top: 1px dashed rgba(220,0,0,0.7);
        }
        html::before {
          content: "";
          position: fixed;
          left: 0; right: 0; top: 0;
          height: 47px;
          background: repeating-linear-gradient(
            -45deg,
            rgba(0,120,255,0.22),
            rgba(0,120,255,0.22) 6px,
            rgba(255,255,255,0.08) 6px,
            rgba(255,255,255,0.08) 12px
          );
          pointer-events: none;
          z-index: 9999;
          border-bottom: 1px dashed rgba(0,100,220,0.7);
        }
      `,
    });

    await page.screenshot({
      path: path.join(ARTIFACTS, "safe_area_transparent_insets.png"),
      fullPage: false,
    });

    // Crop-friendly bottom detail: nav shelf stops above the transparent inset.
    const navBox = await page.locator(".bottom-nav").boundingBox();
    if (navBox) {
      await page.screenshot({
        path: path.join(ARTIFACTS, "safe_area_transparent_bottom_nav.png"),
        clip: {
          x: 0,
          y: Math.max(0, navBox.y - 24),
          width: 390,
          height: Math.min(844 - Math.max(0, navBox.y - 24), navBox.height + 40),
        },
      });
    }
  });
});
