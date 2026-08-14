import "server-only";
import type { Audience, CategoryId } from "@/types/toy";
import {
  inferToyMeta,
  kidBlurb,
  normalizeCatalogBlurb,
  normalizeCatalogName,
  shortCardName,
} from "@/lib/toy-card-style";

export { normalizeCatalogBlurb, normalizeCatalogName } from "@/lib/toy-card-style";

const CATEGORY_IDS: CategoryId[] = [
  "dinos",
  "plush",
  "cars",
  "blocks",
  "outside",
  "games",
  "stem",
  "pretend",
];

/** Live-catalog examples — keep Grok voice locked to existing cards. */
const CATALOG_VOICE_EXAMPLES = [
  { name: "Ocean Rescue", blurb: "Bath vehicles light up underwater." },
  { name: "Magnet Tiles", blurb: "110 magnetic tiles for castles." },
  { name: "Glow Pyramid", blurb: "Magnetic pyramid glows and flips." },
  { name: "Busy Board", blurb: "Latches and switches to explore." },
  { name: "Spidey Bike", blurb: "Spidey rides a cool motorcycle." },
  { name: "Brain Flakes", blurb: "Interlocking discs snap into shapes." },
  { name: "Sound Putty", blurb: "White noise and soft putty." },
  { name: "Flash Talkies", blurb: "Talk far with flashlight radios." },
] as const;

export type GrokListingFields = {
  name: string;
  blurb: string;
  category: CategoryId;
  audience: Audience;
  ageMin: number;
  ageMax: number;
};

export function getGrokApiKey(): string | null {
  const key =
    process.env.XAI_API_KEY?.trim() ||
    process.env.GROK_API_KEY?.trim() ||
    "";
  return key || null;
}

export function getGrokModel(): string {
  return (
    process.env.XAI_MODEL?.trim() ||
    process.env.GROK_MODEL?.trim() ||
    "grok-4.20-0309-non-reasoning"
  );
}

const SYSTEM_PROMPT = `You write KidsKatalog toy card listings. Match the EXISTING catalog voice exactly — do not invent a new style.

Return ONLY valid JSON with keys:
name, blurb, category, audience, ageMin, ageMax

NAME (must match live cards):
- Exactly 1 or 2 Title Case words (almost never 3).
- Catchy product nickname kids would say out loud.
- Keep distinctive product words (Magna→Magnet Tiles style nicknames, Spidey Bike, Ocean Rescue).
- Drop brand house names when the toy has its own identity (Hasbro/Mattel/Amazon fluff).
- Drop pack counts, ages, "set", "kit", "for kids", "gift", colors-as-marketing, and long Amazon suffixes.
- Good: "Ocean Rescue", "Magnet Tiles", "Busy Board", "Shashibo"
- Bad: "LED Bath Toy Boat Set", "Magnetic Building Tiles for Kids", "Official Marvel Spider-Man Motorcycle"

BLURB (must match live cards):
- One short sentence, 4–6 words (target 5), ending with a period.
- Present tense, concrete, playful — what it does / how it feels.
- No prices, deals, "buy", "perfect for", "great gift", or SEO stuffing.
- No repeating the full name as the whole blurb.
- Good: "Bath vehicles light up underwater."
- Good: "Latches and switches to explore."
- Bad: "This amazing educational STEM toy is perfect for creative kids ages 5 and up."

CATEGORY: one of dinos | plush | cars | blocks | outside | games | stem | pretend
  (stem = robots/electronics/STEM; pretend = art, dolls, dress-up, pretend play)
AUDIENCE: all | boys | girls (prefer all unless clearly gendered)
AGES: integers 3–13; ageMax >= ageMin

Base every field on the Amazon title/description. Do not invent a different product.`;

function heuristicListing(
  sourceTitle: string,
  description: string,
): GrokListingFields {
  const inferred = inferToyMeta(sourceTitle, description);
  return {
    name: shortCardName(sourceTitle),
    blurb: kidBlurb(sourceTitle, description),
    category: inferred.category,
    audience: inferred.audience,
    ageMin: inferred.ageMin,
    ageMax: inferred.ageMax,
  };
}

function clampAge(n: unknown, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(13, Math.max(3, Math.round(v)));
}

function normalizeGrokFields(
  raw: Record<string, unknown>,
  fallback: GrokListingFields,
  sourceTitle: string,
  description: string,
): GrokListingFields {
  const name = normalizeCatalogName(
    typeof raw.name === "string" ? raw.name : fallback.name,
    sourceTitle || fallback.name,
  );

  const blurb = normalizeCatalogBlurb(
    typeof raw.blurb === "string" ? raw.blurb : fallback.blurb,
    sourceTitle || fallback.name,
    description || fallback.blurb,
  );

  const category = CATEGORY_IDS.includes(raw.category as CategoryId)
    ? (raw.category as CategoryId)
    : fallback.category;

  const audience: Audience =
    raw.audience === "boys" || raw.audience === "girls" || raw.audience === "all"
      ? raw.audience
      : fallback.audience;

  let ageMin = clampAge(raw.ageMin, fallback.ageMin);
  let ageMax = clampAge(raw.ageMax, fallback.ageMax);
  if (ageMax < ageMin) ageMax = ageMin;

  return { name, blurb, category, audience, ageMin, ageMax };
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

/**
 * Use Grok (xAI) to draft card fields from Amazon product text.
 * Falls back to local heuristics when the API key is missing or the call fails.
 */
export async function draftListingWithGrok(input: {
  sourceTitle: string;
  description?: string;
}): Promise<{ fields: GrokListingFields; usedGrok: boolean; error?: string }> {
  const description = input.description || input.sourceTitle;
  const fallback = heuristicListing(input.sourceTitle, description);
  // Even heuristics get the same catalog normalizer.
  const fallbackNormalized = normalizeGrokFields(
    fallback,
    fallback,
    input.sourceTitle,
    description,
  );

  const apiKey = getGrokApiKey();
  if (!apiKey) {
    return {
      fields: fallbackNormalized,
      usedGrok: false,
      error: "XAI_API_KEY (or GROK_API_KEY) is not set — used local guidelines instead.",
    };
  }

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getGrokModel(),
        temperature: 0.2,
        max_tokens: 280,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                "Write name + blurb in the exact KidsKatalog catalog voice shown in examples.",
              catalogExamples: CATALOG_VOICE_EXAMPLES,
              amazonTitle: input.sourceTitle,
              amazonDescription: description.slice(0, 1200),
            }),
          },
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        fields: fallbackNormalized,
        usedGrok: false,
        error: `Grok API ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = extractJsonObject(content);
    if (!parsed) {
      return {
        fields: fallbackNormalized,
        usedGrok: false,
        error: "Grok returned non-JSON — used local guidelines instead.",
      };
    }

    return {
      fields: normalizeGrokFields(
        parsed,
        fallbackNormalized,
        input.sourceTitle,
        description,
      ),
      usedGrok: true,
    };
  } catch (e) {
    return {
      fields: fallbackNormalized,
      usedGrok: false,
      error: e instanceof Error ? e.message : "Grok request failed",
    };
  }
}
