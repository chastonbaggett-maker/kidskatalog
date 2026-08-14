/**
 * Smoke checks for click-melody engine: looping MP3 bed, no click-note sequencer.
 * Run: node scripts/smoke-click-melody.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(resolve(root, "src/lib/click-melody-engine.ts"), "utf8");
const ui = readFileSync(resolve(root, "src/components/ClickMelody.tsx"), "utf8");
const bedPath = resolve(root, "public/music/marble-balloon-hop.mp3");

const checks = [
  ["engine has no setInterval click loop", !src.includes("setInterval")],
  ["engine has no STEPS sequencer grid", !src.includes("const STEPS")],
  ["engine uses Marble Balloon Hop bed URL", src.includes("marble-balloon-hop.mp3")],
  ["engine loops bed via AudioBufferSource", src.includes("source.loop = true")],
  ["engine notes are one-shot", src.includes("one-shot") && src.includes("this.pluck(")],
  ["bed MP3 exists in public/music", existsSync(bedPath)],
  ["UI no longer calls clearLoop", !ui.includes("clearLoop")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed += 1;
}

process.exit(failed ? 1 : 0);
