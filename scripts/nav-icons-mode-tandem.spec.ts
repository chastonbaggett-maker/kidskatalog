import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

test("raised shelf lifts frost, icons, and mode row with ease-in-out", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".page-scroll .feed-card");

  // Ensure we start from the collapsed shelf so the raise animation can run.
  await page.locator(".page-scroll").first().evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForFunction(() => {
    const nav = document.querySelector("nav.bottom-nav");
    return !nav?.classList.contains("is-shelf-raised");
  }, { timeout: 5_000 });

  // Capture pending → sliding → settled transform samples while raising.
  await page.evaluate(() => {
    (window as unknown as { __liftSamples?: string[] }).__liftSamples = [];
  });

  await page.locator(".page-scroll").first().evaluate((el) => {
    el.scrollTop = 900;
  });

  // Wait until pending raised state (translated down, not yet enter-visible).
  await page.waitForFunction(() => {
    const nav = document.querySelector("nav.bottom-nav");
    const lift = document.querySelector(".bottom-nav__lift");
    if (!nav || !lift) return false;
    if (!nav.classList.contains("is-shelf-raised")) return false;
    if (nav.classList.contains("is-enter-visible")) return false;
    const t = getComputedStyle(lift).transform;
    return t.includes("matrix") && t !== "none";
  }, { timeout: 8_000 });

  const pending = await page.evaluate(() => {
    const nav = document.querySelector("nav.bottom-nav")!;
    const lift = document.querySelector(".bottom-nav__lift")!;
    return {
      ready: nav.classList.contains("is-enter-ready"),
      visible: nav.classList.contains("is-enter-visible"),
      transform: getComputedStyle(lift).transform,
      transition: getComputedStyle(lift).transition,
    };
  });

  // Pending pose must be translated (not identity).
  expect(pending.visible).toBe(false);
  expect(pending.transform).toMatch(/matrix/);
  expect(pending.transform).not.toMatch(/matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)/);

  // Sample mid-animation once enter-visible arms the slide.
  await page.waitForSelector(
    "nav.bottom-nav.is-shelf-raised.is-enter-ready.is-enter-visible",
    { timeout: 5_000 },
  );

  const mid = await page.evaluate(async () => {
    const lift = document.querySelector(".bottom-nav__lift")!;
    const samples: string[] = [];
    const start = performance.now();
    while (performance.now() - start < 280) {
      samples.push(getComputedStyle(lift).transform);
      await new Promise((r) => requestAnimationFrame(r));
    }
    return {
      samples,
      transition: getComputedStyle(lift).transition,
      frostInLift:
        document.querySelector(".bottom-nav__frost")?.parentElement ===
        document.querySelector(".bottom-nav__lift"),
      iconsInLift:
        document.querySelector(".bottom-nav__icons")?.parentElement ===
        document.querySelector(".bottom-nav__lift"),
      modeInLift:
        document.querySelector(".bottom-nav__mode-row")?.parentElement ===
        document.querySelector(".bottom-nav__lift"),
    };
  });

  expect(mid.frostInLift).toBe(true);
  expect(mid.iconsInLift).toBe(true);
  expect(mid.modeInLift).toBe(true);
  expect(mid.transition).toContain("transform");
  expect(mid.transition).toMatch(/0\.42s|420ms/);
  expect(mid.transition).toMatch(/ease-in-out/);

  // At least two distinct transform values during the slide (not a snap).
  const unique = new Set(mid.samples);
  expect(unique.size).toBeGreaterThan(1);

  await page.waitForFunction(() => {
    const lift = document.querySelector(".bottom-nav__lift");
    if (!lift) return false;
    const t = getComputedStyle(lift).transform;
    return t === "none" || /matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)/.test(t);
  }, { timeout: 3_000 });
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
