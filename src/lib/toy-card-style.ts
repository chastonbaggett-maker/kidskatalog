import type { Audience, CategoryId } from "@/types/toy";
import { categories } from "@/data/categories";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "set",
  "pack",
  "kids",
  "kid",
  "toy",
  "toys",
  "amazon",
  "exclusive",
  "new",
  "official",
  "original",
  "bundle",
  "assorted",
  "inches",
  "inch",
  "piece",
  "pieces",
  "count",
]);

const BRAND_PREFIX =
  /^(lego|mattel|hasbro|crayola|play-?doh|melissa\s*&\s*doug|vtech|leapfrog|fisher-?price|hot\s*wheels|nerf|barbie|disney|spin\s*master|schylling)\s+/i;

export function categoryColor(category: CategoryId): string {
  return categories.find((c) => c.id === category)?.hue ?? "#B19CD9";
}

/** Short catchy card name — 1–2 Title Case words, matching live catalog voice. */
export function shortCardName(title: string): string {
  let t = title
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/["“”']/g, "")
    .replace(/\s*[,|:–—-]\s*.*$/, " ")
    .replace(BRAND_PREFIX, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = t
    .split(" ")
    .map((w) => w.replace(/[^a-zA-Z0-9'-]/g, ""))
    .filter((w) => w.length > 1 && !STOP.has(w.toLowerCase()));

  // Live catalog is almost always 2 words (never 3+).
  const picked = words.slice(0, 2);
  if (picked.length === 0) return "Fun Toy";

  return picked
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** ~4–6 word kid-friendly blurb (target 5) ending with a period. */
export function kidBlurb(title: string, description: string): string {
  const source = (description || title).replace(/\s+/g, " ").trim();
  const cleaned = source
    .replace(/^amazon\.com[:\s-]*/i, "")
    .replace(/\b(buy|shop|deal|save|%\s*off|perfect for|great gift)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter(Boolean);
  if (words.length === 0) return "Fun pick for playtime.";

  // Live catalog averages ~5 words (range 3–6).
  let phrase = words.slice(0, 5).join(" ");
  phrase = phrase.replace(/[,:;]+$/, "");
  if (!/[.!?]$/.test(phrase)) phrase = `${phrase}.`;
  return phrase;
}

/** Force any draft name into live-catalog 1–2 word Title Case. */
export function normalizeCatalogName(raw: string, fallbackTitle: string): string {
  const source = (raw || "").trim() || fallbackTitle;
  const cleaned = shortCardName(source);
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return cleaned;
  return words.slice(0, 2).join(" ");
}

/** Force any draft blurb into ~4–6 word catalog cadence ending with a period. */
export function normalizeCatalogBlurb(
  raw: string,
  fallbackTitle: string,
  fallbackDescription = "",
): string {
  let phrase = (raw || "").replace(/\s+/g, " ").trim();
  if (!phrase) {
    phrase = kidBlurb(fallbackTitle, fallbackDescription);
  }

  phrase = phrase
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\b(buy|shop|deal|save|%\s*off|perfect for|great gift)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = phrase
    .replace(/[.!?]+$/g, "")
    .split(/\s+/)
    .filter(Boolean);

  // Live catalog averages ~5 words; clamp to 4–6 (prefer 5 when trimming).
  let kept = words;
  if (kept.length > 6) kept = kept.slice(0, 5);
  if (kept.length < 3) {
    const fb = kidBlurb(fallbackTitle, fallbackDescription || phrase)
      .replace(/[.!?]+$/g, "")
      .split(/\s+/)
      .filter(Boolean);
    kept = fb.slice(0, 5);
  }

  let out = kept.join(" ");
  out = out
    .replace(/\b(and|or|the|a|an|for|with|to|of|in|on)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,:;]+$/g, "");
  if (!out) {
    out = kidBlurb(fallbackTitle, fallbackDescription)
      .replace(/[.!?]+$/g, "")
      .trim();
  }
  if (!/[.!?]$/.test(out)) out = `${out}.`;
  return out;
}

export function inferToyMeta(
  name: string,
  extra = "",
): {
  category: CategoryId;
  audience: Audience;
  ageMin: number;
  ageMax: number;
} {
  const t = `${name} ${extra}`.toLowerCase();

  let category: CategoryId = "pretend";
  if (/(dino|dinosaur|rex|t-rex)/.test(t)) category = "dinos";
  else if (/(plush|stuffed|soft toy|lovey|teddy|beanie)/.test(t)) category = "plush";
  else if (
    /(lego|magna|magnetic tile|building block|brick|baseplate|duplo|plus-plus|interlocking)/.test(
      t,
    )
  ) {
    category = "blocks";
  } else if (
    /(truck|helicopter|train|car\b|cars|vehicle|mower|motorcycle|racer|hot wheels)/.test(
      t,
    )
  ) {
    category = "cars";
  } else if (
    /(balance bike|scooter|outside|bubble|balloon|bathtub|water toy|outdoor|sports|ball\b)/.test(
      t,
    )
  ) {
    category = "outside";
  } else if (
    /(uno|card game|\bgame\b|fidget|squishy|needoh|puzzle|board game|party favor)/.test(
      t,
    )
  ) {
    category = "games";
  } else if (
    /(robot|robo|stem|science|yoto|tonie|bitzee|walkie|camera|karaoke|electronic|tablet|coding)/.test(
      t,
    )
  ) {
    category = "stem";
  } else if (
    /(crayola|play-?doh|craft|sticker|scissors|watercolor|marker|pencil|art\b)/.test(
      t,
    )
  ) {
    category = "pretend";
  }

  let audience: Audience = "all";
  if (/\bgirls?\b/.test(t)) audience = "girls";
  else if (/\bboys?\b/.test(t)) audience = "boys";

  let ageMin = 3;
  let ageMax = 10;
  if (/(ages?\s*3|3\+|preschool)/.test(t)) {
    ageMin = 3;
    ageMax = 7;
  }
  if (/(ages?\s*4|4\+)/.test(t)) {
    ageMin = 4;
    ageMax = 9;
  }
  if (/(ages?\s*5|5\+)/.test(t)) {
    ageMin = 5;
    ageMax = 10;
  }
  if (/(ages?\s*6|6\+|grade)/.test(t)) {
    ageMin = 6;
    ageMax = 12;
  }
  if (/(ages?\s*7|7\+|card game|uno)/.test(t)) {
    ageMin = 7;
    ageMax = 13;
  }
  if (/(ages?\s*8|8\+)/.test(t)) {
    ageMin = 8;
    ageMax = 13;
  }
  if (/(lego classic|creator|botanicals|speed champions)/.test(t)) {
    ageMin = 6;
    ageMax = 12;
  }
  if (/(walkie|karaoke|camera|tonie|yoto)/.test(t)) {
    ageMin = 4;
    ageMax = 12;
  }

  // Generator targets 3–13 shoppers.
  ageMin = Math.min(13, Math.max(3, ageMin));
  ageMax = Math.min(13, Math.max(ageMin, ageMax));

  return { category, audience, ageMin, ageMax };
}
