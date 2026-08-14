/**
 * Smoke: labeled buttons speak; icon-only silent; mute silences voice-over.
 * Run: node scripts/smoke-button-voiceover.mjs
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3456";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.addInitScript(() => {
    const spoken = [];
    window.__spokenLabels = spoken;
    window.__lastUtter = null;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel = () => {};
    synth.resume = () => {};
    Object.defineProperty(synth, "paused", { get: () => false });
    synth.speak = (utter) => {
      spoken.push(String(utter?.text || ""));
      window.__lastUtter = {
        text: String(utter?.text || ""),
        rate: utter.rate,
        pitch: utter.pitch,
      };
    };
    synth.getVoices = () => [
      {
        name: "Microsoft Aria Online (Natural) - English (United States)",
        lang: "en-US",
        localService: false,
        default: true,
        voiceURI: "aria-natural",
      },
      {
        name: "Bad News",
        lang: "en-US",
        localService: true,
        default: false,
        voiceURI: "bad-news",
      },
    ];
  });

  await page.goto(`${BASE}/shop`, { waitUntil: "networkidle" });

  const dismissSplash = async () => {
    const splash = page.locator(".app-splash");
    if (await splash.count()) {
      await splash.click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
    }
  };
  await dismissSplash();

  // Icon-only first
  await page.locator(".thumb-carousel__expand").click({ force: true });
  await page.waitForTimeout(50);
  await page.locator("button.voice-mic").first().click({ force: true });
  await page.waitForTimeout(50);

  // Labeled
  await page.getByRole("button", { name: /boys/i }).first().click();
  await page.waitForTimeout(50);
  await page.locator("button.filter-pile-btn").first().click();
  await page.waitForTimeout(50);

  let spoken = await page.evaluate(() => window.__spokenLabels || []);
  const last = await page.evaluate(() => window.__lastUtter);

  assert.ok(
    spoken.some((t) => /boys/i.test(t)),
    `expected Boys speech, got ${JSON.stringify(spoken)}`,
  );
  assert.ok(
    spoken.some((t) => /toy pile/i.test(t)),
    `expected Toy Pile speech, got ${JSON.stringify(spoken)}`,
  );
  assert.ok(
    !spoken.some((t) =>
      /speak|stop|expand|collapse|listening|categories/i.test(t),
    ),
    `icon-only controls should be silent, got ${JSON.stringify(spoken)}`,
  );

  // Natural cadence (not the old cartoon 1.2 / 1.35)
  assert.ok(last && last.rate <= 1.08 && last.pitch <= 1.08, `utter props ${JSON.stringify(last)}`);

  // Mute music → voice-over silent
  await page.evaluate(() => {
    window.__spokenLabels.length = 0;
  });
  await page.locator(".site-music-toggle").click({ force: true });
  await page.waitForTimeout(80);
  await page.getByRole("button", { name: /girls/i }).first().click();
  await page.waitForTimeout(50);
  spoken = await page.evaluate(() => window.__spokenLabels || []);
  assert.equal(
    spoken.length,
    0,
    `muted audio should silence voice-over, got ${JSON.stringify(spoken)}`,
  );

  // Unmute → speaks again
  await page.locator(".site-music-toggle").click({ force: true });
  await page.waitForTimeout(80);
  await page.getByRole("button", { name: /girls/i }).first().click();
  await page.waitForTimeout(50);
  spoken = await page.evaluate(() => window.__spokenLabels || []);
  assert.ok(
    spoken.some((t) => /girls/i.test(t)),
    `unmuted should speak Girls, got ${JSON.stringify(spoken)}`,
  );

  console.log("smoke-button-voiceover: PASS");
} finally {
  await browser.close();
}
