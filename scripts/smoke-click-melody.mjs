/**
 * Smoke checks for click-melody engine: no loop clock, ambient pad present.
 * Run: node scripts/smoke-click-melody.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(resolve(root, "src/lib/click-melody-engine.ts"), "utf8");
const ui = readFileSync(resolve(root, "src/components/ClickMelody.tsx"), "utf8");

const checks = [
  ["engine has no setInterval loop clock", !src.includes("setInterval")],
  ["engine has no STEPS sequencer grid", !src.includes("const STEPS")],
  ["engine has no writeHead / tickHead / decayLoop", !/\bwriteHead\b|\btickHead\b|\bdecayLoop\b/.test(src)],
  ["engine starts ambient pad", src.includes("ensurePad") && src.includes("PAD_PARTIALS")],
  ["engine notes are one-shot", src.includes("one-shot") && src.includes("this.pluck(")],
  ["UI no longer calls clearLoop", !ui.includes("clearLoop")],
  ["UI float notes are live-only", !ui.includes("is-loop")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed += 1;
}

process.exit(failed ? 1 : 0);
