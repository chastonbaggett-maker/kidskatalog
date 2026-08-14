import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Frame-by-frame capture during add-to-kart.
 * Detects visual flash via pixel diff + oversized img rects.
 */
test("frame capture during add-to-kart", async ({ page }, testInfo) => {
  const outDir = path.join(testInfo.outputDir, "kart-frames");
  fs.mkdirSync(outDir, { recursive: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidskatalog-crazy-mode",
      JSON.stringify({ state: { crazyMode: false }, version: 0 }),
    );
  });

  await page.goto("http://localhost:3456/toy/sky-rocket", {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));
  await page.locator(".more-toys-feed").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Baseline before click
  await page.screenshot({ path: path.join(outDir, "before.png"), fullPage: false });

  await page.evaluate(() => {
    type Frame = {
      t: number;
      imgs: Array<{
        src: string;
        cls: string;
        w: number;
        h: number;
        top: number;
        left: number;
        opacity: string;
        position: string;
        zIndex: string;
        transform: string;
      }>;
      flags: {
        kartEffect: boolean;
        kartLanding: boolean;
        flyBall: boolean;
        burst: boolean;
      };
    };
    const frames: Frame[] = [];
    const t0 = performance.now();
    (window as unknown as { __frames: Frame[]; __t0: number }).__frames = frames;
    (window as unknown as { __t0: number }).__t0 = t0;

    const sample = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      const imgs: Frame["imgs"] = [];

      for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
        const r = img.getBoundingClientRect();
        const cs = getComputedStyle(img);
        if (r.width >= vw * 0.5 && r.height >= vh * 0.4) {
          imgs.push({
            src: img.src.slice(-64),
            cls: img.className,
            w: Math.round(r.width),
            h: Math.round(r.height),
            top: Math.round(r.top),
            left: Math.round(r.left),
            opacity: cs.opacity,
            position: cs.position,
            zIndex: cs.zIndex,
            transform: cs.transform,
          });
        }
      }

      frames.push({
        t: Math.round(performance.now() - t0),
        imgs,
        flags: {
          kartEffect: document.documentElement.classList.contains("kart-effect-active"),
          kartLanding: document.querySelector(".bottom-nav--kart-landing") != null,
          flyBall: document.querySelector(".kart-fly-ball") != null,
          burst: document.querySelector(".add-kart-btn--burst") != null,
        },
      });

      if (performance.now() - t0 < 2000) {
        requestAnimationFrame(sample);
      }
    };
    requestAnimationFrame(sample);
  });

  await page.locator(".add-kart-btn").click();

  // Capture screenshots at key intervals
  const captureMs = [0, 50, 100, 200, 400, 600, 700, 750, 800, 850, 900, 950, 1000, 1100, 1200, 1400];
  for (const ms of captureMs) {
    await page.waitForTimeout(ms === 0 ? 0 : 50);
    await page.screenshot({
      path: path.join(outDir, `t-${String(ms).padStart(4, "0")}.png`),
      fullPage: false,
    });
  }

  await page.waitForTimeout(800);

  const analysis = await page.evaluate(() => {
    const frames =
      (window as unknown as {
        __frames: Array<{
          t: number;
          imgs: Array<{ src: string; cls: string; w: number; h: number }>;
          flags: Record<string, boolean>;
        }>;
      }).__frames ?? [];

    const withImgs = frames.filter((f) => f.imgs.length > 0);
    const duringPulse = frames.filter(
      (f) => f.t >= 550 && f.t <= 1300 && f.imgs.length > 0,
    );
    const duringLanding = frames.filter(
      (f) => f.flags.kartLanding && f.imgs.length > 0,
    );

    return {
      totalFrames: frames.length,
      framesWithOversizedImg: withImgs.length,
      duringPulseHits: duringPulse.length,
      duringLandingHits: duringLanding.length,
      pulseSamples: duringPulse.slice(0, 8),
      allImgSamples: withImgs.slice(0, 10),
      landingFrames: frames.filter((f) => f.flags.kartLanding).map((f) => f.t),
      kartEffectFrames: frames.filter((f) => f.flags.kartEffect).length,
    };
  });

  console.log("FRAME_ANALYSIS", JSON.stringify(analysis, null, 2));

  // Pixel diff: compare before vs each screenshot during pulse window
  const diffs: Array<{ ms: number; changedPixels: number; ratio: number }> = [];
  const before = await page.screenshot({ fullPage: false });
  // Re-navigate state is gone; use first captured - load before.png via read

  fs.writeFileSync(
    path.join(outDir, "analysis.json"),
    JSON.stringify(analysis, null, 2),
  );

  expect(
    analysis.duringPulseHits,
    `oversized imgs during pulse: ${JSON.stringify(analysis.pulseSamples)}`,
  ).toBe(0);
});

test("pixel diff flash detection during add-to-kart", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3456/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("kidskatalog-kart");
    localStorage.setItem(
      "kidskatalog-crazy-mode",
      JSON.stringify({ state: { crazyMode: false }, version: 0 }),
    );
  });
  await page.locator(".more-toys-feed").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const baseline = await page.screenshot({ type: "png" });

  await page.evaluate(() => {
    (window as unknown as { __diffs: Array<{ t: number; changed: number }> }).__diffs =
      [];
    const t0 = performance.now();

    const canvas = document.createElement("canvas");
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const ctx = canvas.getContext("2d")!;

    // We'll compare in playwright instead
    (window as unknown as { __t0: number }).__t0 = t0;
  });

  // Rapid screenshots after click
  await page.locator(".add-kart-btn").click();

  const shots: Array<{ t: number; buf: Buffer }> = [];
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(40);
    const buf = await page.screenshot({ type: "png" });
    shots.push({ t: i * 40, buf });
  }

  // Compare each shot to baseline using raw pixel comparison in node
  function countDiff(a: Buffer, b: Buffer): number {
    const len = Math.min(a.length, b.length);
    let changed = 0;
    for (let i = 0; i < len; i += 4) {
      if (
        Math.abs(a[i]! - b[i]!) > 25 ||
        Math.abs(a[i + 1]! - b[i + 1]!) > 25 ||
        Math.abs(a[i + 2]! - b[i + 2]!) > 25
      ) {
        changed++;
      }
    }
    return changed;
  }

  const diffResults = shots.map(({ t, buf }) => ({
    t,
    changed: countDiff(baseline, buf),
    ratio: countDiff(baseline, buf) / (390 * 844),
  }));

  const spike = diffResults.filter((d) => d.t >= 500 && d.t <= 1200);
  const maxSpike = spike.reduce(
    (max, d) => (d.changed > max.changed ? d : max),
    { t: 0, changed: 0, ratio: 0 },
  );

  console.log("PIXEL_DIFFS", JSON.stringify({ maxSpike, spike: spike.filter((d) => d.changed > 5000) }, null, 2));

  const outDir = path.join(testInfo.outputDir, "pixel-diff");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "baseline.png"), baseline);
  fs.writeFileSync(path.join(outDir, `spike-t${maxSpike.t}.png`), shots.find((s) => s.t === maxSpike.t)!.buf);
  fs.writeFileSync(path.join(outDir, "diffs.json"), JSON.stringify(diffResults, null, 2));

  // Save screenshot at max change during pulse window for visual inspection
  if (maxSpike.t > 0) {
    console.log(`Max visual change at t=${maxSpike.t}ms: ${maxSpike.changed} pixels`);
  }
});
