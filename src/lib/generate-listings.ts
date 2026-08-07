import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { buildAffiliateUrl, parseAsin } from "@/lib/amazon-import";
import { getCatalogToys } from "@/lib/catalog-store";
import { addDraftToys, getDraftToys } from "@/lib/draft-store";
import type { DraftToy } from "@/types/toy";
import { slugify } from "@/lib/slugify";
import {
  buildSearchQueries,
  normalizeGenerateOptions,
  resolveAgePreset,
  type GenerateListingsOptions,
} from "@/lib/generate-options";
import {
  categoryColor,
  inferToyMeta,
  kidBlurb,
  shortCardName,
} from "@/lib/toy-card-style";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MAX_GALLERY = 6;
const TARGET_LONG = 1500;

/**
 * Extra candidate ASINs if search returns few hits.
 * Duplicates already in the live catalog/drafts are skipped automatically.
 */
const FALLBACK_ASINS = [
  "B00005LBVS", // Crayola crayons
  "B00JHDC0K6", // Kinetic Sand
  "B07YNLXJ4L", // Magna-Tiles classic
  "B08GTYHNDM", // Pop It
  "B07MGNSGV6", // Squishmallows
  "B09JPK6CQR", // Gabby's Dollhouse
  "B08L4WK95H", // Pokemon cards
  "B07PXJLPH7", // Rainbow High
  "B09L5MRR3N", // Polly Pocket
  "B0BSB8J8YB", // Hot Wheels track
  "B09V3KXJYD", // Minecraft figures
  "B07Q6P4QJ6", // ThinkFun game
  "B08THDD69N", // Nerf blaster
  "B07YF9V8TQ", // Barbie dreamhouse accessories
  "B09N3S5Y5K", // Paw Patrol vehicle
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function amazonImageKey(url: string) {
  const m = url.match(/\/images\/I\/([^./]+)/);
  return m?.[1] ?? url;
}

function decodeHtml(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(title: string) {
  return title
    .replace(/^Amazon\.com\s*[:|-]\s*/i, "")
    .replace(/\s*[:|–-]\s*Amazon\.com.*$/i, "")
    .replace(/\s*\|\s*Toys & Games.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickAmazonTitle(html: string) {
  const patterns = [
    /id="productTitle"[^>]*>\s*([^<]+)\s*</i,
    /property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ];
  for (const re of patterns) {
    const match = re.exec(html);
    if (!match?.[1]) continue;
    const title = cleanTitle(decodeHtml(match[1]));
    if (title && !/^amazon\.com$/i.test(title)) return title;
  }
  return "";
}

function metaContent(html: string, key: string, attr: "property" | "name" = "property") {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["']`,
    "i",
  );
  return decodeHtml(re.exec(html)?.[1] ?? re2.exec(html)?.[1] ?? "");
}

function extractListingImages(html: string): string[] {
  const ranked: { url: string; score: number }[] = [];
  const push = (url: string, score: number) => {
    if (!url || !url.includes("media-amazon.com/images/I/")) return;
    ranked.push({ url: url.replace(/\\u002F/g, "/"), score });
  };

  for (const m of html.matchAll(
    /"hiRes"\s*:\s*"(https:\/\/[^"]+?media-amazon\.com\/images\/I\/[^"]+)"/g,
  )) {
    push(m[1]!, 3);
  }
  for (const m of html.matchAll(
    /"large"\s*:\s*"(https:\/\/[^"]+?media-amazon\.com\/images\/I\/[^"]+)"/g,
  )) {
    push(m[1]!, 2);
  }
  for (const m of html.matchAll(
    /data-old-hires="(https:\/\/[^"]+?media-amazon\.com\/images\/I\/[^"]+)"/g,
  )) {
    push(m[1]!, 3);
  }
  for (const m of html.matchAll(
    /https:\/\/[a-z0-9.-]*media-amazon\.com\/images\/I\/[A-Za-z0-9+,_%-]+\._AC_SL\d+_\.jpg/gi,
  )) {
    push(m[0]!, 2);
  }

  ranked.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { url } of ranked) {
    const upgraded = url.replace(/\._AC_[^.]+\./, "._AC_SL1500_.");
    const key = amazonImageKey(upgraded);
    if (seen.has(key)) continue;
    if (/_SS\d+_|\._SX\d+_|\._SY\d+_|\._US\d+_/.test(url) && !/_SL\d+_/.test(url)) {
      continue;
    }
    seen.add(key);
    out.push(upgraded);
    if (out.length >= MAX_GALLERY) break;
  }
  return out;
}

function extractAsins(html: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (asin: string) => {
    const a = asin.toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(a) || seen.has(a)) return;
    seen.add(a);
    out.push(a);
  };
  for (const m of html.matchAll(/data-asin="([A-Z0-9]{10})"/gi)) push(m[1]!);
  for (const m of html.matchAll(/\/dp\/([A-Z0-9]{10})/gi)) push(m[1]!);
  return out;
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!res.ok) return "";
    const html = await res.text();
    return html.length > 5000 ? html : "";
  } catch {
    return "";
  }
}

