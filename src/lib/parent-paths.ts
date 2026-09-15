/** Parent Mode routes — safe to import from client or server. */

export const PARENT_RESERVED_IDS = ["buy-placeholder", "deals"] as const;

export function parentToyPath(id: string): string {
  return `/p/${encodeURIComponent(id)}`;
}

export function parentDealsPath(): string {
  return "/p/deals";
}

/** Stub Buy target until Associates is approved. */
export function parentBuyPlaceholderPath(id: string): string {
  return `/p/buy-placeholder?toy=${encodeURIComponent(id)}#buy-placeholder`;
}

export function parentWishlistPath(ids?: string[]): string {
  if (!ids?.length) return "/p";
  const value = ids.map((id) => encodeURIComponent(id)).join(",");
  return `/p?ids=${value}`;
}

export function parentToyUrl(id: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}${parentToyPath(id)}`;
}

export function parentWishlistUrl(ids: string[], origin: string): string {
  return `${origin.replace(/\/$/, "")}${parentWishlistPath(ids)}`;
}

export function parseWishlistIds(raw: string | string[] | undefined): string[] {
  const text = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of text.split(",")) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
