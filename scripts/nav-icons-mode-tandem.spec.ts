import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

test("raised shelf lifts frost, icons, and mode row together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".page-scroll .feed-card");

  await page.locator(".page-scroll").first().evaluate((el) => {
    el.scrollTop = 900;
  });

  await page.waitForSelector(
    "nav.bottom-nav.is-shelf-raised.is-enter-visible .bottom-nav__lift",
    { timeout: 8_000 },
  );

  const metrics = await page.evaluate(() => {
    const nav = document.querySelector("nav.bottom-nav");
    const lift = document.querySelector(".bottom-nav__lift");
    const frost = document.querySelector(".bottom-nav__frost");
    const icons = document.querySelector(".bottom-nav__icons");
    const mode = document.querySelector(".bottom-nav__mode-row");
    if (!nav || !lift || !frost || !icons || !mode) return null;
    const liftStyle = getComputedStyle(lift);
    return {
      navClass: nav.className,
      liftParentIsNav: lift.parentElement === nav,
      frostInLift: frost.parentElement === lift,
      iconsInLift: icons.parentElement === lift,
      modeInLift: mode.parentElement === lift,
      liftTransform: liftStyle.transform,
      liftTransition: liftStyle.transition,
      iconsTransform: getComputedStyle(icons).transform,
      modeTransform: getComputedStyle(mode).transform,
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics!.navClass).toContain("is-enter-visible");
  expect(metrics!.frostInLift).toBe(true);
  expect(metrics!.iconsInLift).toBe(true);
  expect(metrics!.modeInLift).toBe(true);
  expect(metrics!.liftTransform).toMatch(/none|matrix\(1,\s*0,\s*0,\s*1/);
  expect(metrics!.liftTransition).toContain("transform");
  expect(metrics!.liftTransition).toContain("0.42s");
  // Individual rows no longer animate on their own.
  expect(metrics!.iconsTransform).toMatch(/none|matrix\(1,\s*0,\s*0,\s*1/);
  expect(metrics!.modeTransform).toMatch(/none|matrix\(1,\s*0,\s*0,\s*1/);
});

test("hiding the shelf slides the lift down before unmount", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".page-scroll .feed-card");

  const scroller = page.locator(".page-scroll").first();
  await scroller.evaluate((el) => {
    el.scrollTop = 900;
  });
  await page.waitForSelector("nav.bottom-nav.is-shelf-raised.is-enter-visible");

  // Scroll back up so compact shelf hides.
  await scroller.evaluate((el) => {
    el.scrollTop = 0;
  });

  // While exiting, lift should translate down with is-shelf-raised still on.
  await page.waitForFunction(() => {
    const nav = document.querySelector("nav.bottom-nav");
    const lift = document.querySelector(".bottom-nav__lift");
    if (!nav || !lift) return false;
    if (!nav.classList.contains("is-shelf-raised")) return false;
    if (nav.classList.contains("is-enter-visible")) return false;
    const transform = getComputedStyle(lift).transform;
    return transform.includes("matrix") && transform !== "none";
  }, { timeout: 3_000 });

  await page.waitForSelector("nav.bottom-nav.is-shelf-raised", {
    state: "detached",
    timeout: 3_000,
  }).catch(() => undefined);

  // Settled: mode row gone, raised classes cleared.
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const nav = document.querySelector("nav.bottom-nav");
        return {
          raised: nav?.classList.contains("is-shelf-raised") ?? false,
          mode: !!document.querySelector(".bottom-nav__mode-row"),
        };
      });
    }, { timeout: 3_000 })
    .toEqual({ raised: false, mode: false });
});
