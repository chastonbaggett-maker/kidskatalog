/**
 * Smoke: gallery puts video second; media helpers ignore stock demos.
 * Run: node scripts/smoke-gallery-video-order.mjs
 */
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { "@": "/workspace/src" },
});

const { buildToyGalleryMedia } = jiti("../src/lib/toy-media.ts");

const media = buildToyGalleryMedia({
  image: "/toys/a.jpg",
  images: ["/toys/a.jpg", "/toys/b.jpg", "/toys/c.jpg"],
  videos: ["https://cdn.example.com/clip.m3u8"],
});

assert.equal(media.length, 4);
assert.deepEqual(
  media.map((m) => m.kind),
  ["image", "video", "image", "image"],
);
assert.equal(media[0].src, "/toys/a.jpg");
assert.equal(media[1].src, "https://cdn.example.com/clip.m3u8");
assert.equal(media[2].src, "/toys/b.jpg");

const noVideo = buildToyGalleryMedia({
  image: "/toys/a.jpg",
  images: ["/toys/a.jpg", "/toys/b.jpg"],
});
assert.deepEqual(
  noVideo.map((m) => m.kind),
  ["image", "image"],
);

console.log("smoke-gallery-video-order: PASS");
