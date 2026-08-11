import "server-only";
import type { Audience, CategoryId } from "@/types/toy";
import {
  inferToyMeta,
  kidBlurb,
  shortCardName,
} from "@/lib/toy-card-style";

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

const SYSTEM_PROMPT = `You write KidsKatalog toy card listings for a kid-friendly virtual catalog (ages ~3–13).

Return ONLY valid JSON with keys:
name, blurb, category, audience, ageMin, ageMax

Guidelines:
- name: short catchy card title, 1–3 Title Case words. Drop brand fluff, pack counts, and marketing suffixes. Match catalog voice (e.g. "Squishmallow", "Magna Tiles", "Hot Wheels").
- blurb: kid-friendly, about 5–8 words, ends with a period. Playful, not salesy. No prices, deals, or "buy now".
- category: one of dinos | plush | cars | blocks | outside | games | stem | pretend
  (stem = build/robots/STEM; pretend = art, dolls, dress-up, pretend play)
- audience: all | boys | girls (prefer all unless clearly gendered)
- ageMin / ageMax: integers from 3–13 based on the product; ageMax >= ageMin

Do not invent unrelated products. Base fields on the Amazon title and description provided.`;

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
): GrokListingFields {
  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim().slice(0, 48)
      : fallback.name;
  let blurb =
    typeof raw.blurb === "string" && raw.blurb.trim()
      ? raw.blurb.trim().slice(0, 96)
      : fallback.blurb;
  if (!/[.!?]$/.test(blurb)) blurb = `${blurb}.`;

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
  const fallback = heuristicListing(
    input.sourceTitle,
    input.description || input.sourceTitle,
  );
  const apiKey = getGrokApiKey();
  if (!apiKey) {
    return {
      fields: fallback,
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
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              amazonTitle: input.sourceTitle,
              amazonDescription: (input.description || "").slice(0, 1200),
            }),
          },
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        fields: fallback,
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
        fields: fallback,
        usedGrok: false,
        error: "Grok returned non-JSON — used local guidelines instead.",
      };
    }

    return {
      fields: normalizeGrokFields(parsed, fallback),
      usedGrok: true,
    };
  } catch (e) {
    return {
      fields: fallback,
      usedGrok: false,
      error: e instanceof Error ? e.message : "Grok request failed",
    };
  }
}
