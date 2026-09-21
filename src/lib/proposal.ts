import {
  FALLBACK_AFFILIATE_TAG,
  storedParentAffiliateUrl,
  withStoredAssociatesTag,
} from "@/lib/affiliate";
import { parseAsin } from "@/lib/amazon-import";
import { slugify } from "@/lib/slugify";
import { categoryColor } from "@/lib/toy-card-style";
import type {
  Audience,
  CategoryId,
  DraftReviewStatus,
  DraftToy,
} from "@/types/toy";

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
  amazonUrl?: string;
  amazon?: string;
  url?: string;
  affiliateUrl?: string;
  sourceNotes?: string;
  sourceTitle?: string;
  source?: string;
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

export function extractProposalAsin(input: ProposalInput): string | null {
  const candidates = [
    input.asin,
    input.amazonUrl,
    input.amazon,
    input.url,
    input.affiliateUrl,
  ];
  for (const value of candidates) {
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

  const asin = extractProposalAsin(input);
  const proposedLink = (input.affiliateUrl || "").trim();
  let affiliateUrl = "";
  if (asin) {
    affiliateUrl = storedParentAffiliateUrl(asin);
  } else if (proposedLink) {
    affiliateUrl = withStoredAssociatesTag(proposedLink);
  }
  if (!affiliateUrl) {
    return { error: "Missing Amazon ASIN/URL or proposed affiliate link" };
  }

  const category = parseCategoryId(input.category);
  const audience = parseAudience(input.audience);
  const { ageMin, ageMax } = parseAgeRange(input);
  const images = imageList(input);
  const fallbackImage = `/categories/${category}.svg`;
  const gallery = images.length > 0 ? images : [fallbackImage];
  const blurb = (input.blurb || "").trim() || "Fun pick for playtime.";
  const sourceNotes = (input.sourceNotes || input.source || "").trim();
  const sourceTitle = (input.sourceTitle || "").trim();

  let id = (input.id || "").trim() || slugify(name) || (asin ? `toy-${asin.toLowerCase()}` : "");
  if (!id) id = `toy-${Date.now()}`;
  if (usedIds.has(id) && asin) id = `${id}-${asin.slice(-4).toLowerCase()}`;
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
    reviewStatus: "proposed",
    createdAt: new Date().toISOString(),
  };
  if (asin) draft.asin = asin;
  if (sourceNotes) draft.sourceNotes = sourceNotes;
  if (sourceTitle) draft.sourceTitle = sourceTitle;
  return draft;
}

export function draftReviewStatus(draft: DraftToy): DraftReviewStatus {
  return draft.reviewStatus === "approved" ? "approved" : "proposed";
}

export function isApprovedDraft(draft: DraftToy): boolean {
  return draftReviewStatus(draft) === "approved";
}

export { FALLBACK_AFFILIATE_TAG };
