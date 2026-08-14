/**
 * Smoke: labeled buttons speak; icon-only buttons stay silent.
 * Run: node scripts/smoke-button-voiceover.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3456";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.addInitScript(() => {
    const spoken = [];
    window.__spokenLabels = spoken;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel = () => {};
    synth.speak = (utter) => {
      spoken.push(String(utter?.text || ""));
    };
    synth.getVoices = () => [
      {
        name: "Google US English",
        lang: "en-US",
        default: true,
        localService: true,
        voiceURI: "Google US English",
      },
    ];
  });

  await page.goto(`${BASE}/shop`, { waitUntil: "networkidle" });

  // Icon-only expand first (while feed chrome is still up)
  await page.locator(".thumb-carousel__expand").click({ force: true });
  await page.waitForTimeout(80);

  // Icon-only: voice mic (aria-label only, no visible text)
  await page.locator("button.voice-mic").first().click({ force: true });
  await page.waitForTimeout(80);

  // Labeled: Boys filter chip
  await page.getByRole("button", { name: /boys/i }).first().click();
  await page.waitForTimeout(80);

  // Labeled: Toy Pile
  await page.locator("button.filter-pile-btn").first().click();
  await page.waitForTimeout(80);

  const spoken = await page.evaluate(() => window.__spokenLabels || []);
  console.log(JSON.stringify({ spoken }, null, 2));

  const hasBoys = spoken.some((t) => /boys/i.test(t));
  const hasToyPile = spoken.some((t) => /toy pile/i.test(t));
  const spokeIconOnly = spoken.some((t) =>
    /speak|stop|expand|collapse|listening|categories/i.test(t),
  );

  if (!hasBoys || !hasToyPile) {
    throw new Error(`expected Boys + Toy Pile speech, got ${JSON.stringify(spoken)}`);
  }
  if (spokeIconOnly) {
    throw new Error(`icon-only controls should be silent, got ${JSON.stringify(spoken)}`);
  }
  if (spoken.length !== 2) {
    throw new Error(`expected exactly 2 utterances, got ${JSON.stringify(spoken)}`);
  }

  console.log("smoke-button-voiceover: PASS");
} finally {
  await browser.close();
}
