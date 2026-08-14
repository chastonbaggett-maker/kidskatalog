/**
 * Smoke: Amazon gallery video extraction finds primary HLS/MP4 clips.
 * Run: node scripts/smoke-extract-listing-videos.mjs
 */
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { "@": "/workspace/src" },
});

const { extractListingVideos } = jiti("../src/lib/amazon-listing-videos.ts");

const sample = `
<script>
var colorImages = {
  "videos":[{
    "creatorProfile":{},
    "groupType":"IB_G1",
    "aciContentId":"amzn1.ive.seller.video.abc",
    "isVideo":true,
    "isHeroVideo":true,
    "title":"Product video",
    "url":"https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/abc123/default.jobtemplate.hls.m3u8",
    "videoHeight":1080
  }],
  "hiRes":"https://m.media-amazon.com/images/I/photo.jpg"
};
</script>
`;

const found = extractListingVideos(sample);
console.log(found);
assert.equal(found.length, 1);
assert.match(found[0], /default\.jobtemplate\.hls\.m3u8/);

const progressive = extractListingVideos(`
"url":"https://m.media-amazon.com/images/S/al-na-9d5791cf-3faf/47deaf71-2746-462a-a7dc-9acf70b474a8.mp4/productVideoOptimized.mp4"
`);
assert.equal(progressive.length, 1);
assert.match(progressive[0], /productVideoOptimized\.mp4/);

console.log("smoke-extract-listing-videos: PASS");
