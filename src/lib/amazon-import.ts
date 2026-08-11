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

function cleanTitle(title: string) {
  return title
    .replace(/^Amazon\.com\s*[:|-]\s*/i, "")
    .replace(/\s*[:\|–-]\s*Amazon\.com.*$/i, "")
    .replace(/\s*\|\s*Toys & Games.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickAmazonImage(html: string) {
  const patterns = [
    /"hiRes"\s*:\s*"(https:\/\/[^"]+?media-amazon\.com\/images\/I\/[^"]+)"/,
    /"landingImageUrl"\s*:\s*"(https:\/\/[^"]+?media-amazon\.com\/images\/I\/[^"]+)"/,
    /data-old-hires="(https:\/\/[^"]+)"/,
    /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /content=["'](https:\/\/[^"']+)["'][^>]+property=["']og:image["']/i,
  ];
  for (const re of patterns) {
    const match = re.exec(html);
    if (match?.[1]) return match[1].replace(/\\u002F/g, "/");
  }
  return "";
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

function conciseBlurb(text: string, maxWords = 8) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}.`;
}

export type AmazonImportPreview = {
  asin: string;
  affiliateUrl: string;
  name: string;
  blurb: string;
  image: string;
  imageAlt: string;
  imageUrl?: string;
  manualFieldsRequired: boolean;
};

export async function previewAmazonImport(url: string): Promise<AmazonImportPreview> {
  const asin = parseAsin(url);
  if (!asin) {
    throw new Error("Could not find an Amazon ASIN in that link");
  }

  const affiliateUrl = buildAffiliateUrl(asin);
  let name = `Toy ${asin}`;
  let blurb = "A fun pick from Amazon.";
  let imageUrl = "";
  let manualFieldsRequired = true;

  try {
    const res = await fetch(affiliateUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const html = await res.text();
      const scrapedTitle = pickAmazonTitle(html);
      const ogDesc =
        metaContent(html, "og:description") ||
        metaContent(html, "description", "name");
      const scrapedImage = pickAmazonImage(html);

      if (scrapedTitle) name = scrapedTitle;
      if (ogDesc) blurb = conciseBlurb(ogDesc);
      if (scrapedImage) {
        imageUrl = scrapedImage;
        manualFieldsRequired = false;
      }
    }
  } catch {
    manualFieldsRequired = true;
  }

  return {
    asin,
    affiliateUrl,
    name,
    blurb,
    image: imageUrl || "/categories/plush.svg",
    imageAlt: name,
    imageUrl: imageUrl || undefined,
    manualFieldsRequired,
  };
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
