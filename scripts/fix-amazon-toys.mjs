/**
 * Re-scrape titles/images for catalog toys whose affiliate URLs are Amazon ASINs
 * and whose image is still a category placeholder (or name still has Amazon.com).
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalogPath = path.join(root, "data", "catalog.json");
const toysDir = path.join(root, "public", "toys");

function parseAsin(url) {
  try {
    const parsed = new URL(url.trim());
    const m = parsed.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return m?.[1]?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function cleanTitle(title) {
  return title
    .replace(/^Amazon\.com\s*[:|-]\s*/i, "")
    .replace(/\s*[:\|–-]\s*Amazon\.com.*$/i, "")
    .replace(/\s*\|\s*Toys & Games.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function conciseBlurb(text, maxWords = 8) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}.`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickImage(html) {
  const patterns = [
    /"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /"landingImageUrl"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /data-old-hires="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /id="landingImage"[^>]+src="(https:\/\/[^"]+)"/,
    /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /content=["'](https:\/\/[^"']+)["'][^>]+property=["']og:image["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].replace(/\\u002F/g, "/");
  }
  return "";
}

function pickTitle(html) {
  const patterns = [
    /property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
    /id="productTitle"[^>]*>\s*([^<]+)\s*</i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return cleanTitle(m[1]);
  }
  return "";
}

function pickDesc(html) {
  const patterns = [
    /property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    /name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+name=["']description["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return conciseBlurb(m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"'));
  }
  return "";
}

async function downloadImage(imageUrl, slug) {
  if (!imageUrl) return null;
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const bytes = Buffer.from(await res.arrayBuffer());
    await mkdir(toysDir, { recursive: true });
    const fileName = `${slug}.${ext}`;
    await writeFile(path.join(toysDir, fileName), bytes);
    return `/toys/${fileName}`;
  } catch {
    return null;
  }
}

async function scrape(asin) {
  const url = `https://www.amazon.com/dp/${asin}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return {
    name: pickTitle(html),
    blurb: pickDesc(html),
    imageUrl: pickImage(html),
  };
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  let fixed = 0;

  for (let i = 0; i < catalog.toys.length; i += 1) {
    const toy = catalog.toys[i];
    const asin = parseAsin(toy.affiliateUrl || "");
    if (!asin) continue;

    const needsFix =
      /^amazon\.com/i.test(toy.name) ||
      toy.id.startsWith("amazon-com-") ||
      toy.image.includes("/categories/");
    if (!needsFix) continue;

    process.stdout.write(`fix ${asin} (${toy.id}) ... `);
    try {
      const scraped = await scrape(asin);
      const name = scraped.name || cleanTitle(toy.name);
      const blurb = scraped.blurb || toy.blurb;
      const newSlugBase = slugify(name) || `asin-${asin.toLowerCase()}`;
      // Keep id stable if already non-amazon; otherwise rewrite id.
      let nextId = toy.id;
      if (toy.id.startsWith("amazon-com-")) {
        const candidate = newSlugBase;
        const taken = catalog.toys.some((t, idx) => idx !== i && t.id === candidate);
        nextId = taken ? `${candidate}-${asin.toLowerCase().slice(-4)}` : candidate;
      }

      const localImage =
        (await downloadImage(
          scraped.imageUrl,
          `${nextId}-${asin.toLowerCase()}`,
        )) || toy.image;

      catalog.toys[i] = {
        ...toy,
        id: nextId,
        name: name.slice(0, 80),
        blurb: blurb || toy.blurb,
        image: localImage,
        imageAlt: name.slice(0, 120),
      };
      fixed += 1;
      console.log(`ok → ${catalog.toys[i].id} img=${localImage.startsWith("/toys/")}`);
      await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
    } catch (err) {
      console.log(`fail ${err.message}`);
    }
    await sleep(400);
  }

  console.log(`\nFixed ${fixed} toys. total=${catalog.toys.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
