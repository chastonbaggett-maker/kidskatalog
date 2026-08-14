/**
 * Re-frame imported Amazon product shots to match seed toys:
 * product fills the bitmap edge-to-edge (no baked-in 4:5 letterbox).
 * Feed/gallery CSS already uses background-size: contain + padding.
 */
import { readFile, writeFile, readdir } from "fs/promises";
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

const TARGET_LONG = 1500;

/** Shared: trim white margins, scale longest side, no letterbox. */
export async function saveFilledProductJpeg(input, outPath) {
  const flattened = await sharp(input)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  let trimmed;
  try {
    trimmed = await sharp(flattened)
      .trim({
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        threshold: 12,
      })
      .toBuffer();
  } catch {
    trimmed = flattened;
  }

  const meta = await sharp(trimmed).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const longest = Math.max(w, h);
  const scale = TARGET_LONG / longest;

  await sharp(trimmed)
    .resize({
      width: Math.max(1, Math.round(w * scale)),
      height: Math.max(1, Math.round(h * scale)),
      fit: "fill",
      kernel: "lanczos3",
    })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toFile(outPath);
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const importedIds = new Set(
    catalog.toys.filter((t) => !ORIGINAL_IDS.has(t.id)).map((t) => t.id),
  );

  const files = (await readdir(toysDir)).filter((f) => f.endsWith(".jpg"));
  const targets = files.filter((f) => {
    const stem = f.replace(/\.jpg$/, "");
    const base = stem.replace(/-\d+$/, "");
    return importedIds.has(base);
  });

  console.log(`Refitting ${targets.length} imported images…`);
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < targets.length; i += 1) {
    const file = targets[i];
    const full = path.join(toysDir, file);
    process.stdout.write(`[${i + 1}/${targets.length}] ${file} … `);
    try {
      const input = await readFile(full);
      await saveFilledProductJpeg(input, full);
      ok += 1;
      console.log("ok");
    } catch (err) {
      fail += 1;
      console.log("FAIL", err?.message || err);
    }
  }

  console.log(`Done. ok=${ok} fail=${fail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
