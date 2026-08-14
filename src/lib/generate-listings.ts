import "server-only";
import { buildAffiliateUrl, parseAsin } from "@/lib/amazon-import";
import { getCatalogToys } from "@/lib/catalog-store";
import { addDraftToys, getDraftToys } from "@/lib/draft-store";
import type { Audience, CategoryId, DraftToy } from "@/types/toy";
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
import { downloadAndStoreGallery } from "@/lib/toy-image-store";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MAX_GALLERY = 6;

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

const MAX_VIDEOS = 4;

/** Normalize escaped Amazon URLs from embedded JSON blobs. */
function normalizeAmazonMediaUrl(raw: string): string {
  return raw
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .trim();
}

function isPlayableVideoUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  // Prefer progressive MP4/WebM for the in-app player (skip HLS playlists).
  if (/\.m3u8(\?|$)/i.test(url)) return false;
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return true;
  // Amazon VSE / immersion clips often omit an extension but still stream as mp4.
  if (/media-amazon\.com\/images\/S\/vse-/i.test(url)) return true;
  if (/vse-vms-transcoding-artifact/i.test(url)) return true;
  return false;
}

/**
 * Pull product video URLs from Amazon PDP HTML / embedded gallery JSON.
 * These sit alongside image gallery data when a listing has video content.
 */
