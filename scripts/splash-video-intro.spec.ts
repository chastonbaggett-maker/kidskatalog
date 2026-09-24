import { test, expect } from "@playwright/test";

test.use({ channel: "chrome" });

test("splash part1 stays mint (never black) and opens on first frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });

  const splash = page.locator(".app-splash");
  await expect(splash).toBeVisible();

  // Sample early paints — none should be near-black.
  const samples: Array<{ bg: string; phase: string | null; src: string | null }> =
    [];
  for (let i = 0; i < 8; i++) {
    samples.push(
      await page.evaluate(() => {
        const el = document.querySelector(".app-splash");
        const v = document.querySelector(
          ".app-splash__video--part1",
        ) as HTMLVideoElement | null;
        return {
          bg: el ? getComputedStyle(el).backgroundColor : "none",
          phase: el?.getAttribute("data-splash-phase") ?? null,
          src: v?.currentSrc || v?.getAttribute("src") || null,
        };
      }),
    );
    await page.waitForTimeout(120);
  }

  for (const s of samples) {
    expect(s.bg).toMatch(/rgb\(\s*62,\s*207,\s*192\s*\)/);
    expect(s.bg).not.toMatch(/rgb\(\s*0,\s*0,\s*0\s*\)/);
  }
  expect(samples.some((s) => s.src?.includes("intro-part-1-mint"))).toBe(true);

  // Poster or video should not present a black canvas.
  const canvasCheck = await page.evaluate(async () => {
    const poster = document.querySelector(
      ".app-splash__poster",
    ) as HTMLImageElement | null;
    const video = document.querySelector(
      ".app-splash__video--part1",
    ) as HTMLVideoElement | null;
    const sample = (el: CanvasImageSource, w: number, h: number) => {
      const c = document.createElement("canvas");
      c.width = 8;
      c.height = 8;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(el, 0, 0, w, h, 0, 0, 8, 8);
      const d = ctx.getImageData(0, 0, 8, 8).data;
      let min = 255;
      for (let i = 0; i < d.length; i += 4) {
        min = Math.min(min, (d[i] + d[i + 1] + d[i + 2]) / 3);
      }
      return min;
    };
    let posterMin = 255;
    if (poster && poster.complete && poster.naturalWidth) {
      posterMin = sample(poster, poster.naturalWidth, poster.naturalHeight);
    }
    let videoMin = 255;
    if (video && video.readyState >= 2 && video.videoWidth) {
      videoMin = sample(video, video.videoWidth, video.videoHeight);
    }
    return { posterMin, videoMin };
  });

  expect(canvasCheck.posterMin).toBeGreaterThan(80);
  if (canvasCheck.videoMin < 250) {
    expect(canvasCheck.videoMin).toBeGreaterThan(80);
  }

  await expect(splash).toHaveClass(/app-splash--hold/, { timeout: 12_000 });
  await expect(page.getByText("Tap to continue")).toBeVisible();

  await page.waitForTimeout(800);
  await expect(splash).toHaveAttribute("data-splash-phase", "hold");

  await splash.click();
  await expect(splash).toHaveClass(/app-splash--part2/, { timeout: 3_000 });
  const part2Bg = await splash.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  expect(part2Bg).toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)/);
});
