import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(err.message));

await page.addInitScript(() => {
  try { sessionStorage.setItem("kidskatalog-splash-done", "1"); } catch {}
});

await page.goto("http://127.0.0.1:3456/shop", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(400);

const vis = await page.evaluate(() => {
  const splash = document.querySelector(".app-splash");
  const logo = document.querySelector(".app-splash__logo");
  const before = getComputedStyle(document.documentElement, "::before");
  const splashCs = splash ? getComputedStyle(splash) : null;
  return {
    splashAttr: document.documentElement.getAttribute("data-splash"),
    hasSplash: !!splash,
    splashZ: splashCs?.zIndex,
    beforeZ: before.zIndex,
    logoOpacity: logo ? getComputedStyle(logo).opacity : null,
    bootSrc: !!document.querySelector('script[src="/kk-boot.js"]'),
  };
});

await page.locator(".app-splash").click({ timeout: 5000 });
await page.waitForTimeout(1600);
await page.locator('a[href^="/toy/"]').first().click({ timeout: 8000 });
await page.waitForTimeout(1200);
const afterNav = await page.evaluate(() => {
  const shell = document.querySelector(".app-shell");
  return {
    path: location.pathname,
    shellVis: shell ? getComputedStyle(shell).visibility : null,
  };
});

const scriptWarnings = errors.filter((e) =>
  e.includes("Encountered a script tag while rendering React component"),
);

console.log("VIS", JSON.stringify(vis));
console.log("AFTER_NAV", JSON.stringify(afterNav));
console.log("SCRIPT_WARNINGS", scriptWarnings.length);
console.log("ALL_ERRORS", JSON.stringify(errors.slice(0, 8)));
const ok =
  vis.hasSplash &&
  Number(vis.splashZ) > Number(vis.beforeZ) &&
  afterNav.shellVis === "visible" &&
  scriptWarnings.length === 0;
console.log(ok ? "PASS" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