export function extractListingVideos(html: string): string[] {
  const ranked: { url: string; score: number }[] = [];
  const push = (raw: string, score: number) => {
    const url = normalizeAmazonMediaUrl(raw);
    if (!isPlayableVideoUrl(url)) return;
    ranked.push({ url, score });
  };

  // Structured video objects in colorImages / immersion / hipVideos blobs.
  for (const m of html.matchAll(
    /"url"\s*:\s*"(https:\\\/\\\/[^"]+?\.(?:mp4|webm)[^"]*)"/gi,
  )) {
    push(m[1]!, 4);
  }
  for (const m of html.matchAll(
    /"url"\s*:\s*"(https:\/\/[^"]+?\.(?:mp4|webm)[^"]*)"/gi,
  )) {
    push(m[1]!, 4);
  }
  for (const m of html.matchAll(
    /"(?:videoUrl|videoURL|mainUrl|downloadUrl)"\s*:\s*"(https:\\\/\\\/[^"]+|https:\/\/[^"]+)"/gi,
  )) {
    push(m[1]!, 5);
  }
  for (const m of html.matchAll(
    /data-(?:video-url|videoUrl)=["'](https:\/\/[^"']+)["']/gi,
  )) {
    push(m[1]!, 4);
  }
  // Amazon VSE artifact URLs (often no .mp4 suffix in the path).
  for (const m of html.matchAll(
    /https:\\\/\\\/[a-z0-9.-]*media-amazon\.com\\\/images\\\/S\\\/vse-[^"\\]+/gi,
  )) {
    push(m[0]!, 3);
  }
  for (const m of html.matchAll(
    /https:\/\/[a-z0-9.-]*media-amazon\.com\/images\/S\/vse-[^\s"'<>]+/gi,
  )) {
    push(m[0]!.replace(/[),.;]+$/g, ""), 3);
  }
  // Bare mp4/webm links anywhere in the markup.
  for (const m of html.matchAll(
    /https:\/\/[^\s"'<>]+?\.(?:mp4|webm)(?:\?[^\s"'<>]*)?/gi,
  )) {
    push(m[0]!, 2);
  }

  ranked.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { url } of ranked) {
    const key = url.split("?")[0]!.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
    if (out.length >= MAX_VIDEOS) break;
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
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Cache-Control": "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Soft-block / captcha pages are usually short or missing product markup.
    if (html.length < 5000) return "";
    if (/api-services-support@amazon\.com|Enter the characters you see/i.test(html)) {
      return "";
    }
    return html;
  } catch {
    return "";
  }
}

async function downloadGallery(
  imageUrls: string[],
  stem: string,
): Promise<string[]> {
  return downloadAndStoreGallery(imageUrls, stem, UA);
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

/** Live-catalog Amazon product ids only — drafts/names/images are not duplicates. */
function liveAsinSet(
  live: Array<{ affiliateUrl: string }>,
): Set<string> {
  const asins = new Set<string>();
  for (const toy of live) {
    const asin = parseAsin(toy.affiliateUrl);
    if (asin) asins.add(asin.toUpperCase());
  }
  return asins;
}

export type ListingEnrichFields = {
  name: string;
  blurb: string;
  category: CategoryId;
  audience: Audience;
  ageMin: number;
  ageMax: number;
};

export type BuildDraftFromAsinOptions = {
  /** Optional AI / custom enricher for card fields (used by bulk Grok add). */
  enrich?: (input: {
    sourceTitle: string;
    description: string;
  }) => Promise<ListingEnrichFields | null>;
};

export async function buildDraftFromAsin(
  asin: string,
  usedIds: Set<string>,
  options: GenerateListingsOptions,
  buildOptions?: BuildDraftFromAsinOptions,
): Promise<DraftToy | null> {
  const html =
    (await fetchHtml(`https://www.amazon.com/dp/${asin}?th=1&psc=1`)) ||
    (await fetchHtml(`https://www.amazon.com/gp/product/${asin}`)) ||
    (await fetchHtml(`https://www.amazon.com/dp/${asin}`));
  if (!html) return null;

  const sourceTitle = pickAmazonTitle(html);
  if (!sourceTitle) return null;

  const ogDesc =
    metaContent(html, "og:description") ||
    metaContent(html, "description", "name");
  const imageUrls = extractListingImages(html);
  if (imageUrls.length === 0) return null;
  const videoUrls = extractListingVideos(html);

  const enriched = buildOptions?.enrich
    ? await buildOptions.enrich({
        sourceTitle,
        description: ogDesc,
      })
    : null;

  const inferred = inferToyMeta(sourceTitle, `${ogDesc} age`);
  const ageTarget = resolveAgePreset(options.agePreset);

  const name = enriched?.name || shortCardName(sourceTitle);
  const blurb = enriched?.blurb || kidBlurb(sourceTitle, ogDesc);
  const category =
    enriched?.category ??
    (options.category === "any" ? inferred.category : options.category);
  const audience =
    enriched?.audience ??
    (options.audience === "any"
      ? inferred.audience
      : options.audience === "all"
        ? "all"
        : options.audience);

  // Prefer admin age targeting; keep a sensible range width from inference when "all".
  let ageMin = ageTarget.min;
  let ageMax = ageTarget.max;
  if (enriched) {
    ageMin = enriched.ageMin;
    ageMax = enriched.ageMax;
  } else if (options.agePreset === "all") {
    ageMin = Math.max(3, Math.min(inferred.ageMin, 13));
    ageMax = Math.max(ageMin, Math.min(inferred.ageMax, 13));
  } else if (ageMin === ageMax) {
    ageMin = Math.max(0, ageTarget.min - 1);
    ageMax = Math.min(13, ageTarget.max + 2);
  }

  let id = slugify(name) || `toy-${asin.toLowerCase()}`;
  // Prefer stable unique ids; never reuse an existing catalog/draft id.
  if (usedIds.has(id)) id = `${id}-${asin.slice(-4).toLowerCase()}`;
  if (usedIds.has(id)) return null;
  usedIds.add(id);

  // Prefer Blob/local persistence; keep remote Amazon URLs if storage is unavailable.
  const images = await downloadGallery(imageUrls, id);
  const gallery = images.length > 0 ? images : imageUrls;
  if (gallery.length === 0) return null;

  return {
    id,
    name,
    blurb,
    category,
    audience,
    ageMin,
    ageMax,
    image: gallery[0]!,
    images: gallery,
    ...(videoUrls.length > 0 ? { videos: videoUrls } : {}),
    imageAlt: `${name} toy`,
    affiliateUrl: buildAffiliateUrl(asin),
    color: categoryColor(category),
    featuredTier: 0,
    featured: false,
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
  // Only skip Amazon URLs/ASINs that already exist on the live shop.
  const liveAsins = liveAsinSet(live);
  const usedIds = new Set<string>([
    ...live.map((t) => t.id),
    ...drafts.map((t) => t.id),
  ]);
  const batchAsins = new Set<string>();

  const searched = await searchAmazonAsins(count * 4, options);
  const searchHits = searched.length;
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const asin of [...searched, ...FALLBACK_ASINS]) {
    const a = asin.toUpperCase();
    if (liveAsins.has(a) || seen.has(a)) continue;
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
  let skippedExisting = 0;

  for (const asin of candidates) {
    if (generated.length >= count) break;
    const a = asin.toUpperCase();
    if (liveAsins.has(a) || batchAsins.has(a)) {
      skippedExisting += 1;
      continue;
    }
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

      const draftAsin = (draft.asin || parseAsin(draft.affiliateUrl) || a).toUpperCase();
      if (liveAsins.has(draftAsin)) {
        skippedExisting += 1;
        emit({
          type: "stage",
          stage: "import",
          message: `Skipped live URL match (${draftAsin})`,
          current: generated.length,
          total: count,
        });
        continue;
      }

      generated.push(draft);
      batchAsins.add(draftAsin);
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
