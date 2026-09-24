/** Remembers browse feed place so toy back returns to the same cards. */

export const BROWSE_SCROLL_KEY = "kk_browse_scroll";
export const BROWSE_SEED_KEY = "kk_browse_seed";
export const BROWSE_SCROLL_PATH = "/shop";

type BrowseScrollPayload = {
  path: string;
  top: number;
  toyId?: string;
  seed?: number;
  savedAt: number;
};

type BrowseSeedPayload = {
  filtersKey: string;
  seed: number;
};

function browseScrollStorage(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

export function saveBrowseScroll(
  top: number,
  options?: { path?: string; toyId?: string; seed?: number },
) {
  const store = browseScrollStorage();
  if (!store) return;
  if (!Number.isFinite(top) || top < 0) return;
  const path = options?.path ?? BROWSE_SCROLL_PATH;
  const existing = readBrowseScroll(path);
  const payload: BrowseScrollPayload = {
    path,
    top: Math.round(top),
    savedAt: Date.now(),
  };
  const toyId = options?.toyId ?? existing?.toyId;
  if (toyId) payload.toyId = toyId;
  const seed = options?.seed ?? existing?.seed;
  if (typeof seed === "number" && Number.isFinite(seed)) {
    payload.seed = seed >>> 0;
  }
  try {
    store.setItem(BROWSE_SCROLL_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / blocked storage */
  }
}

export function readBrowseScroll(
  path = BROWSE_SCROLL_PATH,
): BrowseScrollPayload | null {
  const store = browseScrollStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(BROWSE_SCROLL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowseScrollPayload;
    if (!parsed || parsed.path !== path) return null;
    if (!Number.isFinite(parsed.top) || parsed.top < 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearBrowseScroll() {
  const store = browseScrollStorage();
  if (!store) return;
  try {
    store.removeItem(BROWSE_SCROLL_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

export function readBrowseSeed(filtersKey: string): number | null {
  const pending = readBrowseScroll();
  if (
    pending &&
    typeof pending.seed === "number" &&
    Number.isFinite(pending.seed) &&
    pending.top > 0
  ) {
    return pending.seed >>> 0;
  }
  const store = browseScrollStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(BROWSE_SEED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowseSeedPayload;
    if (!parsed || parsed.filtersKey !== filtersKey) return null;
    if (!Number.isFinite(parsed.seed)) return null;
    return parsed.seed >>> 0;
  } catch {
    return null;
  }
}

export function writeBrowseSeed(filtersKey: string, seed: number) {
  const store = browseScrollStorage();
  if (!store) return;
  if (!Number.isFinite(seed)) return;
  const payload: BrowseSeedPayload = {
    filtersKey,
    seed: seed >>> 0,
  };
  try {
    store.setItem(BROWSE_SEED_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / blocked storage */
  }
  // Keep pending restore seed in sync so remounts don't reshuffle.
  const pending = readBrowseScroll();
  if (pending && pending.top > 0) {
    saveBrowseScroll(pending.top, {
      toyId: pending.toyId,
      seed: seed >>> 0,
    });
  }
}

/** Restore saved browse place into a feed scroller. Returns true when settled. */
export function restoreBrowseScroll(scroller: HTMLElement): boolean {
  const saved = readBrowseScroll();
  if (!saved || saved.top <= 0) return true;

  if (saved.toyId) {
    const card = scroller.querySelector<HTMLElement>(
      `[data-toy-id="${CSS.escape(saved.toyId)}"]`,
    );
    if (card) {
      const scrollerRect = scroller.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const delta =
        cardRect.top -
        scrollerRect.top -
        scroller.clientHeight / 2 +
        cardRect.height / 2;
      scroller.scrollTop += delta;
      return true;
    }
  }

  const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  scroller.scrollTop = Math.min(saved.top, maxTop);
  // Settled when we reached the target, or content is still shorter (keep trying).
  if (maxTop + 24 < saved.top) return false;
  return Math.abs(scroller.scrollTop - Math.min(saved.top, maxTop)) < 24;
}
