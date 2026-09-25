/** Parent Mode routes — safe to import from client or server. */

export const PARENT_RESERVED_IDS = [
  "deals",
  "sign-in",
  "sign-up",
  "lists",
] as const;

export function parentToyPath(id: string): string {
  return `/p/${encodeURIComponent(id)}`;
}

export function parentDealsPath(): string {
  return "/p/deals";
}

export function parentWishlistPath(
  ids?: string[],
  interest?: Record<string, number>,
): string {
  if (!ids?.length) return "/p";
  const value = ids.map((id) => encodeURIComponent(id)).join(",");
  const base = `/p?ids=${value}`;
  if (!interest) return base;
  const scored = ids
    .map((id) => {
      const score = Math.floor(interest[id] ?? 0);
      if (score <= 0) return "";
      return `${encodeURIComponent(id)}:${score}`;
    })
    .filter(Boolean);
  if (scored.length === 0) return base;
  return `${base}&interest=${scored.join(",")}`;
}

export function parentToyUrl(id: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}${parentToyPath(id)}`;
}

export function parentWishlistUrl(
  ids: string[],
  origin: string,
  interest?: Record<string, number>,
): string {
  return `${origin.replace(/\/$/, "")}${parentWishlistPath(ids, interest)}`;
}

export function parentSignInPath(returnTo?: string): string {
  if (!returnTo) return "/p/sign-in";
  return `/p/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
}

export function parentSignUpPath(returnTo?: string): string {
  if (!returnTo) return "/p/sign-up";
  return `/p/sign-up?returnTo=${encodeURIComponent(returnTo)}`;
}

export function parentListsPath(): string {
  return "/p/lists";
}

export function parentSavedListPath(id: string): string {
  return `/p/lists/${encodeURIComponent(id)}`;
}

export function parentSavedListQueryPath(id: string): string {
  return `/p?list=${encodeURIComponent(id)}`;
}

export function parseSavedListId(raw: string | string[] | undefined): string | null {
  const text = Array.isArray(raw) ? raw[0] : raw;
  const id = (text ?? "").trim();
  if (!/^lst_[a-z0-9]+$/i.test(id)) return null;
  return id;
}

/** Scores carried on a Kart share link, keyed by toy id. */
export function parseWishlistInterest(
  raw: string | string[] | undefined,
): Record<string, number> {
  const text = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const scores: Record<string, number> = {};
  for (const part of text.split(",")) {
    const splitAt = part.lastIndexOf(":");
    if (splitAt <= 0) continue;
    const id = decodeURIComponent(part.slice(0, splitAt)).trim();
    const score = Number(part.slice(splitAt + 1));
    if (!id || !Number.isFinite(score) || score <= 0) continue;
    scores[id] = Math.min(Math.floor(score), 100000);
  }
  return scores;
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

export function parentReturnPath(raw: string | string[] | undefined): string {
  const text = Array.isArray(raw) ? raw[0] : raw;
  const path = (text ?? "").trim();
  if (path.startsWith("//") || path.includes("://") || path.includes("\\")) return "/p";
  if (path === "/claim" || /^\/claim\/[A-Z2-9]{4,16}$/i.test(path)) return path;
  if (!path.startsWith("/p")) return "/p";
  return path;
}
