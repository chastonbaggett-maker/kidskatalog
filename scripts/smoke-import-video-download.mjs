/**
 * Integration smoke: extract + download Amazon primary video to local mp4.
 * Run: node scripts/smoke-import-video-download.mjs
 */
import assert from "node:assert/strict";
import { createJiti } from "jiti";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// Stub server-only for jiti loads of toy-image-store.
const stubDir = "/tmp/kk-server-only-stub";
mkdirSync(stubDir, { recursive: true });
writeFileSync(path.join(stubDir, "index.js"), "module.exports = {};\n");
writeFileSync(
  path.join(stubDir, "package.json"),
  JSON.stringify({ name: "server-only", main: "index.js" }),
);

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: {
    "@": "/workspace/src",
    "server-only": path.join(stubDir, "index.js"),
  },
});

const { extractListingVideos } = jiti("../src/lib/amazon-listing-videos.ts");
const { downloadAndStoreVideo } = jiti("../src/lib/toy-image-store.ts");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const asin = "B0BBRGJTD7";

const res = await fetch(`https://www.amazon.com/dp/${asin}?th=1&psc=1`, {
  headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  redirect: "follow",
});
assert.equal(res.ok, true, `Amazon fetch ${res.status}`);
const html = await res.text();
const videos = extractListingVideos(html);
console.log("extracted", videos);
assert.ok(videos.length >= 1, "expected at least one video URL");
assert.match(videos[0], /\.(m3u8|mp4)(\?|$)/i);

const stored = await downloadAndStoreVideo(
  videos[0],
  `smoke-${asin.toLowerCase()}`,
  UA,
);
console.log("stored", stored);
assert.ok(stored, "expected stored path");

if (stored.startsWith("/toys/")) {
  assert.equal(existsSync(`public${stored}`), true, `missing file ${stored}`);
  assert.match(stored, /\.mp4$/i);
} else {
  assert.match(stored, /^https:\/\//i);
}

console.log("smoke-import-video-download: PASS");
