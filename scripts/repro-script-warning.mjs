import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(err.message));

await page.goto("http://127.0.0.1:3456/shop", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(800);

const state = await page.evaluate(() => ({
  splashAttr: document.documentElement.getAttribute("data-splash"),
  hasSplash: !!document.querySelector(".app-splash"),
  hasBeforeInteractive: [...document.scripts].some((s) => s.id?.startsWith("kk-")),
}));

const scriptWarnings = errors.filter((e) =>
  e.includes("Encountered a script tag while rendering React component"),
);

console.log("STATE", JSON.stringify(state));
console.log("SCRIPT_WARNINGS", scriptWarnings.length);
console.log(scriptWarnings.length === 0 ? "PASS" : "FAIL");
await browser.close();
process.exit(scriptWarnings.length === 0 ? 0 : 1);
