import {
  FALLBACK_AFFILIATE_TAG,
  storedParentAffiliateUrl,
} from "@/lib/affiliate";
import { parseAsin } from "@/lib/amazon-import";
import {
  isStagedDraft,
  normalizeQueueStatus,
} from "@/lib/queue-status";
import { slugify } from "@/lib/slugify";
import { categoryColor } from "@/lib/toy-card-style";
import type {
  Audience,
  CategoryId,
  DraftReviewStatus,
  DraftToy,
} from "@/types/toy";

export { FALLBACK_AFFILIATE_TAG };
export { isStagedDraft, normalizeQueueStatus };
export { MAX_TOY_PROPOSAL_BATCH } from "@/lib/queue-status";

export const PROPOSAL_CATEGORIES: CategoryId[] = [
  "dinos",
  "plush",
  "cars",
  "blocks",
  "outside",
  "games",
  "stem",
  "pretend",
];

const CATEGORY_ALIASES: Record<string, CategoryId> = {
  dinosaur: "dinos",
  dinosaurs: "dinos",
  dino: "dinos",
  stuffed: "plush",
  "stuffed animal": "plush",
  plushie: "plush",
  vehicle: "cars",
  vehicles: "cars",
  car: "cars",
  truck: "cars",
  trucks: "cars",
  lego: "blocks",
  building: "blocks",
  outdoor: "outside",
  puzzle: "games",
  puzzles: "games",
  game: "games",
  robot: "stem",
  robots: "stem",
  science: "stem",
  build: "stem",
  doll: "pretend",
  kitchen: "pretend",
  dress: "pretend",
};

export type ProposalInput = {
  id?: string;
  name?: string;
  blurb?: string;
  images?: string[] | string;
  image?: string;
  age?: string | number | { min?: number; max?: number };
  ageMin?: number;
  ageMax?: number;
  category?: string;
  audience?: string;
  asin?: string;
  amazon_url?: string;
  amazonUrl?: string;
  amazon?: string;
  url?: string;
  affiliate_url?: string;
  affiliateUrl?: string;
  notes?: string;
  sourceNotes?: string;
  sourceTitle?: string;
  source?: string;
  source_ref?: string;
  sourceRef?: string;
};

export type ProposalParseError = {
  error: string;
};

export function isProposalParseError(
  value: DraftToy | ProposalParseError,
): value is ProposalParseError {
  return "error" in value;
}

export function parseAgeRange(
  input: ProposalInput,
): { ageMin: number; ageMax: number } {
  const clamp = (n: number) => Math.max(0, Math.min(18, Math.round(n)));

  if (typeof input.age === "object" && input.age) {
    const min = Number(input.age.min);
    const max = Number(input.age.max);
    if (Number.isFinite(min) || Number.isFinite(max)) {
      const ageMin = Number.isFinite(min) ? clamp(min) : 3;
      const ageMax = Number.isFinite(max) ? clamp(max) : Math.max(ageMin, 13);
      return { ageMin, ageMax: Math.max(ageMin, ageMax) };
    }
  }

  if (typeof input.age === "number" && Number.isFinite(input.age)) {
    const n = clamp(input.age);
    return { ageMin: n, ageMax: Math.min(13, n + 2) };
  }

  if (typeof input.age === "string" && input.age.trim()) {
    const plus = input.age.match(/(\d+)\s*\+/);
    if (plus) {
      const ageMin = clamp(Number(plus[1]));
      return { ageMin, ageMax: 13 };
    }
    const range = input.age.match(/(\d+)\s*[-–—to]+\s*(\d+)/i);
    if (range) {
      const ageMin = clamp(Number(range[1]));
      const ageMax = clamp(Number(range[2]));
      return { ageMin: Math.min(ageMin, ageMax), ageMax: Math.max(ageMin, ageMax) };
    }
    const single = input.age.match(/(\d+)/);
    if (single) {
      const n = clamp(Number(single[1]));
      return { ageMin: n, ageMax: Math.min(13, n + 2) };
    }
  }

  const min = Number(input.ageMin);
  const max = Number(input.ageMax);
  const ageMin = Number.isFinite(min) ? clamp(min) : 3;
  const ageMax = Number.isFinite(max) ? clamp(max) : 13;
  return { ageMin, ageMax: Math.max(ageMin, ageMax) };
}

