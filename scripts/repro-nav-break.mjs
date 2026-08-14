import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console:${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`page:${err.message}`));

await page.goto("http://127.0.0.1:3456/shop", {
  waitUntil: "networkidle",
  timeout: 60000,
});

const snap = async (label) => {
  const s = await page.evaluate(() => {
    const shell = document.querySelector(".app-shell");
    const cs = shell ? getComputedStyle(shell) : null;
    return {
      path: location.pathname,
      splashAttr: document.documentElement.getAttribute("data-splash"),
      splashEl: !!document.querySelector(".app-splash"),
      shell: !!shell,
      shellVisibility: cs?.visibility ?? null,
      shellOpacity: cs?.opacity ?? null,
      bodyTextLen: (document.body?.innerText || "").length,
    };
  });
  console.log(label, JSON.stringify(s));
  return s;
};

await snap("AFTER_LOAD");
await page.locator(".app-splash").click({ timeout: 5000 }).catch(() => {});
await page.waitForTimeout(1600);
const afterSplash = await snap("AFTER_SPLASH");

await page.locator('a[href^="/toy/"]').first().click({ timeout: 10000 });
await page.waitForTimeout(1500);
const afterToy = await snap("AFTER_TOY_NAV");

await page.locator(".bottom-nav [aria-label='Home'], a[href='/shop']").last().click({
  timeout: 10000,
  force: true,
});
await page.waitForTimeout(1500);
const afterShop = await snap("AFTER_SHOP_NAV");

const domErrors = errors.filter(
  (e) => e.includes("insertBefore") || e.includes("removeChild"),
);
const ok =
  afterSplash.shellVisibility === "visible" &&
  afterToy.shell === true &&
  afterToy.shellVisibility === "visible" &&
  afterShop.shell === true &&
  afterShop.shellVisibility === "visible" &&
  domErrors.length === 0;

console.log("DOM_ERRORS", JSON.stringify(domErrors));
console.log("ALL_ERRORS_SAMPLE", JSON.stringify(errors.slice(0, 5)));
console.log(ok ? "PASS" : "FAIL");

await browser.close();
process.exit(ok ? 0 : 1);