async function searchAmazonAsins(
  limit: number,
  options: GenerateListingsOptions,
): Promise<string[]> {
  const queries = buildSearchQueries(options);

  const found: string[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    if (found.length >= limit * 3) break;
    const url = `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=toys-and-games`;
    const html = await fetchHtml(url);
    await sleep(400);
    if (!html) continue;
    for (const asin of extractAsins(html)) {
      if (seen.has(asin)) continue;
      seen.add(asin);
      found.push(asin);
    }
  }
  return found;
}

async function saveFilledProductJpeg(
  input: Buffer,
  outPath: string,
): Promise<void> {
  const sharp = (await import("sharp")).default;
  const flattened = await sharp(input)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  let trimmed: Buffer;
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
  const scale = TARGET_LONG / Math.max(w, h);

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

async function downloadGallery(
  imageUrls: string[],
  stem: string,
): Promise<string[]> {
  const dir = path.join(process.cwd(), "public", "toys");
  await mkdir(dir, { recursive: true });
  const saved: string[] = [];

  for (let i = 0; i < imageUrls.length; i += 1) {
    const url = imageUrls[i]!;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const input = Buffer.from(await res.arrayBuffer());
      const fileStem = i === 0 ? stem : `${stem}-${i}`;
      const fileName = `${fileStem}.jpg`;
      const outPath = path.join(dir, fileName);
      try {
        await saveFilledProductJpeg(input, outPath);
      } catch {
        await writeFile(outPath, input);
      }
      saved.push(`/toys/${fileName}`);
    } catch {
      // skip bad image
    }
  }
  return saved;
}

async function buildDraftFromAsin(
  asin: string,
  usedIds: Set<string>,
  options: GenerateListingsOptions,
): Promise<DraftToy | null> {
  const html =
    (await fetchHtml(`https://www.amazon.com/dp/${asin}?th=1&psc=1`)) ||
    (await fetchHtml(`https://www.amazon.com/gp/product/${asin}`));
  if (!html) return null;

  const sourceTitle = pickAmazonTitle(html);
  if (!sourceTitle) return null;

  const ogDesc =
    metaContent(html, "og:description") ||
    metaContent(html, "description", "name");
  const imageUrls = extractListingImages(html);
  if (imageUrls.length === 0) return null;

  const name = shortCardName(sourceTitle);
  const blurb = kidBlurb(sourceTitle, ogDesc);
  const inferred = inferToyMeta(sourceTitle, `${ogDesc} age`);
  const ageTarget = resolveAgePreset(options.agePreset);

  const category =
    options.category === "any" ? inferred.category : options.category;
  const audience =
    options.audience === "any"
      ? inferred.audience
      : options.audience === "all"
        ? "all"
        : options.audience;

  // Prefer admin age targeting; keep a sensible range width from inference when "all".
  let ageMin = ageTarget.min;
  let ageMax = ageTarget.max;
  if (options.agePreset === "all") {
    ageMin = Math.max(3, Math.min(inferred.ageMin, 13));
    ageMax = Math.max(ageMin, Math.min(inferred.ageMax, 13));
  } else if (ageMin === ageMax) {
    ageMin = Math.max(0, ageTarget.min - 1);
    ageMax = Math.min(13, ageTarget.max + 2);
  }

  let id = slugify(name) || `toy-${asin.toLowerCase()}`;
  if (usedIds.has(id)) id = `${id}-${asin.slice(-4).toLowerCase()}`;
  usedIds.add(id);

  const images = await downloadGallery(imageUrls, id);
  if (images.length === 0) return null;

  return {
    id,
    name,
    blurb,
    category,
    audience,
    ageMin,
    ageMax,
    image: images[0]!,
    images,
    imageAlt: `${name} toy`,
    affiliateUrl: buildAffiliateUrl(asin),
    color: categoryColor(category),
    asin,
    createdAt: new Date().toISOString(),
    sourceTitle,
  };
}

