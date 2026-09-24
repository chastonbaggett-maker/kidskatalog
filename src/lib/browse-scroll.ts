/** Remembers browse feed place so toy back returns to the same cards. */

export const BROWSE_SCROLL_KEY = "kk_browse_scroll";
export const BROWSE_SCROLL_PATH = "/shop";

type BrowseScrollPayload = {
  path: string;
  top: number;
  toyId?: string;
  savedAt: number;
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
  options?: { path?: string; toyId?: string },
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

/** Restore saved browse place into a feed scroller. Returns true when settled. */
export function restoreBrowseScroll(scroller: HTMLElement): boolean {
  const saved = readBrowseScroll();
  if (!saved || saved.top <= 0) return true;

  if (saved.toyId) {
    const card = scroller.querySelector<HTMLElement>(
      `[data-toy-id="${CSS.escape(saved.toyId)}"]`,
    );
    if (card) {
      card.scrollIntoView({ block: "center", inline: "nearest" });
      return true;
    }
  }

  scroller.scrollTop = saved.top;
  return Math.abs(scroller.scrollTop - saved.top) < 24;
}
