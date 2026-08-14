/**
 * Smoke checks for multi-track bed music player.
 * Run: node scripts/smoke-click-melody.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(resolve(root, "src/lib/click-melody-engine.ts"), "utf8");
const tracks = readFileSync(resolve(root, "src/lib/music-tracks.ts"), "utf8");
const ui = readFileSync(resolve(root, "src/components/ClickMelody.tsx"), "utf8");
const marble = resolve(root, "public/music/marble-balloon-hop.mp3");
const clouds = resolve(root, "public/music/clouds-in-a-bubble.mp3");

const checks = [
  ["catalog lists Marble Balloon Hop", tracks.includes("Marble Balloon Hop")],
  ["catalog lists Clouds in a Bubble", tracks.includes("Clouds in a Bubble")],
  ["engine can setTrack", src.includes("setTrack(")],
  ["engine loops bed via AudioBufferSource", src.includes("source.loop = true")],
  ["UI has next-song control", ui.includes("site-music-next") && ui.includes("nextTrack")],
  ["UI shows track title", ui.includes("site-music-player__title")],
  ["marble MP3 present", existsSync(marble)],
  ["clouds MP3 present", existsSync(clouds)],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed += 1;
}

process.exit(failed ? 1 : 0);
