/**
 * Unit-ish smoke for Amazon gallery video extraction.
 * Run: node scripts/smoke-extract-listing-videos.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// generate-listings is server-only TS — exercise the regex logic inline to mirror it.
function normalizeAmazonMediaUrl(raw) {
  return raw
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .trim();
}

function isPlayableVideoUrl(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  if (/\.m3u8(\?|$)/i.test(url)) return false;
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return true;
  if (/media-amazon\.com\/images\/S\/vse-/i.test(url)) return true;
  if (/vse-vms-transcoding-artifact/i.test(url)) return true;
  return false;
}

function extractListingVideos(html) {
  const ranked = [];
  const push = (raw, score) => {
    const url = normalizeAmazonMediaUrl(raw);
    if (!isPlayableVideoUrl(url)) return;
    ranked.push({ url, score });
  };
  for (const m of html.matchAll(
    /"url"\s*:\s*"(https:\\\/\\\/[^"]+?\.(?:mp4|webm)[^"]*)"/gi,
  )) {
    push(m[1], 4);
  }
  for (const m of html.matchAll(
    /"url"\s*:\s*"(https:\/\/[^"]+?\.(?:mp4|webm)[^"]*)"/gi,
  )) {
    push(m[1], 4);
  }
  for (const m of html.matchAll(
    /"(?:videoUrl|videoURL|mainUrl|downloadUrl)"\s*:\s*"(https:\\\/\\\/[^"]+|https:\/\/[^"]+)"/gi,
  )) {
    push(m[1], 5);
  }
  for (const m of html.matchAll(
    /https:\/\/[^\s"'<>]+?\.(?:mp4|webm)(?:\?[^\s"'<>]*)?/gi,
  )) {
    push(m[0], 2);
  }
  ranked.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const out = [];
  for (const { url } of ranked) {
    const key = url.split("?")[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
    if (out.length >= 1) break;
  }
  return out;
}

const sample = `
<script>
var colorImages = {
  "videos":[{
    "title":"Product video",
    "url":"https:\\/\\/m.media-amazon.com\\/images\\/S\\/vse-vms-transcoding-artifact-us-east-1-prod\\/abc123\\/clip.mp4",
    "videoHeight":1080
  }],
  "hiRes":"https://m.media-amazon.com/images/I/photo.jpg"
};
var videoUrl = "https://cdn.example.com/toy-demo.webm?foo=1";
</script>
<video data-video-url="https://cdn.example.com/ignored.m3u8"></video>
`;

const found = extractListingVideos(sample);
console.log(found);
assert.equal(found.length, 1);
assert.match(found[0], /\.mp4/);
assert.ok(!found.some((u) => u.includes(".m3u8")));
console.log("smoke-extract-listing-videos: PASS");
