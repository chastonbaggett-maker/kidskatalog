/**
 * Smoke: stock /videos/ demos are ignored; Watch empty copy is correct.
 * Run: node scripts/smoke-watch-no-stock-videos.mjs
 */
import assert from "node:assert/strict";
import { createJiti } from "jiti";
import { readFileSync, existsSync } from "node:fs";
import { chromium } from "playwright";

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { "@": "/workspace/src" },
});
const { getToyVideos, toyHasVideo } = jiti("../src/lib/toy-media.ts");
const { filterCatalogToys } = jiti("../src/lib/catalog-query.ts");

assert.deepEqual(getToyVideos({ videos: ["/videos/flower.mp4"] }), []);
assert.equal(toyHasVideo({ videos: ["/videos/clip-1.mp4"] }), false);
assert.deepEqual(
  getToyVideos({
    videos: ["/videos/demo-mint.mp4", "https://cdn.example.com/real.mp4"],
  }),
  ["https://cdn.example.com/real.mp4"],
);

const filtered = filterCatalogToys(
  [
    { id: "a", name: "A", videos: ["/videos/flower.mp4"] },
    { id: "b", name: "B", videos: ["https://cdn.example.com/b.mp4"] },
  ],
  { hasVideo: true },
);
assert.equal(filtered.length, 1);
assert.equal(filtered[0].id, "b");

const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8"));
const toys = catalog.toys || catalog;
const stockLeft = toys.filter((t) =>
  (t.videos || []).some((v) => String(v).startsWith("/videos/")),
);
assert.equal(stockLeft.length, 0, "catalog still has /videos/ stock refs");

for (const name of ["clip-1.mp4", "demo-mint.mp4", "flower.mp4"]) {
  assert.equal(existsSync(`public/videos/${name}`), false, name);
}

const BASE = process.env.BASE_URL || "http://localhost:3456";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  await page.goto(`${BASE}/menu`, { waitUntil: "domcontentloaded" });
  const splash = page.locator(".app-splash");
  if (await splash.count()) {
    await splash.click({ force: true }).catch(() => {});
  }
  await page.getByText("No video content available").waitFor({ timeout: 10000 });
  const html = await page.content();
  assert.doesNotMatch(html, /No toy videos yet/i);
  assert.doesNotMatch(html, /\/videos\/(flower|clip-1|demo-mint)\.mp4/);
  console.log("smoke-watch-no-stock-videos: PASS");
} finally {
  await browser.close();
}
