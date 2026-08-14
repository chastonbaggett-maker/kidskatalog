/**
 * Smoke: import keeps remote video links (no local download/store).
 * Run: node scripts/smoke-import-video-link.mjs
 */
import assert from "node:assert/strict";
import { createJiti } from "jiti";
import { readFileSync, existsSync } from "node:fs";

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { "@": "/workspace/src" },
});

const { extractListingVideos } = jiti("../src/lib/amazon-listing-videos.ts");

const sample = `
"videos":[{
  "creatorProfile":{},
  "groupType":"IB_G1",
  "isHeroVideo":true,
  "url":"https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/abc123/default.jobtemplate.hls.m3u8"
}],
`;

const found = extractListingVideos(sample);
assert.equal(found.length, 1);
assert.match(found[0], /^https:\/\/.*\.m3u8$/i);

// generate-listings must not call downloadAndStoreVideo anymore
const genSrc = readFileSync("src/lib/generate-listings.ts", "utf8");
assert.doesNotMatch(genSrc, /downloadAndStoreVideo/);
assert.match(genSrc, /Keep remote stream/);

// video download helpers removed from image store
const storeSrc = readFileSync("src/lib/toy-image-store.ts", "utf8");
assert.doesNotMatch(storeSrc, /downloadAndStoreVideo|persistToyVideoBytes|ffmpegHlsToMp4/);

assert.equal(existsSync("scripts/smoke-import-video-download.mjs"), false);

console.log("smoke-import-video-link: PASS", found[0]);
