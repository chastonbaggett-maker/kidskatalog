import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

test("raised shelf icons and mode row share the enter transform", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".page-scroll .feed-card");

  // Scroll enough to raise the compact shelf + bottom mode row.
  await page.locator(".page-scroll").first().evaluate((el) => {
    el.scrollTop = 900;
  });

  await page.waitForSelector("nav.bottom-nav.is-shelf-raised.is-enter-visible", {
    timeout: 8_000,
  });

  const transforms = await page.evaluate(() => {
    const nav = document.querySelector("nav.bottom-nav");
    const icons = document.querySelector(".bottom-nav__icons");
    const mode = document.querySelector(".bottom-nav__mode-row");
    if (!nav || !icons || !mode) return null;
    return {
      navClass: nav.className,
      iconsTransform: getComputedStyle(icons).transform,
      modeTransform: getComputedStyle(mode).transform,
      iconsTransition: getComputedStyle(icons).transition,
      modeTransition: getComputedStyle(mode).transition,
    };
  });

  expect(transforms).not.toBeNull();
  expect(transforms!.navClass).toContain("is-enter-visible");
  // Settled enter state — both at identity transform.
  expect(transforms!.iconsTransform).toMatch(/none|matrix\(1,\s*0,\s*0,\s*1/);
  expect(transforms!.modeTransform).toMatch(/none|matrix\(1,\s*0,\s*0,\s*1/);
  expect(transforms!.iconsTransition).toContain("transform");
  expect(transforms!.modeTransition).toContain("transform");
  expect(transforms!.iconsTransition).toContain("0.42s");
  expect(transforms!.modeTransition).toContain("0.42s");
});
