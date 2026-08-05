import type { Audience, CategoryId, Toy } from "@/types/toy";

export type CatalogFilters = {
  category?: CategoryId | string;
  audience?: Audience | "all";
  age?: number | null;
  q?: string;
  excludeId?: string;
  excludeIds?: string[];
};

export type CatalogPageRequest = CatalogFilters & {
  offset?: number;
  limit?: number;
};

export type CatalogPageResult = {
  toys: Toy[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

export function filterCatalogToys(toys: Toy[], filters: CatalogFilters): Toy[] {
  const q = filters.q?.trim().toLowerCase() ?? "";
  const audience = filters.audience ?? "all";
  const age = filters.age ?? null;
  const exclude = new Set([
    ...(filters.excludeId ? [filters.excludeId] : []),
    ...(filters.excludeIds ?? []),
  ]);

  return toys.filter((toy) => {
    if (exclude.has(toy.id)) return false;
    if (filters.category && toy.category !== filters.category) return false;

    const audienceOk =
      audience === "all" ||
      toy.audience === "all" ||
      toy.audience === audience;
    if (!audienceOk) return false;

    const queryOk =
      !q ||
      toy.name.toLowerCase().includes(q) ||
      toy.blurb.toLowerCase().includes(q) ||
      toy.category.includes(q);
    if (!queryOk) return false;

    const ageOk = age == null || (toy.ageMin <= age && toy.ageMax >= age);
    return ageOk;
  });
}

export function paginateCatalogToys(
  toys: Toy[],
  request: CatalogPageRequest,
): CatalogPageResult {
  const offset = Math.max(0, request.offset ?? 0);
  const limit = Math.max(1, Math.min(request.limit ?? 20, 60));
  const filtered = filterCatalogToys(toys, request);
  const page = filtered.slice(offset, offset + limit);

  return {
    toys: page,
    total: filtered.length,
    offset,
    limit,
    hasMore: offset + page.length < filtered.length,
  };
}

export function pickRandomCatalogToys(
  toys: Toy[],
  filters: CatalogFilters,
  count: number,
  seed: number,
): Toy[] {
  const pool = filterCatalogToys(toys, filters);
  if (pool.length === 0 || count <= 0) return [];

  const picks: Toy[] = [];
  let s = seed >>> 0;
  const used = new Set<string>();

  for (let i = 0; i < count && used.size < pool.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const toy = pool[s % pool.length]!;
    if (used.has(toy.id)) continue;
    used.add(toy.id);
    picks.push(toy);
  }

  return picks;
}

export function buildCatalogQueryString(
  request: CatalogPageRequest & { ids?: string[] },
): string {
  const params = new URLSearchParams();
  if (request.ids?.length) {
    params.set("ids", request.ids.join(","));
    return params.toString();
  }
  params.set("offset", String(request.offset ?? 0));
  params.set("limit", String(request.limit ?? 20));
  if (request.category) params.set("category", request.category);
  if (request.audience && request.audience !== "all") {
    params.set("audience", request.audience);
  }
  if (request.age != null) params.set("age", String(request.age));
  if (request.q?.trim()) params.set("q", request.q.trim());
  if (request.excludeId) params.set("exclude", request.excludeId);
  if (request.excludeIds?.length) {
    params.set("exclude", request.excludeIds.join(","));
  }
  return params.toString();
}
