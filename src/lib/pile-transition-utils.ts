import type { PileAnchor, PileAnchorRect } from "@/lib/toy-pile-store";

function intersectionArea(a: DOMRect, b: DOMRect) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

export function snapshotRect(rect: DOMRect): PileAnchorRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function findMostVisibleFeedCard(
  scroller: HTMLElement,
): PileAnchor | null {
  const viewportRect = scroller.getBoundingClientRect();
  const cards = scroller.querySelectorAll(".feed-card[data-feed-slot]");
  let bestEl: Element | null = null;
  let bestArea = 0;
  let sumX = 0;
  let sumY = 0;
  let visibleCount = 0;

  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    const area = intersectionArea(rect, viewportRect);
    if (area <= 0) continue;

    visibleCount += 1;
    sumX += rect.left + rect.width / 2;
    sumY += rect.top + rect.height / 2;

    if (area > bestArea) {
      bestArea = area;
      bestEl = card;
    }
  }

  if (!bestEl || visibleCount === 0) return null;

  const slotIndex = Number(bestEl.getAttribute("data-feed-slot") ?? "-1");
  const toyId = bestEl.getAttribute("data-toy-id") ?? "";
  if (slotIndex < 0 || !toyId) return null;

  return {
    slotIndex,
    toyId,
    rect: snapshotRect(bestEl.getBoundingClientRect()),
    viewCenter: {
      x: sumX / visibleCount,
      y: sumY / visibleCount,
    },
  };
}

/** Hash-based toy slot for infinite pile coordinates (matches ToyPileGrid). */
export function pileToyIndexForCell(col: number, row: number, poolLength: number) {
  const hash = ((col * 73856093) ^ (row * 19349663)) >>> 0;
  return hash % poolLength;
}

/** Nearest pile cell to `prefer` that shows `toyIndex`. */
export function findPileCellForToyIndex(
  toyIndex: number,
  poolLength: number,
  preferCol = 0,
  preferRow = 0,
): { col: number; row: number } {
  if (pileToyIndexForCell(preferCol, preferRow, poolLength) === toyIndex) {
    return { col: preferCol, row: preferRow };
  }

  for (let radius = 1; radius < 512; radius++) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
        const col = preferCol + dc;
        const row = preferRow + dr;
        if (pileToyIndexForCell(col, row, poolLength) === toyIndex) {
          return { col, row };
        }
      }
    }
  }

  return { col: preferCol, row: preferRow };
}

/** Offset grid origin so the anchor toy sits at the center of the initial chunk. */
export function getCenteredPileGridOrigin(
  anchorToyId: string,
  pool: { id: string }[],
  gridSize: number,
): { colMin: number; rowMin: number; anchorCol: number; anchorRow: number } {
  const centerOffset = Math.floor(gridSize / 2);
  const toyIndex = pool.findIndex((t) => t.id === anchorToyId);
  if (toyIndex < 0) {
    return {
      colMin: -centerOffset,
      rowMin: -centerOffset,
      anchorCol: 0,
      anchorRow: 0,
    };
  }

  const { col, row } = findPileCellForToyIndex(toyIndex, pool.length);
  return {
    colMin: col - centerOffset,
    rowMin: row - centerOffset,
    anchorCol: col,
    anchorRow: row,
  };
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Matches `.toy-feed-grid` column breakpoints in globals.css */
export const FEED_GRID_BREAKPOINTS = {
  twoCol: 720,
  threeCol: 1024,
} as const;

export function getFeedColumnCount(viewportWidth: number): number {
  if (viewportWidth >= FEED_GRID_BREAKPOINTS.threeCol) return 3;
  if (viewportWidth >= FEED_GRID_BREAKPOINTS.twoCol) return 2;
  return 1;
}

/** `.toy-pile-grid` uses 1rem horizontal padding */
const PILE_GRID_PAD_X = 16;

/** Single-column feed: slight zoom out from feed-card scale */
const PILE_ENTRY_MOBILE_RATIO = 0.84;

export type PileZoomBounds = {
  minZoom: number;
  maxZoom: number;
};

export type PileGridMetrics = {
  cell: number;
  gap: number;
};

/** Target zoom after pile enter — mirrors visible feed column count on wider screens. */
export function getPileEntryTargetZoom(
  viewport: HTMLElement,
  metrics: PileGridMetrics,
  bounds: PileZoomBounds,
): number {
  const { clientWidth } = viewport;
  const { cell, gap } = metrics;
  const cols = getFeedColumnCount(clientWidth);

  if (cols === 1) {
    const mobileZoom = bounds.maxZoom * PILE_ENTRY_MOBILE_RATIO;
    return Math.min(bounds.maxZoom, Math.max(bounds.minZoom, mobileZoom));
  }

  const span = cols * cell + (cols - 1) * gap;
  const fitZoom = (clientWidth - 2 * PILE_GRID_PAD_X) / span;
  return Math.min(bounds.maxZoom, Math.max(bounds.minZoom, fitZoom));
}
