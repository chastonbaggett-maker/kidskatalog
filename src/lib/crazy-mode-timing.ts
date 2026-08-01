/** Keep in sync with crazy-card-flash / crazy-btn-strike-pulse in globals.css (0.28s). */
export const CRAZY_CARD_FLASH_MS = 280;

/** Full-screen flash duration — matches .crazy-screen-flash (0.6s). */
export const CRAZY_SCREEN_FLASH_MS = 600;

/** Time between crazy flash cycles. */
export const CRAZY_FLASH_INTERVAL_MS = 2200;

export function preloadImages(urls: string[]) {
  if (typeof window === "undefined") return;
  for (const src of urls) {
    const img = new window.Image();
    img.src = src;
  }
}

export function urlsForSwappedSlots(
  nextOrder: string[],
  slotIndices: number[],
  imageById: Map<string, string>,
) {
  return slotIndices
    .map((slot) => imageById.get(nextOrder[slot] ?? ""))
    .filter((src): src is string => Boolean(src));
}
