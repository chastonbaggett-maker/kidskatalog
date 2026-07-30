#!/usr/bin/env node
/**
 * Guards the verified iPhone PWA shell + scroll layout.
 * Run: npm run check:shell
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function fail(msg) {
  errors.push(msg);
}

const errors = [];

// --- Critical file invariants ---
const globals = read("src/app/globals.css");
for (const needle of [
  "html[data-standalone=\"true\"] body",
  "height: 100vh",
  ".page-scroll",
  ".scroll-pad-bottom",
  ".bottom-nav",
  "--bottom-nav-offset",
]) {
  if (!globals.includes(needle)) fail(`globals.css missing: ${needle}`);
}

const appShell = read("src/components/AppShell.tsx");
if (!appShell.includes("overflow-hidden")) {
  fail("AppShell.tsx must keep overflow-hidden on shell + star-field");
}
if (!appShell.includes("min-h-0")) {
  fail("AppShell.tsx must keep min-h-0 flex chain");
}

const bottomNav = read("src/components/BottomNav.tsx");
if (!bottomNav.includes("absolute inset-x-0 bottom-0")) {
  fail("BottomNav.tsx must stay absolute inset-x-0 bottom-0 (frosted overlay)");
}

const layout = read("src/app/layout.tsx");
if (!layout.includes("viewportFit: \"cover\"")) {
  fail("layout.tsx must keep viewportFit: cover");
}
if (!layout.includes("overflow-hidden")) {
  fail("layout.tsx must keep overflow-hidden on html/body");
}

const browseFeed = read("src/components/BrowseFeed.tsx");
if (!browseFeed.includes("page-scroll star-field min-h-0 flex-1")) {
  fail("BrowseFeed.tsx scroller must use page-scroll star-field min-h-0 flex-1");
}

// --- Shelf-header pages: canonical scroll pattern ---
const shelfPages = [
  "src/app/kart/page.tsx",
  "src/app/menu/page.tsx",
  "src/app/profile/page.tsx",
  "src/app/toy/[id]/page.tsx",
];

for (const rel of shelfPages) {
  const src = read(rel);
  if (!src.includes("overflow-hidden")) {
    fail(`${rel}: wrapper needs overflow-hidden`);
  }
  if (!/className="[^"]*page-scroll[^"]*min-h-0[^"]*flex-1[^"]*scroll-pad-bottom/.test(src)) {
    fail(
      `${rel}: scroll region needs page-scroll + min-h-0 + flex-1 + scroll-pad-bottom`,
    );
  }
}

// --- Walk src/app for page.tsx using ShelfHeader outside BrowseFeed ---
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === "page.tsx") out.push(p);
  }
  return out;
}

for (const abs of walk(join(root, "src/app"))) {
  const rel = relative(root, abs);
  if (rel === "src/app/shop/page.tsx" || rel === "src/app/shop/[category]/page.tsx") {
    continue; // BrowseFeed handles scroll
  }
  const src = read(rel);
  if (src.includes("ShelfHeader") && !shelfPages.includes(rel)) {
    fail(`${rel}: uses ShelfHeader but is not in the guarded shelf-page list — update check-shell-layout.mjs`);
  }
}

if (errors.length) {
  console.error("\n❌ Shell layout check failed:\n");
  for (const e of errors) console.error(`  • ${e}`);
  console.error("\nSee .cursor/rules/pwa-shell-layout.mdc and AGENTS.md\n");
  process.exit(1);
}

console.log("✅ Shell layout check passed");
