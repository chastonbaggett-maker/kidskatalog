/**
 * Smoke: browse compact shelf shows back-to-top; toy page keeps Back.
 * Run: node scripts/smoke-shelf-back-to-top.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3456";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 406, height: 900 } });

try {
  await page.goto(`${BASE}/shop`, { waitUntil: "networkidle" });

  // Scroll until compact shelf overlay appears
  await page.waitForSelector(".page-scroll", { timeout: 15000 });
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => {
      const scroller = document.querySelector(".page-scroll");
      if (scroller) scroller.scrollTop += 200;
    });
    await page.waitForTimeout(150);
    if (await page.locator(".browse-shelf-overlay.is-visible").count()) break;
  }

  await page.waitForSelector(".browse-shelf-overlay.is-visible .shelf-header", {
    timeout: 10000,
  });

  const topBtn = page.locator(
    '.browse-shelf-overlay.is-visible button[aria-label="Back to top"]',
  );
  await topBtn.waitFor({ timeout: 5000 });

  const before = await page.evaluate(
    () => document.querySelector(".page-scroll")?.scrollTop ?? -1,
  );
  await page.evaluate(() => {
    const btn = document.querySelector(
      '.browse-shelf-overlay.is-visible button[aria-label="Back to top"]',
    );
    if (!(btn instanceof HTMLButtonElement)) {
      throw new Error("back-to-top button missing");
    }
    btn.click();
  });
  await page.waitForFunction(
    () => (document.querySelector(".page-scroll")?.scrollTop ?? 999) < 40,
    { timeout: 5000 },
  );
  const after = await page.evaluate(
    () => document.querySelector(".page-scroll")?.scrollTop ?? -1,
  );

  if (!(before > 48 && after < 40)) {
    throw new Error(`back-to-top failed: before=${before} after=${after}`);
  }

  // Toy page: back wins, no up button
  await page.goto(`${BASE}/shop`, { waitUntil: "networkidle" });
  const firstCard = page.locator('a[href^="/toy/"]').first();
  await firstCard.waitFor({ timeout: 15000 });
  await firstCard.click();
  await page.waitForSelector('.shelf-header a[aria-label="Back"]', {
    timeout: 15000,
  });
  const upOnToy = await page
    .locator('.shelf-header button[aria-label="Back to top"]')
    .count();
  if (upOnToy !== 0) {
    throw new Error("toy page should not show back-to-top when Back is present");
  }

  console.log(
    JSON.stringify({
      ok: true,
      browse: { before, after },
      toyKeepsBack: true,
    }),
  );
} finally {
  await browser.close();
}
