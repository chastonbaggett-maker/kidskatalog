/**
 * Pull all Amazon listing images into toy.images galleries.
 * Saves as /toys/{id}.jpg, /toys/{id}-1.jpg, … (up to 6, matching seed toys).
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalogPath = path.join(root, "data", "catalog.json");
const toysDir = path.join(root, "public", "toys");

const ORIGINAL_IDS = new Set([
  "sky-rocket",
  "mag-train",
  "roar-rex",
  "glow-bow",
  "big-hauler",
  "dino-track",
  "pet-vet",
  "mag-tiles",
  "dino-rex",
  "dino-long",
  "dino-pack",
  "bear-hug",
  "duck-bath",
  "bunny-soft",
  "race-red",
  "truck-dump",
  "train-set",
  "block-wood",
  "block-mega",
  "block-castle",
  "ball-kick",
  "bubbles-big",
  "scooter-kid",
  "game-memory",
  "game-puzzle",
  "game-dice",
  "stem-robot",
  "stem-magnets",
  "stem-kit",
  "pretend-kitchen",
  "pretend-doctor",
  "pretend-castle",
]);

const MAX_GALLERY = 6;

function parseAsin(url) {
  const m = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  return m?.[1]?.toUpperCase() ?? null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function amazonImageKey(url) {
  const m = url.match(/\/images\/I\/([^.\/]+)/);
  return m?.[1] ?? url;
}

/** Prefer hiRes / large product shots; dedupe by Amazon image id. */
function extractListingImages(html) {
  const ranked = [];
  const push = (url, score) => {
    if (!url || !url.includes("media-amazon.com/images/I/")) return;
    ranked.push({ url: url.replace(/\\u002F/g, "/"), score });
  };

  for (const m of html.matchAll(
    /"hiRes"\s*:\s*"(https:\/\/[^"]+?media-amazon\.com\/images\/I\/[^"]+)"/g,
  )) {
    push(m[1], 3);
  }
  for (const m of html.matchAll(
    /"large"\s*:\s*"(https:\/\/[^"]+?media-amazon\.com\/images\/I\/[^"]+)"/g,
  )) {
    push(m[1], 2);
  }
  for (const m of html.matchAll(
    /data-old-hires="(https:\/\/[^"]+?media-amazon\.com\/images\/I\/[^"]+)"/g,
  )) {
    push(m[1], 3);
  }
  for (const m of html.matchAll(
    /https:\/\/[a-z0-9.-]*media-amazon\.com\/images\/I\/[A-Za-z0-9+,_%-]+\._AC_SL\d+_\.jpg/gi,
  )) {
    push(m[0], 2);
  }

  ranked.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const out = [];
  for (const { url } of ranked) {
    // Prefer largest SL variant when available.
    const upgraded = url.replace(/\._AC_[^.]+\./, "._AC_SL1500_.");
    const key = amazonImageKey(upgraded);
    if (seen.has(key)) continue;
    // Skip tiny sprites / UI icons.
    if (/_SS\d+_|\._SX\d+_|\._SY\d+_|\._US\d+_/.test(url) && !/_SL\d+_/.test(url)) {
      continue;
    }
    seen.add(key);
    out.push(upgraded);
    if (out.length >= MAX_GALLERY) break;
  }
  return out;
}

async function fetchListingHtml(asin) {
  const urls = [
    `https://www.amazon.com/dp/${asin}?th=1&psc=1`,
    `https://www.amazon.com/gp/product/${asin}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.length > 20000) return html;
    } catch {
      // try next
    }
  }
  return "";
}

async function saveCardImage(imageUrl, fileStem) {
  const res = await fetch(imageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) return null;
  const input = Buffer.from(await res.arrayBuffer());
  await mkdir(toysDir, { recursive: true });
  const fileName = `${fileStem}.jpg`;
  const outPath = path.join(toysDir, fileName);
  await sharp(input)
    .rotate()
    .resize(1200, 1500, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(outPath);
  return `/toys/${fileName}`;
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const targets = catalog.toys.filter((t) => !ORIGINAL_IDS.has(t.id));
  console.log(`Enriching galleries for ${targets.length} imported toys…`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i += 1) {
    const toy = targets[i];
    const asin = parseAsin(toy.affiliateUrl || "");
    if (!asin) {
      failed += 1;
      continue;
    }

    process.stdout.write(`[${i + 1}/${targets.length}] ${toy.id} … `);
    await sleep(500);

    let html = "";
    for (let attempt = 0; attempt < 3 && html.length < 20000; attempt += 1) {
      if (attempt) await sleep(1500);
      html = await fetchListingHtml(asin);
    }

    const remoteUrls = extractListingImages(html);
    if (remoteUrls.length === 0) {
      console.log("no images found");
      failed += 1;
      continue;
    }

    const localPaths = [];
    for (let n = 0; n < remoteUrls.length; n += 1) {
      const stem = n === 0 ? toy.id : `${toy.id}-${n}`;
      try {
        const saved = await saveCardImage(remoteUrls[n], stem);
        if (saved) localPaths.push(saved);
      } catch {
        // skip one bad image
      }
      await sleep(120);
    }

    if (localPaths.length === 0) {
      console.log("download failed");
      failed += 1;
      continue;
    }

    // Keep existing main image first if download of #0 failed differently.
    toy.image = localPaths[0];
    toy.images = localPaths;
    updated += 1;
    console.log(`${localPaths.length} shots`);

    // Persist incrementally.
    await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  }

  console.log(`\nDone. updated=${updated} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
