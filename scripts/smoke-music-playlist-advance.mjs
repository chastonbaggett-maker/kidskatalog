/**
 * Smoke: playlist advances (songs do not self-loop).
 * Run: node scripts/smoke-music-playlist-advance.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { "@": "/workspace/src" },
});

const { MUSIC_TRACKS, nextMusicTrackId, DEFAULT_MUSIC_TRACK_ID } = jiti(
  "../src/lib/music-tracks.ts",
);

assert.ok(MUSIC_TRACKS.length >= 2);
const first = DEFAULT_MUSIC_TRACK_ID;
let id = first;
const seen = new Set();
for (let i = 0; i < MUSIC_TRACKS.length; i += 1) {
  assert.ok(!seen.has(id), `duplicate before full loop: ${id}`);
  seen.add(id);
  id = nextMusicTrackId(id);
}
assert.equal(id, first, "playlist should wrap to the first track");

const engineSrc = readFileSync("src/lib/click-melody-engine.ts", "utf8");
assert.match(engineSrc, /source\.loop\s*=\s*false/);
assert.doesNotMatch(engineSrc, /source\.loop\s*=\s*true/);
assert.match(engineSrc, /onTrackEnded/);

const uiSrc = readFileSync("src/components/ClickMelody.tsx", "utf8");
assert.match(uiSrc, /setOnTrackEnded/);
assert.match(uiSrc, /nextTrack\(\)/);

console.log("smoke-music-playlist-advance: PASS");
