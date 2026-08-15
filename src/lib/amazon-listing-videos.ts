/**
 * Extract primary product video URLs from Amazon PDP HTML / gallery JSON.
 * Shared (no server-only) so smokes and import code can both use it.
 */

const MAX_VIDEOS = 8;

/** Normalize escaped Amazon URLs from embedded JSON / HTML-encoded blobs. */
export function normalizeAmazonMediaUrl(raw: string): string {
  return raw
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/gi, "&")
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/\\+"/g, "")
    .replace(/[),.;]+$/g, "")
    .trim();
}

function cleanVideoCandidate(raw: string): string {
  let url = normalizeAmazonMediaUrl(raw);
  // videoPreviewAssets packs "url,label,mime,…" — keep the URL only.
  const comma = url.search(/,(?:\d|default|video\/)/i);
  if (comma > 0) url = url.slice(0, comma);
  // Drop closed-caption tracks mistaken for video.
  if (/\.vtt(\?|$)/i.test(url)) return "";
  // Thumbnail JPGs nested under .mp4/ folders are not videos.
  if (/\.(jpe?g|png|gif|webp)(\?|$)/i.test(url)) return "";
  return url;
}

function isVideoSourceUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return true;
  if (/\.m3u8(\?|$)/i.test(url)) return true;
  if (/media-amazon\.com\/images\/S\/vse-vms-transcoding-artifact/i.test(url)) {
    return true;
  }
  if (/productVideoOptimized\.mp4/i.test(url)) return true;
  return false;
}

/**
 * Prefers the main gallery/seller clip (often HLS). Progressive MP4s are
 * kept as fallbacks. Callers store the remote URL and stream it in the player.
 */
export function extractListingVideos(html: string): string[] {
  const ranked: { url: string; score: number }[] = [];
  const push = (raw: string, score: number) => {
    const url = cleanVideoCandidate(raw);
    if (!url || !isVideoSourceUrl(url)) return;
    ranked.push({ url, score });
  };

  // Primary gallery videos array — first clip is the listing's main video.
  const videosBlock = html.match(/"videos"\s*:\s*\[([\s\S]*?)\]\s*,\s*"/);
  if (videosBlock?.[1]) {
    const block = videosBlock[1];
    let index = 0;
    for (const m of block.matchAll(
      /\{\s*"creatorProfile"[\s\S]*?"url"\s*:\s*"(https:\/\/[^"]+)"/gi,
    )) {
      const url = m[1]!;
      const chunk = m[0];
      const hero = /"isHeroVideo"\s*:\s*true/i.test(chunk);
      const seller =
        /"groupType"\s*:\s*"IB_/i.test(chunk) ||
        /seller\.video/i.test(chunk) ||
        /vendor\.video/i.test(chunk);
      const score = hero ? 20 : seller ? 18 : 14 - Math.min(index, 5);
      push(url, score);
      index += 1;
    }
    for (const m of block.matchAll(/"url"\s*:\s*"(https:\/\/[^"]+)"/gi)) {
      push(m[1]!, 12);
    }
  }

  for (const m of html.matchAll(
    /https:\/\/[a-z0-9.-]*media-amazon\.com\/images\/S\/al-[^\s"'<>]+\/productVideoOptimized\.mp4/gi,
  )) {
    push(m[0]!, 8);
  }

  for (const m of html.matchAll(
    /https:\/\/[a-z0-9.-]*media-amazon\.com\/images\/S\/vse-vms-transcoding-artifact[^"'\\\s]*videopreview\.jobtemplate\.mp4\.default\.mp4/gi,
  )) {
    push(m[0]!, 5);
  }

  for (const m of html.matchAll(
    /"(?:videoUrl|videoURL|mainUrl|downloadUrl)"\s*:\s*"(https:\\\/\\\/[^"]+|https:\/\/[^"]+)"/gi,
  )) {
    push(m[1]!, 10);
  }
  for (const m of html.matchAll(
    /"url"\s*:\s*"(https:\\\/\\\/[^"]+?\.(?:mp4|webm|m3u8)[^"]*)"/gi,
  )) {
    push(m[1]!, 9);
  }
  for (const m of html.matchAll(
    /"url"\s*:\s*"(https:\/\/[^"]+?\.(?:mp4|webm|m3u8)[^"]*)"/gi,
  )) {
    push(m[1]!, 9);
  }

  for (const m of html.matchAll(
    /https:\/\/[^\s"'<>]+?\.(?:mp4|webm|m3u8)(?:\?[^\s"'<>]*)?/gi,
  )) {
    push(m[0]!, 3);
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