export type GenerateListingsResult = {
  generated: DraftToy[];
  attempted: number;
  skippedExisting: number;
  failed: number;
  searchHits: number;
};

export type GenerateProgressEvent =
  | { type: "stage"; stage: "search" | "import" | "save"; message: string; current: number; total: number }
  | { type: "item"; current: number; total: number; name: string; ok: boolean }
  | { type: "done"; result: GenerateListingsResult }
  | { type: "error"; error: string };

export type GenerateProgressHandler = (event: GenerateProgressEvent) => void;

export async function generateDraftListings(
  optionsInput: Partial<GenerateListingsOptions> | number = 10,
  onProgress?: GenerateProgressHandler,
): Promise<GenerateListingsResult> {
  const options =
    typeof optionsInput === "number"
      ? normalizeGenerateOptions({ count: optionsInput })
      : normalizeGenerateOptions(optionsInput);
  const count = options.count;

  const emit = (event: GenerateProgressEvent) => {
    try {
      onProgress?.(event);
    } catch {
      // ignore UI callback errors
    }
  };

  const age = resolveAgePreset(options.agePreset);
  emit({
    type: "stage",
    stage: "search",
    message: `Searching Amazon (${age.label})…`,
    current: 0,
    total: count,
  });

  const [live, drafts] = await Promise.all([getCatalogToys(), getDraftToys()]);
  const existingAsins = new Set<string>();
  const usedIds = new Set<string>();

  for (const toy of [...live, ...drafts]) {
    usedIds.add(toy.id);
    const asin = parseAsin(toy.affiliateUrl) || (toy as DraftToy).asin;
    if (asin) existingAsins.add(asin.toUpperCase());
  }

  const searched = await searchAmazonAsins(count * 4, options);
  const searchHits = searched.length;
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const asin of [...searched, ...FALLBACK_ASINS]) {
    const a = asin.toUpperCase();
    if (existingAsins.has(a) || seen.has(a)) continue;
    seen.add(a);
    candidates.push(a);
  }

  emit({
    type: "stage",
    stage: "import",
    message: `Importing listings (0/${count})…`,
    current: 0,
    total: count,
  });

  const generated: DraftToy[] = [];
  let failed = 0;
  const skippedExisting = existingAsins.size;

  for (const asin of candidates) {
    if (generated.length >= count) break;
    await sleep(450);
    try {
      const draft = await buildDraftFromAsin(asin, usedIds, options);
      if (!draft) {
        failed += 1;
        emit({
          type: "item",
          current: generated.length,
          total: count,
          name: asin,
          ok: false,
        });
        continue;
      }
      generated.push(draft);
      existingAsins.add(asin);
      emit({
        type: "item",
        current: generated.length,
        total: count,
        name: draft.name,
        ok: true,
      });
      emit({
        type: "stage",
        stage: "import",
        message: `Imported ${draft.name} (${generated.length}/${count})`,
        current: generated.length,
        total: count,
      });
    } catch {
      failed += 1;
      emit({
        type: "item",
        current: generated.length,
        total: count,
        name: asin,
        ok: false,
      });
    }
  }

  if (generated.length > 0) {
    emit({
      type: "stage",
      stage: "save",
      message: "Saving drafts for review…",
      current: generated.length,
      total: count,
    });
    await addDraftToys(generated);
  }

  const result: GenerateListingsResult = {
    generated,
    attempted: Math.min(candidates.length, count + failed),
    skippedExisting,
    failed,
    searchHits,
  };

  emit({ type: "done", result });
  return result;
}
