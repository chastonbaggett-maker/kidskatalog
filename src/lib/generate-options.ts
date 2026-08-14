import type { Audience, CategoryId } from "@/types/toy";

export type AgePresetId =
  | "all"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "13"
  | "3-5"
  | "4-8"
  | "5-7"
  | "6-9"
  | "8-13";

export type GenerateListingsOptions = {
  count: number;
  agePreset: AgePresetId;
  audience: Audience | "any";
  category: CategoryId | "any";
};

export const DEFAULT_GENERATE_OPTIONS: GenerateListingsOptions = {
  count: 10,
  agePreset: "all",
  audience: "any",
  category: "any",
};

export const AGE_PRESETS: { id: AgePresetId; label: string; min: number; max: number }[] = [
  { id: "all", label: "Any (3–13)", min: 3, max: 13 },
  { id: "2", label: "2 yr", min: 2, max: 2 },
  { id: "3", label: "3 yr", min: 3, max: 3 },
  { id: "4", label: "4 yr", min: 4, max: 4 },
  { id: "5", label: "5 yr", min: 5, max: 5 },
  { id: "6", label: "6 yr", min: 6, max: 6 },
  { id: "7", label: "7 yr", min: 7, max: 7 },
  { id: "8", label: "8 yr", min: 8, max: 8 },
  { id: "9", label: "9 yr", min: 9, max: 9 },
  { id: "10", label: "10 yr", min: 10, max: 10 },
  { id: "11", label: "11 yr", min: 11, max: 11 },
  { id: "12", label: "12 yr", min: 12, max: 12 },
  { id: "13", label: "13 yr", min: 13, max: 13 },
  { id: "3-5", label: "Ages 3–5", min: 3, max: 5 },
  { id: "4-8", label: "Ages 4–8", min: 4, max: 8 },
  { id: "5-7", label: "Ages 5–7", min: 5, max: 7 },
  { id: "6-9", label: "Ages 6–9", min: 6, max: 9 },
  { id: "8-13", label: "Ages 8–13", min: 8, max: 13 },
];

const CATEGORY_QUERY: Record<CategoryId, string> = {
  dinos: "dinosaur toys",
  plush: "plush stuffed animals",
  cars: "cars trucks vehicles toys",
  blocks: "building blocks LEGO",
  outside: "outdoor toys",
  games: "kids games puzzles",
  stem: "STEM toys robots",
  pretend: "pretend play toys",
};

export function resolveAgePreset(id: AgePresetId): { min: number; max: number; label: string } {
  const preset = AGE_PRESETS.find((p) => p.id === id) ?? AGE_PRESETS[0]!;
  return { min: preset.min, max: preset.max, label: preset.label };
}

/** Build Amazon search queries from admin targeting options. */
export function buildSearchQueries(options: GenerateListingsOptions): string[] {
  const age = resolveAgePreset(options.agePreset);
  const audiencePart =
    options.audience === "boys"
      ? "boys"
      : options.audience === "girls"
        ? "girls"
        : "kids";
  const typePart =
    options.category === "any" ? "toys" : CATEGORY_QUERY[options.category];

  const queries: string[] = [];

  if (age.min === age.max) {
    queries.push(`best ${typePart} for ${age.min} year old ${audiencePart}`);
    queries.push(`popular ${typePart} age ${age.min} ${audiencePart}`);
    queries.push(`top rated ${typePart} ${age.min} year olds`);
  } else if (options.agePreset === "all") {
    for (const n of [3, 5, 7, 9, 11, 13]) {
      queries.push(`best ${typePart} for ${n} year old ${audiencePart}`);
    }
    queries.push(`popular ${typePart} ages 3-13 ${audiencePart}`);
    queries.push(`top rated ${typePart} ${audiencePart}`);
  } else {
    queries.push(
      `best ${typePart} for ages ${age.min}-${age.max} ${audiencePart}`,
    );
    queries.push(
      `popular ${typePart} ${age.min} to ${age.max} year old ${audiencePart}`,
    );
    for (let n = age.min; n <= age.max; n += 1) {
      queries.push(`best ${typePart} for ${n} year old ${audiencePart}`);
    }
  }

  // Dedupe while preserving order.
  return [...new Set(queries)];
}

export function normalizeGenerateOptions(
  input: Partial<GenerateListingsOptions> | null | undefined,
): GenerateListingsOptions {
  const count =
    typeof input?.count === "number" && input.count > 0
      ? Math.min(20, Math.floor(input.count))
      : DEFAULT_GENERATE_OPTIONS.count;

  const agePreset = AGE_PRESETS.some((p) => p.id === input?.agePreset)
    ? (input!.agePreset as AgePresetId)
    : DEFAULT_GENERATE_OPTIONS.agePreset;

  const audience =
    input?.audience === "boys" ||
    input?.audience === "girls" ||
    input?.audience === "all" ||
    input?.audience === "any"
      ? input.audience
      : DEFAULT_GENERATE_OPTIONS.audience;

  const categoryIds: Array<CategoryId | "any"> = [
    "any",
    "dinos",
    "plush",
    "cars",
    "blocks",
    "outside",
    "games",
    "stem",
    "pretend",
  ];
  const category = categoryIds.includes(input?.category as CategoryId | "any")
    ? (input!.category as CategoryId | "any")
    : DEFAULT_GENERATE_OPTIONS.category;

  return { count, agePreset, audience, category };
}
