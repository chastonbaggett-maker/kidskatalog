/**
 * Bulk-import Amazon product URLs into data/catalog.json.
 * Usage: node scripts/import-amazon-toys.mjs [links.txt]
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalogPath = path.join(root, "data", "catalog.json");
const toysDir = path.join(root, "public", "toys");
const AFFILIATE_TAG = process.env.NEXT_PUBLIC_AFFILIATE_TAG || "kidskatalog-20";

const CATEGORY_COLORS = {
  dinos: "#4A90E2",
  plush: "#F5A9C5",
  cars: "#5BA3F0",
  blocks: "#B19CD9",
  outside: "#6CB6FF",
  games: "#9B7FD1",
  stem: "#7B6DFF",
  pretend: "#EF8FB3",
};

const DEFAULT_LINKS = `
https://www.amazon.com/Crayola-Colored-Pencil-Supplies-Assorted/dp/B00006RVTS
https://www.amazon.com/Crayola-58-7812-N-A/dp/B003HGGPLW
https://www.amazon.com/Crayola-Erasable-Non-Toxic-Pre-Sharpened-Gradation/dp/B000PCWKBA
https://www.amazon.com/Play-Doh-Modeling-Compound-Non-Toxic-Exclusive/dp/B00JM5GW10
https://www.amazon.com/Play-Doh-Christmas-Stocking-Stuffers-Preschool/dp/B07BC44JFC
https://www.amazon.com/Schylling-NeeDoh-Nice-Ice-Baby/dp/B0D9ZTW7PS
https://www.amazon.com/Squishy-Squishies-Treasure-Classroom-Birthday/dp/B0DG2VRFV7
https://www.amazon.com/Scotch-Pointed-Scissors-Inches-1442P/dp/B004TQ0O3Y
https://www.amazon.com/Play-Doh-Modeling-Compound-Non-Toxic-Exclusive/dp/B00JM5GZGW
https://www.amazon.com/Disney-Lightyear-Interactive-Talking-Action/dp/B07PQFT83F
https://www.amazon.com/CUPKIN-Animal-Habitats-Around-Activity/dp/B098PMWSVS
https://www.amazon.com/Play-Doh-Non-Toxic-Modeling-Classroom-Exclusive/dp/B087N9N6HH
https://www.amazon.com/SEREED-Balance-Toddler-Wheels-Birthday/dp/B08SGH7NKX
https://www.amazon.com/Mattel-Games-Collectible-Families-Exclusive/dp/B07P6MZPK3
https://www.amazon.com/LeapFrog-Learning-Friends-Words-Green/dp/B07B6ZN7P8
https://www.amazon.com/Infinno-Rattles-Finder-Newborn-Infants/dp/B0B21ZM7LJ
https://www.amazon.com/Montessori-Sensory-Teething-Learning-Developmental/dp/B0CD42KQ3K
https://www.amazon.com/Bright-Starts-Oball-Easy-Grasp-Classic-Ball-BPA-Free-Age-Newborn/dp/B00ZRD99C0
https://www.amazon.com/Teething-Silicone-Dropping-Teethers-Sucking/dp/B0C6DLN75N
https://www.amazon.com/Suction-Spinner-Spinning-sensory-toddlers/dp/B08X1YQ2N9
https://www.amazon.com/Sassy-Stacks-Circles-Stacking-Learning/dp/B07NXDJ52C
https://www.amazon.com/Chuya-Teether-Control-Teething-Infants/dp/B0BYNDL3SW
https://www.amazon.com/Oball-81107-Kids-Shaker-Toy/dp/B008J1QP7Y
https://www.amazon.com/Baby-Einstein-Along-Tunes-Musical/dp/B000YDDF6O
https://www.amazon.com/Fisher-Price-FFC84-Babys-First-Blocks/dp/B01NCUSC7V
https://www.amazon.com/LEGO-Classic-Large-Creative-Brick/dp/B00NHQF6MG
https://www.amazon.com/MAGNA-TILES-microMAGS-26-Piece-Magnetic-Construction/dp/B0CX4RLCXW
https://www.amazon.com/LEGO-Botanicals-Daisies-Building-Toy/dp/B0FMS7CRHX
https://www.amazon.com/LEGO-6540424-TBD-Creator-31173/dp/B0DRW5YM7M
https://www.amazon.com/Magnetic-Building-Stacking-Montessori-Toys/dp/B0CHJTD1FS
https://www.amazon.com/LEGO-Creator-Helicopter-Transforms-Propeller/dp/B0CGY4J7QT
https://www.amazon.com/LEGO-6588546-TBD-Botanicals-11506/dp/B0G2SZQS1C
https://www.amazon.com/LEGO-Champions-Machine-Future-Building/dp/B0FMS84RFJ
https://www.amazon.com/LEGO-Botanicals-Happy-Plants-Building/dp/B0DRW6C2RF
https://www.amazon.com/LEGO-Classic-Storage-Educational-Toddlers/dp/B07WJJF8PB
https://www.amazon.com/LEGO-Classic-Medium-Creative-Brick/dp/B00NHQFA1I
https://www.amazon.com/LEGO-Creator-Hamster-Flower-Building/dp/B0FMS891HB
https://www.amazon.com/Goliath-Jelly-Blox-Creative-Kit/dp/B0CP4BSFB9
https://www.amazon.com/Melissa-Doug-Wooden-Building-Blocks/dp/B000068CKY
https://www.amazon.com/Taco-Cat-Goat-Cheese-Pizza/dp/B077Z1R28P
https://www.amazon.com/Crayola-58-7726-Classic-Markers-Assorted/dp/B011POF36K
https://www.amazon.com/Skillmatics-Aqua-Puffs-Mess-Free-Valentines/dp/B0F9WHCL19
https://www.amazon.com/Party-Favors-150-Pack-Treasure-Classroom/dp/B0F8LLT3JR
https://www.amazon.com/Aurora-Mini-Flopsie-Ginger-Cat/dp/B083FM3R87
https://www.amazon.com/Crayola-Twistables-Colored-Exclusive-Stocking/dp/B07D4RN9NH
https://www.amazon.com/Schylling-NeeDoh-Gumdrop-Collectible-Assorted/dp/B0C6XBP4CW
https://www.amazon.com/Cra-Z-art-Washable-Watercolors-Colors-10651/dp/B003U9CCP4
https://www.amazon.com/John-Deere-Bubble-N-Go-Mower-Entertainment/dp/B0BXF8W8BM
https://www.amazon.com/YLL-Karaoke-Machine-Microphones-Christmas/dp/B0CHS2VNHC
https://www.amazon.com/Children-Camcorder-Silicone-Christmas-Birthday/dp/B0B68W6ZMT
https://www.amazon.com/Walkie-Talkies-Toys-Girls-Christmas/dp/B0D8QG23HQ
https://www.amazon.com/Bitzee-Disney-Interactive-Characters-Digital/dp/B0CSJQHF6W
https://www.amazon.com/Paw-Patrol-New-Walkie-Talkies/dp/B012GUL13G
https://www.amazon.com/Toniebox-Starter-Set-Playtime-Puppy/dp/B093TLHGF4
https://www.amazon.com/Inspireyes-Talkies-Rechargeable-Birthday-Camouflage/dp/B0C2Z33RLN
https://www.amazon.com/Robo-Alive-Activated-Batteries-Exclusive/dp/B0B49BS7GH
https://www.amazon.com/SUNLIN-Dance-Mat-Adjustable-Built/dp/B08PF4T8W1
https://www.amazon.com/Yoto-Mini-2024-Make-Wake/dp/B0D541M5C6
https://www.amazon.com/Tonies-Ms-Rachel-Audio-Figurine/dp/B0FB74L24S
https://www.amazon.com/Electronic-Articulated-Figurines-Interactive-Figurine/dp/B0DQ6C171P
https://www.amazon.com/SANJOIN-Talkies-Channels-Flashlight-Adventures/dp/B07RWVTHQH
https://www.amazon.com/Genialba-8-5-Inch-Colorful-Educational-Electronic/dp/B0BJ6M9ZYW
https://www.amazon.com/Little-Live-Pets-Really-Real/dp/B0DQ6GQMCY
https://www.amazon.com/Makolle-Kids-Camera-Toys-Girls/dp/B0C5CW9V7P
https://www.amazon.com/Bright-Starts-Oball-Rattle-Newborn/dp/B0772WYFPP
https://www.amazon.com/Black-White-Baby-Books-Newborn/dp/B0DHH7LGZT
https://www.amazon.com/Grarain-Montessori-Toddler-Sensory-Toddlers/dp/B0D2ZD6J2W
https://www.amazon.com/Silicone-Teethers-Breastmilk-Popsicle-Teething/dp/B0CNVDR9SB
https://www.amazon.com/Hooku-Silicone-Teething-Teethers-Teether/dp/B0CJ5HJB37
https://www.amazon.com/Silicone-Massaging-Bristles-Teething-Pacifier/dp/B0BBWJMHZ6
https://www.amazon.com/HarVow-Switches-Montessori-Toddlers-Activity/dp/B0DZ65RJSP
https://www.amazon.com/Bright-Starts-Lots-of-Links/dp/B001ABZGU2
https://www.amazon.com/Infantino-216-526-3-Pack-Water-Teethers/dp/B07CZTLXG2
https://www.amazon.com/Nuby-Nananubs-Banana-Massaging-Toothbrush/dp/B01LYHTATF
https://www.amazon.com/Itzy-Ritzy-Lovey-Including-Teether/dp/B08SZLRC67
https://www.amazon.com/Nuby-Ice-Gel-Teether-Keys/dp/B003N9M6YI
https://www.amazon.com/Toddler-Bathtub-Water-Christmas-Random/dp/B0D6YSZ8WM
https://www.amazon.com/RaZbaby-RaZ-Berry-Silicone-Teether-Multi-Texture/dp/B000JWSO9I
https://www.amazon.com/LEGO-Amazing-Friends-Motorcycle-Building/dp/B0FMS8VHYM
https://www.amazon.com/Klutz-Lego-Gear-Bots/dp/1338603450
https://www.amazon.com/LEGO-Astronaut-Spaceship-Building-Creative/dp/B0BLJ4FDT4
https://www.amazon.com/LEGO-Monster-Off-Road-Minifigure-Imaginative/dp/B0CGYN1GJ5
https://www.amazon.com/FNJO-Magnetic-110PCS-Building-Construction/dp/B0BLH6WQQ7
https://www.amazon.com/LEGO-Champions-Mercedes-AMG-Minifigures-Convertible/dp/B0CV2HGNY9
https://www.amazon.com/LEGO-6384599-Green-Baseplate/dp/B09JKVKC47
https://www.amazon.com/VIAHART-Interlocking-Educational-Alternative-Childrens/dp/B00N7CD4BK
https://www.amazon.com/LEGO-Creator-in1-Wild-Animals/dp/B0FMS7YJFM
https://www.amazon.com/TOSY-Magnet-Pyramid-Glow-Holographic/dp/B0DMSPF13X
https://www.amazon.com/LEGO-Creator-Animals-Surprising-Spider/dp/B0DJ1BQHQX
https://www.amazon.com/Midou-Dumpling-Squishy-Squishies-Stretchy/dp/B0GH7H2GZF
https://www.amazon.com/Fidget-Octopus-Squishy-Squeeze-Birthday/dp/B0D5CBZWRS
https://www.amazon.com/Rising-Squishy-Anxiety-Stretch-Classroom/dp/B0D3WSCFJJ
https://www.amazon.com/Sensory-Squishy-Textured-Density-Anxiety/dp/B0DQCVY1JC
https://www.amazon.com/VISCOO-Rising-Stress-Adults-Fidget/dp/B0CZ9BRMKJ
https://www.amazon.com/Crayola-Globbles-Squish-Fidget-Toys-6Count/dp/B07HDX46HS
https://www.amazon.com/Shashibo-DODECA-Magnetic-Puzzle-Stress/dp/B07W5QM4DP
https://www.amazon.com/Bunch-Balloons-Tropical-Rapid-Filling-Self-Sealing/dp/B0B459CY9W
https://www.amazon.com/Handheld-Preloaded-Portable-Rechargeable-Electronic/dp/B0DJ5RPZY2
https://www.amazon.com/Portable-Machine-Essentials-Babies-Kids-Putty/dp/B0DT6ZPT5X
https://www.amazon.com/Tub-RescueTM-Vehicles-Water-Activated-Easy-Grip/dp/B0G5WBGTWK
`.trim();

function parseAsin(url) {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.includes("amazon.")) return null;
    const dpMatch = parsed.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (dpMatch?.[1]) return dpMatch[1].toUpperCase();
  } catch {
    return null;
  }
  return null;
}

function buildAffiliateUrl(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html, key, attr = "property") {
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

function cleanTitle(title) {
  return title
    .replace(/\s*[:\|–-]\s*Amazon\.com.*$/i, "")
    .replace(/\s*\|\s*Toys & Games.*$/i, "")
    .trim();
}

function conciseBlurb(text, maxWords = 8) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}.`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function inferMeta(name, urlSlug = "") {
  const t = `${name} ${urlSlug}`.toLowerCase();

  let category = "pretend";
  if (/(dino|dinosaur|rex|t-rex)/.test(t)) category = "dinos";
  else if (/(plush|flopsie|lovey|stuffed|soft toy|ginger cat)/.test(t)) category = "plush";
  else if (
    /(lego|magna|magnetic|building block|brick|baseplate|jelly blox|plus-plus|interlocking|duplo)/.test(
      t,
    )
  ) {
    category = "blocks";
  } else if (
    /(truck|helicopter|train|car |cars|vehicle|mower|motorcycle|mercedes|off-road)/.test(
      t,
    )
  ) {
    category = "cars";
  } else if (
    /(balance bike|outside|bubble|balloon|bathtub|water toy|dance mat)/.test(t)
  ) {
    category = "outside";
  } else if (
    /(uno|taco cat|card game|game|fidget|squishy|needoh|globbles|shashibo|party favor)/.test(
      t,
    )
  ) {
    category = "games";
  } else if (
    /(robot|robo|stem|yoto|tonie|bitzee|walkie|camera|karaoke|electronic|leapfrog|tablet|gear bot)/.test(
      t,
    )
  ) {
    category = "stem";
  } else if (
    /(crayola|play-doh|play doh|craft|sticker|scissors|watercolor|aqua puff|putty|marker|pencil)/.test(
      t,
    )
  ) {
    category = "pretend";
  } else if (/(teether|newborn|infant|baby |oball|rattle|montessori toddler)/.test(t)) {
    category = "pretend";
  }

  let audience = "all";
  if (/\bgirls?\b/.test(t)) audience = "girls";
  else if (/\bboys?\b/.test(t)) audience = "boys";

  let ageMin = 3;
  let ageMax = 10;
  if (/(newborn|infant|teether|0-12|0 months)/.test(t)) {
    ageMin = 0;
    ageMax = 3;
  } else if (/(toddler|duplo|preschool|ages? 1|1-3|12 month)/.test(t)) {
    ageMin = 1;
    ageMax = 5;
  } else if (/(lego classic|creator|botanicals|speed champions|ages? 6|6\+)/.test(t)) {
    ageMin = 6;
    ageMax = 12;
  } else if (/(card game|uno|taco cat)/.test(t)) {
    ageMin = 7;
    ageMax = 13;
  } else if (/(walkie|karaoke|camera|tonie|yoto)/.test(t)) {
    ageMin = 4;
    ageMax = 12;
  }

  return { category, audience, ageMin, ageMax };
}

async function fetchPreview(asin) {
  const affiliateUrl = buildAffiliateUrl(asin);
  let name = `Toy ${asin}`;
  let blurb = "A fun pick from Amazon.";
  let imageUrl = "";

  try {
    const res = await fetch(affiliateUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const ogTitle = metaContent(html, "og:title") || metaContent(html, "title", "name");
      const ogDesc =
        metaContent(html, "og:description") ||
        metaContent(html, "description", "name");
      const ogImage = metaContent(html, "og:image");
      if (ogTitle) name = cleanTitle(ogTitle);
      if (ogDesc) blurb = conciseBlurb(ogDesc);
      if (ogImage) imageUrl = ogImage;
    }
  } catch {
    // keep defaults
  }

  return { asin, affiliateUrl, name, blurb, imageUrl };
}

async function downloadImage(imageUrl, slug) {
  if (!imageUrl) return "/categories/plush.svg";
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return "/categories/plush.svg";
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const bytes = Buffer.from(await res.arrayBuffer());
    await mkdir(toysDir, { recursive: true });
    const fileName = `${slug}.${ext}`;
    await writeFile(path.join(toysDir, fileName), bytes);
    return `/toys/${fileName}`;
  } catch {
    return "/categories/plush.svg";
  }
}

function uniqueId(base, existing) {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

async function main() {
  const argPath = process.argv[2];
  const raw = argPath ? await readFile(argPath, "utf8") : DEFAULT_LINKS;
  const links = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("http"));

  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const existingAsins = new Set(
    catalog.toys
      .map((t) => parseAsin(t.affiliateUrl))
      .filter(Boolean),
  );
  const existingIds = new Set(catalog.toys.map((t) => t.id));

  let added = 0;
  let skipped = 0;
  let failed = 0;
  const created = [];

  for (let i = 0; i < links.length; i += 1) {
    const url = links[i];
    const asin = parseAsin(url);
    if (!asin) {
      console.log(`[${i + 1}/${links.length}] skip (no asin) ${url}`);
      failed += 1;
      continue;
    }
    if (existingAsins.has(asin)) {
      console.log(`[${i + 1}/${links.length}] exists ${asin}`);
      skipped += 1;
      continue;
    }

    const urlSlug = url.split("/dp/")[0]?.split("/").pop() ?? "";
    process.stdout.write(`[${i + 1}/${links.length}] fetch ${asin} ... `);
    const preview = await fetchPreview(asin);
    const inferred = inferMeta(preview.name, urlSlug);
    const baseSlug = slugify(preview.name) || `asin-${asin.toLowerCase()}`;
    const id = uniqueId(baseSlug, existingIds);
    const image = await downloadImage(preview.imageUrl, `${id}-${asin.toLowerCase()}`);

    const toy = {
      id,
      name: preview.name.slice(0, 80),
      category: inferred.category,
      audience: inferred.audience,
      blurb: preview.blurb || "A fun pick from Amazon.",
      image,
      imageAlt: preview.name.slice(0, 120),
      affiliateUrl: preview.affiliateUrl,
      ageMin: inferred.ageMin,
      ageMax: inferred.ageMax,
      color: CATEGORY_COLORS[inferred.category] ?? "#B19CD9",
    };

    catalog.toys.unshift(toy);
    existingAsins.add(asin);
    existingIds.add(id);
    created.push(toy.id);
    added += 1;
    console.log(`ok → ${toy.id} (${toy.category})`);

    // Persist incrementally so a mid-run interrupt keeps progress.
    await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
    await sleep(350);
  }

  console.log(
    `\nDone. added=${added} skipped=${skipped} failed=${failed} total=${catalog.toys.length}`,
  );
  if (created.length) console.log("new ids:", created.join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