export function parseCategoryId(raw: string | undefined): CategoryId {
  const key = (raw || "").trim().toLowerCase();
  if ((PROPOSAL_CATEGORIES as string[]).includes(key)) return key as CategoryId;
  if (key && CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  return "games";
}

export function parseAudience(raw: string | undefined): Audience {
  const key = (raw || "").trim().toLowerCase();
  if (key === "boys" || key === "boy") return "boys";
  if (key === "girls" || key === "girl") return "girls";
  return "all";
}

function imageList(input: ProposalInput): string[] {
  const raw: string[] = [];
  if (Array.isArray(input.images)) raw.push(...input.images);
  else if (typeof input.images === "string" && input.images.trim()) {
    raw.push(
      ...input.images
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  if (typeof input.image === "string" && input.image.trim()) {
    raw.unshift(input.image.trim());
  }

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const src of raw) {
    const trimmed = src.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    // Do not store Amazon product Buy URLs as images (kid HTML would leak /dp/).
    if (/amazon\.[^/]*\/(?:dp|gp\/product)\//i.test(trimmed) || /[?&]tag=/i.test(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
}

function firstString(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** Spec: asin OR amazon_url is required. affiliate_url alone is not enough. */
export function extractRequiredProposalAsin(input: ProposalInput): string | null {
  const candidates = [input.asin, input.amazon_url, input.amazonUrl, input.amazon];
  for (const value of candidates) {
    if (!value) continue;
    const asin = parseAsin(String(value));
    if (asin) return asin;
  }
  return null;
}

export function extractProposalAsin(input: ProposalInput): string | null {
  const required = extractRequiredProposalAsin(input);
  if (required) return required;
  const extras = [input.url, input.affiliate_url, input.affiliateUrl];
  for (const value of extras) {
    if (!value) continue;
    const asin = parseAsin(String(value));
    if (asin) return asin;
  }
  return null;
}

export function parseProposalInput(
  input: ProposalInput,
  usedIds: Set<string>,
): DraftToy | ProposalParseError {
  const name = (input.name || "").trim();
  if (!name) return { error: "Missing name" };

  const asin = extractRequiredProposalAsin(input);
  if (!asin) {
    return { error: "asin or amazon_url is required" };
  }

  const affiliateUrl = storedParentAffiliateUrl(asin);
  const category = parseCategoryId(input.category);
  const audience = parseAudience(input.audience);
  const { ageMin, ageMax } = parseAgeRange(input);
  const images = imageList(input);
  const fallbackImage = `/categories/${category}.svg`;
  const gallery = images.length > 0 ? images : [fallbackImage];
  const blurb = (input.blurb || "").trim() || "Fun pick for playtime.";
  const notes = firstString(input.notes, input.sourceNotes);
  const source = firstString(input.source);
  const sourceRef = firstString(input.source_ref, input.sourceRef);
  const sourceTitle = firstString(input.sourceTitle);

  let id = (input.id || "").trim() || slugify(name) || `toy-${asin.toLowerCase()}`;
  if (!id) id = `toy-${Date.now()}`;
  if (usedIds.has(id)) id = `${id}-${asin.slice(-4).toLowerCase()}`;
  if (usedIds.has(id)) id = `${id}-${Date.now().toString(36)}`;

  const draft: DraftToy = {
    id,
    name,
    blurb,
    category,
    audience,
    ageMin,
    ageMax,
    image: gallery[0]!,
    images: gallery,
    imageAlt: `${name} toy`,
    affiliateUrl,
    color: categoryColor(category),
    featuredTier: 0,
    featured: false,
    reviewStatus: "pending",
    createdAt: new Date().toISOString(),
    asin,
  };
  if (notes) {
    draft.notes = notes;
    draft.sourceNotes = notes;
  }
  if (source) draft.source = source;
  if (sourceRef) draft.sourceRef = sourceRef;
  if (sourceTitle) draft.sourceTitle = sourceTitle;
  return draft;
}

export function draftReviewStatus(draft: DraftToy): DraftReviewStatus {
  return normalizeQueueStatus(draft.reviewStatus);
}

/** @deprecated Use isStagedDraft. Approve stages; it does not publish. */
export function isApprovedDraft(draft: DraftToy): boolean {
  return isStagedDraft(draft);
}
