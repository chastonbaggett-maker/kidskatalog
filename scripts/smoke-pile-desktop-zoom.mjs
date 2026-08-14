/**
 * Smoke: tablet + desktop pile mode can zoom out via ctrl+wheel.
 * Run against local dev: node scripts/smoke-pile-desktop-zoom.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3456";

function parseScale(transform) {
  const m = /matrix\(([^)]+)\)/.exec(transform || "");
  if (!m) return null;
  const parts = m[1].split(",").map((v) => Number(v.trim()));
  return parts[0];
}

async function enterPile(page) {
  await page.goto(`${BASE}/shop`, { waitUntil: "networkidle" });
  await page.locator("button.filter-pile-btn").first().click();
  await page.waitForSelector(".toy-pile-viewport", { timeout: 15000 });
  // Allow pile enter chrome/reveal to settle
  await page.waitForTimeout(1200);
  await page.waitForSelector(".toy-pile-stage", { timeout: 15000 });
}

async function measureZoom(page) {
  const stage = page.locator(".toy-pile-stage");
  const transform = await stage.evaluate((el) => getComputedStyle(el).transform);
  return parseScale(transform);
}

async function zoomOutViaWheel(page, steps = 12) {
  await page.evaluate(({ steps: n }) => {
    const el = document.querySelector(".toy-pile-viewport");
    if (!el) throw new Error("missing viewport");
    const rect = el.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      el.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: 120,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        }),
      );
    }
  }, { steps });
}

async function runCase(browser, { width, height, label, minDrop }) {
  const page = await browser.newPage({ viewport: { width, height } });
  try {
    await enterPile(page);
    const aria = await page.locator(".toy-pile-viewport").getAttribute("aria-label");
    const before = await measureZoom(page);
    await zoomOutViaWheel(page, 18);
    await page.waitForTimeout(100);
    const after = await measureZoom(page);
    const drop = before - after;
    const ok =
      aria?.includes("pinch to zoom") &&
      typeof before === "number" &&
      typeof after === "number" &&
      after < before - minDrop;
    console.log(
      JSON.stringify({
        label,
        width,
        height,
        aria,
        before,
        after,
        drop: Number(drop.toFixed(4)),
        ok,
      }),
    );
    if (!ok) {
      throw new Error(`${label}: expected zoom-out (drop>${minDrop}), got before=${before} after=${after}`);
    }
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await runCase(browser, {
    label: "tablet",
    width: 834,
    height: 1112,
    minDrop: 0.08,
  });
  await runCase(browser, {
    label: "desktop",
    width: 1280,
    height: 800,
    minDrop: 0.08,
  });
  console.log("smoke-pile-desktop-zoom: PASS");
} finally {
  await browser.close();
}
