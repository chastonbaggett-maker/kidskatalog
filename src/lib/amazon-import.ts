const AFFILIATE_TAG = process.env.NEXT_PUBLIC_AFFILIATE_TAG || "kidskatalog-20";

export function parseAsin(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;

  // Bare ASIN pasted into a field or bulk list.
  if (/^[A-Z0-9]{10}$/i.test(raw)) return raw.toUpperCase();

  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.includes("amazon.")) return null;

    const dpMatch = parsed.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (dpMatch?.[1]) return dpMatch[1].toUpperCase();

    const asinParam = parsed.searchParams.get("asin");
    if (asinParam && /^[A-Z0-9]{10}$/i.test(asinParam)) {
      return asinParam.toUpperCase();
    }
  } catch {
    // Fall through — maybe an ASIN embedded in loose text.
  }

  const embedded = raw.match(/(?:\/(?:dp|gp\/product)\/|asin=)([A-Z0-9]{10})/i);
  if (embedded?.[1]) return embedded[1].toUpperCase();

  return null;
}

/** Split pasted bulk text into unique ASINs (max 100). */
export function parseBulkAmazonInputs(text: string): {
  asins: string[];
  invalid: string[];
  truncated: boolean;
} {
  const tokens = text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const asins: string[] = [];
  const seen = new Set<string>();
  const invalid: string[] = [];
  let truncated = false;

  for (const token of tokens) {
    const asin = parseAsin(token);
    if (!asin) {
      invalid.push(token.slice(0, 80));
      continue;
    }
    if (seen.has(asin)) continue;
    if (asins.length >= 100) {
      truncated = true;
      break;
    }
    seen.add(asin);
    asins.push(asin);
  }

  return { asins, invalid, truncated };
}

export function buildAffiliateUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

export async function downloadToyImage(imageUrl: string, slug: string): Promise<string> {
  const res = await fetch(imageUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not download product image");

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const bytes = Buffer.from(await res.arrayBuffer());

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`kidskatalog/toys/${slug}.${ext}`, bytes, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  }

  const { writeFile, mkdir } = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), "public", "toys");
  await mkdir(dir, { recursive: true });
  const fileName = `${slug}.${ext}`;
  await writeFile(path.join(dir, fileName), bytes);
  return `/toys/${fileName}`;
}

