"use client";

import { useRouter } from "next/navigation";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Toy } from "@/types/toy";
import { shuffleWithSeed } from "@/lib/shuffle";
import { beginRouteChange } from "@/lib/route-change";
import { FeedCard } from "./FeedCard";

const MIN_CHUNK = 6;
const INITIAL_SPAN = MIN_CHUNK * 3;
/** Keep spiral origin (0,0) near the middle of the starting shelf. */
const INITIAL_ORIGIN = -Math.floor(INITIAL_SPAN / 2);
const EDGE_THRESHOLD = 220;
const EXPAND_COOLDOWN_MS = 450;
const CULL_PAD_CELLS = 2;
const WHEEL_LOCK_IDLE_MS = 180;
const DRAG_CLICK_THRESHOLD_PX = 8;
/**
 * Opening framing — focused card fills this fraction of the visible band so
 * neighbors peek on every edge (matches the Toy Pile load reference).
 */
const OPEN_CARD_WIDTH_RATIO = 0.55;
const OPEN_CARD_HEIGHT_RATIO = 0.48;
/** Random focus stays near spiral origin so the first view is dense with uniques. */
const OPEN_FOCUS_RADIUS = 2;
/** Mount at least this many cells around the opening focus before framing. */
const OPEN_FOCUS_PAD = 2;
/** Visible grid span at min zoom on the reference mobile band. */
const MIN_ZOOM_OUT_COLUMNS = 3;
const MIN_ZOOM_OUT_ROWS = 6;
/** Tablet max zoom-out reference — ~6 columns × ~4.5 rows in the visible band. */
const TABLET_MIN_ZOOM_OUT_COLUMNS = 6;
const TABLET_MIN_ZOOM_OUT_ROWS = 4.5;
const TABLET_MIN_WIDTH_PX = 640;
const DESKTOP_MIN_WIDTH_PX = 1024;

type Props = {
  toys: Toy[];
  showText: boolean;
  /** Stable seed from active filters — reshuffles only when filters change. */
  filterSeed: number;
};

type Pan = { x: number; y: number };

type DragState = {
  active: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: number;
  captured: boolean;
};

type StagePoint = { x: number; y: number };

type CellWindow = { c0: number; c1: number; r0: number; r1: number };

function getMetrics(viewport: HTMLElement) {
  const style = getComputedStyle(viewport);
  // Custom props may be calc()/clamp() strings — prefer used grid track sizes.
  let cell = parseFloat(style.getPropertyValue("--pile-cell"));
  let row = parseFloat(style.getPropertyValue("--pile-row"));
  const gap = parseFloat(style.getPropertyValue("--pile-gap")) || 14;

  const grid = viewport.querySelector<HTMLElement>(".toy-pile-grid");
  if (grid) {
    const gridStyle = getComputedStyle(grid);
    const colTrack = parseFloat(gridStyle.gridTemplateColumns);
    const rowTrack = parseFloat(gridStyle.gridTemplateRows);
    if (colTrack > 0) cell = colTrack;
    if (rowTrack > 0) row = rowTrack;
  }

  if (!(cell > 0)) cell = 160;
  if (!(row > 0)) row = cell * 1.25;

  return {
    cell,
    row,
    gap,
    colStride: cell + gap,
    rowStride: row + gap,
    stride: cell + gap,
  };
}

function getPileFormFactor(viewport: HTMLElement) {
  const width = viewport.clientWidth;
  if (width >= DESKTOP_MIN_WIDTH_PX) return "desktop";
  if (width >= TABLET_MIN_WIDTH_PX) return "tablet";
  return "mobile";
}

function isPileZoomEnabled(viewport: HTMLElement) {
  return getPileFormFactor(viewport) !== "desktop";
}

/** Match regular-mode FeedCard width at the current breakpoint. */
function feedCardMetricsForWidth(width: number) {
  if (width >= DESKTOP_MIN_WIDTH_PX) {
    // 3-col feed: two 1.5rem gaps, card mx-2 (0.5rem each side)
    return {
      cell: Math.max(12 * 16, (width - 3 * 16) / 3 - 1 * 16),
      gap: 2.25 * 16,
    };
  }
  if (width >= 720) {
    // 2-col feed: padding-inline 0.5rem + 1.25rem gap, card mx-4
    return {
      cell: Math.max(12 * 16, (width - 2.25 * 16) / 2 - 2 * 16),
      gap: 2 * 16,
    };
  }
  // 1-col feed: card mx-6 (1.5rem each side), grid gap 2.5rem
  return {
    cell: Math.max(12 * 16, width - 3 * 16),
    gap: 2.5 * 16,
  };
}

function applyFeedCardMetrics(viewport: HTMLElement, showText: boolean) {
  const { cell, gap } = feedCardMetricsForWidth(viewport.clientWidth);
  viewport.style.setProperty("--pile-cell", `${cell}px`);
  viewport.style.setProperty("--pile-gap", `${gap}px`);

  const card = viewport.querySelector<HTMLElement>(".toy-pile-card .feed-card");
  if (card && card.offsetHeight > 0) {
    viewport.style.setProperty("--pile-row", `${card.offsetHeight}px`);
  } else {
    const textBlock = showText ? 7.5 * 16 : 0;
    viewport.style.setProperty("--pile-row", `${cell * 1.25 + textBlock}px`);
  }

  return { cell, gap };
}

function getMaxPileZoom(viewport: HTMLElement) {
  const { cell } = getMetrics(viewport);
  const band = getPileVisibleBand(viewport);
  // Cards are real feed-card size — never scale above 1:1; only zoom out for perspective.
  if (!(cell > 0)) return 1;
  return Math.min(1, band.width / cell);
}

/** Zoomed-out open framing — center card prominent, neighbors clipped at the edges. */
function getOpenPileZoom(viewport: HTMLElement) {
  const { cell, row } = getMetrics(viewport);
  const band = getPileVisibleBand(viewport);
  if (!(cell > 0) || !(row > 0)) return getMaxPileZoom(viewport);

  const byWidth = (band.width * OPEN_CARD_WIDTH_RATIO) / cell;
  const byHeight = (band.height * OPEN_CARD_HEIGHT_RATIO) / row;
  return clampZoom(viewport, Math.min(byWidth, byHeight));
}

function pickRandomFocusCell() {
  const diameter = OPEN_FOCUS_RADIUS * 2 + 1;
  const col = Math.floor(Math.random() * diameter) - OPEN_FOCUS_RADIUS;
  const row = Math.floor(Math.random() * diameter) - OPEN_FOCUS_RADIUS;
  return { col, row };
}

function getMinZoomOutCounts(viewport: HTMLElement) {
  if (getPileFormFactor(viewport) === "tablet") {
    return {
      columns: TABLET_MIN_ZOOM_OUT_COLUMNS,
      rows: TABLET_MIN_ZOOM_OUT_ROWS,
    };
  }

  return {
    columns: MIN_ZOOM_OUT_COLUMNS,
    rows: MIN_ZOOM_OUT_ROWS,
  };
}

function getPileVisibleBand(viewport: HTMLElement) {
  const viewportRect = viewport.getBoundingClientRect();
  let top = 0;
  let bottom = viewport.clientHeight;

  const header = document.querySelector<HTMLElement>(".pile-header-enter");
  if (header) {
    const headerRect = header.getBoundingClientRect();
    if (headerRect.height > 0) {
      top = Math.max(top, headerRect.bottom - viewportRect.top);
    }
  }

  const nav = document.querySelector<HTMLElement>(".bottom-nav.bottom-nav--pile");
  if (nav) {
    const navRect = nav.getBoundingClientRect();
    if (navRect.height > 0) {
      bottom = Math.min(bottom, navRect.top - viewportRect.top);
    }
  } else {
    const feedRoot = viewport.closest(".browse-feed--toy-pile");
    if (feedRoot) {
      const stackHeight = parseFloat(
        getComputedStyle(feedRoot).getPropertyValue("--pile-nav-stack-height"),
      );
      if (stackHeight > 0) {
        bottom = viewport.clientHeight - stackHeight;
      }
    }
  }

  const height = bottom <= top ? viewport.clientHeight : bottom - top;

  return {
    width: viewport.clientWidth,
    height,
    centerX: viewport.clientWidth / 2,
    centerY: top + height / 2,
  };
}

function getMinPileZoom(viewport: HTMLElement) {
  const { colStride, rowStride } = getMetrics(viewport);
  const band = getPileVisibleBand(viewport);
  const { columns, rows } = getMinZoomOutCounts(viewport);
  return Math.max(
    band.width / (columns * colStride),
    band.height / (rows * rowStride),
  );
}

function getZoomBounds(viewport: HTMLElement) {
  const maxZoom = getMaxPileZoom(viewport);
  if (!isPileZoomEnabled(viewport)) {
    return { minZoom: maxZoom, maxZoom };
  }

  const minZoom = getMinPileZoom(viewport);
  return {
    minZoom: Math.min(minZoom, maxZoom),
    maxZoom: Math.max(maxZoom, minZoom),
  };
}

function clampZoom(viewport: HTMLElement, value: number) {
  const { minZoom, maxZoom } = getZoomBounds(viewport);
  return Math.min(maxZoom, Math.max(minZoom, value));
}

/**
 * Ulam-style spiral index from absolute cell coords.
 * (0,0)=0, then right → up → left → down, delaying duplicates near the center.
 */
function spiralIndex(col: number, row: number): number {
  if (col === 0 && row === 0) return 0;
  const layer = Math.max(Math.abs(col), Math.abs(row));
  const prevMax = (2 * (layer - 1) + 1) ** 2;
  const t = 2 * layer;
  if (col === layer && row > -layer) {
    return prevMax + (row - (1 - layer));
  }
  if (row === layer && col < layer) {
    return prevMax + t + (layer - col) - 1;
  }
  if (col === -layer && row < layer) {
    return prevMax + 2 * t + (layer - row) - 1;
  }
  return prevMax + 3 * t + (col + layer) - 1;
}

function dedupeToys(toys: Toy[]) {
  const seen = new Set<string>();
  const unique: Toy[] = [];
  for (const toy of toys) {
    if (seen.has(toy.id)) continue;
    seen.add(toy.id);
    unique.push(toy);
  }
  return unique;
}

function pointerDistance(a: StagePoint, b: StagePoint) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

function getPileFocusCenter(viewport: HTMLElement) {
  const band = getPileVisibleBand(viewport);
  return {
    x: band.centerX,
    y: band.centerY,
  };
}

function getCardStageCenterFromLayout(
  viewport: HTMLElement,
  card: Element,
  zoom = 1,
): StagePoint | null {
  const stage = viewport.querySelector<HTMLElement>(".toy-pile-stage");
  if (!stage || !(zoom > 0)) return null;

  const cardRect = card.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  // getBoundingClientRect is screen-space; convert back to unscaled stage coords.
  return {
    x: (cardRect.left + cardRect.width / 2 - stageRect.left) / zoom,
    y: (cardRect.top + cardRect.height / 2 - stageRect.top) / zoom,
  };
}

function panToFocusPoint(
  viewport: HTMLElement,
  stage: StagePoint,
  zoom: number,
  focus = getPileFocusCenter(viewport),
): Pan {
  return {
    x: focus.x - stage.x * zoom,
    y: focus.y - stage.y * zoom,
  };
}

function getGridPadding(grid: HTMLElement) {
  const style = getComputedStyle(grid);
  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}

function getCellStageCenter(
  viewport: HTMLElement,
  col: number,
  row: number,
  colMin: number,
  rowMin: number,
) {
  const grid = viewport.querySelector<HTMLElement>(".toy-pile-grid");
  const { cell, row: rowH, colStride, rowStride } = getMetrics(viewport);
  const padding = grid
    ? getGridPadding(grid)
    : { top: 0, left: 0 };
  const relCol = col - colMin;
  const relRow = row - rowMin;
  const colShift = relCol % 2 === 1 ? 0.5 : 0;

  return {
    x: padding.left + relCol * colStride + cell / 2,
    y: padding.top + relRow * rowStride + rowH / 2 + colShift * rowStride,
  };
}

function windowAroundFocus(
  focus: { col: number; row: number },
  colMin: number,
  rowMin: number,
  colCount: number,
  rowCount: number,
  pad = OPEN_FOCUS_PAD,
): CellWindow {
  return {
    c0: Math.max(colMin, focus.col - pad),
    c1: Math.min(colMin + colCount - 1, focus.col + pad),
    r0: Math.max(rowMin, focus.row - pad),
    r1: Math.min(rowMin + rowCount - 1, focus.row + pad),
  };
}

function getInitialPileView(
  viewport: HTMLElement,
  colMin: number,
  rowMin: number,
  focus: { col: number; row: number },
) {
  const zoom = getOpenPileZoom(viewport);
  // Use grid math (not transformed layout rects) so framing stays correct at any zoom.
  const lock = getCellStageCenter(
    viewport,
    focus.col,
    focus.row,
    colMin,
    rowMin,
  );

  return {
    zoom,
    pan: panToFocusPoint(viewport, lock, zoom),
    focus,
  };
}

function getCardStageCenter(
  viewport: HTMLElement,
  card: Element,
  pan: Pan,
  zoom: number,
): StagePoint {
  const viewportRect = viewport.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const cx = cardRect.left + cardRect.width / 2 - viewportRect.left;
  const cy = cardRect.top + cardRect.height / 2 - viewportRect.top;
  return {
    x: (cx - pan.x) / zoom,
    y: (cy - pan.y) / zoom,
  };
}

function findToyLinkAtClientPoint(clientX: number, clientY: number) {
  const target = document.elementFromPoint(clientX, clientY);
  return target?.closest('a[href^="/toy/"]') as HTMLAnchorElement | null;
}

function findCardAtClientPoint(viewport: HTMLElement, clientX: number, clientY: number) {
  const target = document.elementFromPoint(clientX, clientY);
  return target?.closest(".toy-pile-card") ?? null;
}

function findNearestCard(viewport: HTMLElement, clientX: number, clientY: number) {
  const direct = findCardAtClientPoint(viewport, clientX, clientY);
  if (direct) return direct;

  const cards = viewport.querySelectorAll(".toy-pile-card");
  let bestEl: Element | null = null;
  let bestDist = Infinity;

  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(clientX - cx, clientY - cy);
    if (dist < bestDist) {
      bestDist = dist;
      bestEl = card;
    }
  }

  return bestEl;
}

function computeVisibleWindow(
  viewport: HTMLElement,
  pan: Pan,
  zoom: number,
  colMin: number,
  rowMin: number,
  colCount: number,
  rowCount: number,
): CellWindow {
  const { colStride, rowStride } = getMetrics(viewport);
  const grid = viewport.querySelector<HTMLElement>(".toy-pile-grid");
  const padding = grid
    ? getGridPadding(grid)
    : { top: 24, right: 16, bottom: 40, left: 16 };

  // Stage space maps to *relative* grid indices (col - colMin), not absolute spiral coords.
  const viewLeft = -pan.x / zoom;
  const viewTop = -pan.y / zoom;
  const viewRight = viewLeft + viewport.clientWidth / zoom;
  const viewBottom = viewTop + viewport.clientHeight / zoom;

  const minRelCol =
    Math.floor((viewLeft - padding.left) / colStride) - CULL_PAD_CELLS;
  const maxRelCol =
    Math.ceil((viewRight - padding.left) / colStride) + CULL_PAD_CELLS;
  const minRelRow =
    Math.floor((viewTop - padding.top) / rowStride) - CULL_PAD_CELLS;
  const maxRelRow =
    Math.ceil((viewBottom - padding.top) / rowStride) + CULL_PAD_CELLS;

  const c0 = Math.max(colMin, colMin + minRelCol);
  const c1 = Math.min(colMin + colCount - 1, colMin + maxRelCol);
  const r0 = Math.max(rowMin, rowMin + minRelRow);
  const r1 = Math.min(rowMin + rowCount - 1, rowMin + maxRelRow);

  // Never cull to an empty set — keep a seed window around the spiral origin.
  if (c1 < c0 || r1 < r0 || !(colStride > 0) || !(rowStride > 0)) {
    const midC = Math.min(
      colMin + colCount - 1,
      Math.max(colMin, 0),
    );
    const midR = Math.min(
      rowMin + rowCount - 1,
      Math.max(rowMin, 0),
    );
    return {
      c0: Math.max(colMin, midC - 1),
      c1: Math.min(colMin + colCount - 1, midC + 1),
      r0: Math.max(rowMin, midR - 1),
      r1: Math.min(rowMin + rowCount - 1, midR + 1),
    };
  }

  return { c0, c1, r0, r1 };
}

function toyForCell(col: number, row: number, ordered: Toy[]) {
  return ordered[spiralIndex(col, row) % ordered.length]!;
}

export function ToyPileGrid({ toys, showText, filterSeed }: Props) {
  const router = useRouter();
  const [colMin, setColMin] = useState(INITIAL_ORIGIN);
  const [rowMin, setRowMin] = useState(INITIAL_ORIGIN);
  const [colCount, setColCount] = useState(INITIAL_SPAN);
  const [rowCount, setRowCount] = useState(INITIAL_SPAN);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const [visibleWindow, setVisibleWindow] = useState<CellWindow>({
    c0: INITIAL_ORIGIN,
    c1: INITIAL_ORIGIN + INITIAL_SPAN - 1,
    r0: INITIAL_ORIGIN,
    r1: INITIAL_ORIGIN + INITIAL_SPAN - 1,
  });
  const [ordered, setOrdered] = useState<Toy[]>([]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<Pan>({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const dragRef = useRef<DragState | null>(null);
  const dragMovedRef = useRef(false);
  const hadMultiTouchRef = useRef(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    dist: number;
    zoom: number;
    lock: StagePoint;
    focus: StagePoint;
  } | null>(null);
  const wheelLockRef = useRef<{ lock: StagePoint; focus: StagePoint } | null>(
    null,
  );
  const wheelLockTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const visibleRafRef = useRef<number | null>(null);
  const centeredRef = useRef(false);
  const focusCellRef = useRef<{ col: number; row: number } | null>(null);
  const expandCooldownRef = useRef(0);
  const expandLockRef = useRef(false);
  const colCountRef = useRef(colCount);
  const rowCountRef = useRef(rowCount);
  const colMinRef = useRef(colMin);
  const rowMinRef = useRef(rowMin);
  const orderedMetaRef = useRef<{ seed: number; ids: Set<string> }>({
    seed: -1,
    ids: new Set(),
  });

  colCountRef.current = colCount;
  rowCountRef.current = rowCount;
  colMinRef.current = colMin;
  rowMinRef.current = rowMin;

  // Unique-first order: reshuffle on filter change; append new pages without reshuffling.
  useEffect(() => {
    const unique = dedupeToys(toys);
    const meta = orderedMetaRef.current;

    if (meta.seed !== filterSeed) {
      orderedMetaRef.current = {
        seed: filterSeed,
        ids: new Set(unique.map((toy) => toy.id)),
      };
      setOrdered(shuffleWithSeed(unique, filterSeed));
      return;
    }

    if (unique.length < meta.ids.size) {
      orderedMetaRef.current = {
        seed: filterSeed,
        ids: new Set(unique.map((toy) => toy.id)),
      };
      setOrdered(shuffleWithSeed(unique, filterSeed));
      return;
    }

    const newcomers = unique.filter((toy) => !meta.ids.has(toy.id));
    if (newcomers.length === 0) return;

    const appendSeed = (filterSeed + meta.ids.size * 9973) >>> 0;
    const shuffledNew = shuffleWithSeed(newcomers, appendSeed);
    for (const toy of shuffledNew) meta.ids.add(toy.id);
    setOrdered((prev) => [...prev, ...shuffledNew]);
  }, [toys, filterSeed]);

  // Fresh bounds when filters change so the spiral centers on the new set.
  useEffect(() => {
    setColMin(INITIAL_ORIGIN);
    setRowMin(INITIAL_ORIGIN);
    setColCount(INITIAL_SPAN);
    setRowCount(INITIAL_SPAN);
    colCountRef.current = INITIAL_SPAN;
    rowCountRef.current = INITIAL_SPAN;
    colMinRef.current = INITIAL_ORIGIN;
    rowMinRef.current = INITIAL_ORIGIN;
    centeredRef.current = false;
    focusCellRef.current = null;
  }, [filterSeed]);

  const syncVisibleWindow = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const next = computeVisibleWindow(
      viewport,
      panRef.current,
      zoomRef.current,
      colMinRef.current,
      rowMinRef.current,
      colCountRef.current,
      rowCountRef.current,
    );
    setVisibleWindow((prev) =>
      prev.c0 === next.c0 &&
      prev.c1 === next.c1 &&
      prev.r0 === next.r0 &&
      prev.r1 === next.r1
        ? prev
        : next,
    );
  }, []);

  const scheduleVisibleWindow = useCallback(() => {
    if (visibleRafRef.current !== null) return;
    visibleRafRef.current = requestAnimationFrame(() => {
      visibleRafRef.current = null;
      syncVisibleWindow();
    });
  }, [syncVisibleWindow]);

  const applyStageTransform = useCallback(
    (nextPan: Pan, nextZoom: number) => {
      panRef.current = nextPan;
      zoomRef.current = nextZoom;
      const stage = stageRef.current;
      if (stage) {
        stage.style.transform = `translate3d(${nextPan.x}px, ${nextPan.y}px, 0) scale(${nextZoom})`;
      }
      scheduleVisibleWindow();
    },
    [scheduleVisibleWindow],
  );

  const syncTransformState = useCallback(() => {
    setPan({ ...panRef.current });
    setZoom(zoomRef.current);
    syncVisibleWindow();
  }, [syncVisibleWindow]);

  const commitTransform = useCallback(
    (nextPan: Pan, nextZoom: number) => {
      applyStageTransform(nextPan, nextZoom);
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        syncTransformState();
      });
    },
    [applyStageTransform, syncTransformState],
  );

  const resolveStageLock = useCallback(
    (viewport: HTMLElement, clientX: number, clientY: number): StagePoint => {
      const card = findNearestCard(viewport, clientX, clientY);
      if (card) {
        return getCardStageCenter(viewport, card, panRef.current, zoomRef.current);
      }

      const viewportRect = viewport.getBoundingClientRect();
      const px = clientX - viewportRect.left;
      const py = clientY - viewportRect.top;
      const nextZoom = zoomRef.current;
      return {
        x: (px - panRef.current.x) / nextZoom,
        y: (py - panRef.current.y) / nextZoom,
      };
    },
    [],
  );

  const zoomToLockedPoint = useCallback(
    (
      targetZoom: number,
      lock: StagePoint,
      live = false,
      /** Screen point (viewport-local) that should stay fixed — defaults to lock’s current screen pos. */
      focusScreen?: StagePoint,
    ) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const clamped = clampZoom(viewport, targetZoom);
      const prevZoom = zoomRef.current;
      if (Math.abs(clamped - prevZoom) < 0.0001 && !live) return;

      // Keep the lock under the pinch/cursor — never re-center the viewport.
      const focus = focusScreen ?? {
        x: panRef.current.x + lock.x * prevZoom,
        y: panRef.current.y + lock.y * prevZoom,
      };
      const nextPan = panToFocusPoint(viewport, lock, clamped, focus);
      if (live) {
        applyStageTransform(nextPan, clamped);
        return;
      }

      commitTransform(nextPan, clamped);
    },
    [applyStageTransform, commitTransform],
  );

  const shiftPan = useCallback(
    (dx: number, dy: number) => {
      commitTransform(
        {
          x: panRef.current.x + dx,
          y: panRef.current.y + dy,
        },
        zoomRef.current,
      );
    },
    [commitTransform],
  );

  const navigateToToyAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      const link = findToyLinkAtClientPoint(clientX, clientY);
      if (link) {
        const href = link.getAttribute("href");
        if (href) {
          beginRouteChange();
          router.push(href);
          return;
        }
      }

      const viewport = viewportRef.current;
      if (!viewport) return;

      const card = findCardAtClientPoint(viewport, clientX, clientY);
      const toyId = card?.getAttribute("data-toy-id");
      if (toyId) {
        beginRouteChange();
        router.push(`/toy/${toyId}`);
      }
    },
    [router],
  );

  const maybeExpand = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || expandLockRef.current || ordered.length === 0) return;
    if (Date.now() - expandCooldownRef.current < EXPAND_COOLDOWN_MS) return;

    const scale = zoomRef.current;
    const { gap, colStride, rowStride } = getMetrics(viewport);
    const chunkPxX = MIN_CHUNK * colStride * scale;
    const chunkPxY = MIN_CHUNK * rowStride * scale;
    const { x, y } = panRef.current;
    const band = getPileVisibleBand(viewport);
    let cols = colCountRef.current;
    let rows = rowCountRef.current;
    const gridW = cols * colStride - gap;
    const gridH = rows * rowStride - gap;

    const viewLeft = -x / scale;
    const viewTop = -y / scale;
    const viewRight = viewLeft + band.width / scale;
    const viewBottom = viewTop + band.height / scale;

    let expanded = false;
    let shiftX = 0;
    let shiftY = 0;

    if (viewLeft < EDGE_THRESHOLD) {
      setColMin((min) => min - MIN_CHUNK);
      colMinRef.current -= MIN_CHUNK;
      cols += MIN_CHUNK;
      colCountRef.current = cols;
      setColCount(cols);
      shiftX -= chunkPxX;
      expanded = true;
    }
    if (viewTop < EDGE_THRESHOLD) {
      setRowMin((min) => min - MIN_CHUNK);
      rowMinRef.current -= MIN_CHUNK;
      rows += MIN_CHUNK;
      rowCountRef.current = rows;
      setRowCount(rows);
      shiftY -= chunkPxY;
      expanded = true;
    }
    if (viewRight > gridW - EDGE_THRESHOLD) {
      cols += MIN_CHUNK;
      colCountRef.current = cols;
      setColCount(cols);
      expanded = true;
    }
    if (viewBottom > gridH - EDGE_THRESHOLD) {
      rows += MIN_CHUNK;
      rowCountRef.current = rows;
      setRowCount(rows);
      expanded = true;
    }

    if (!expanded) return;

    if (shiftX !== 0 || shiftY !== 0) {
      shiftPan(shiftX, shiftY);
    } else {
      scheduleVisibleWindow();
    }

    expandLockRef.current = true;
    expandCooldownRef.current = Date.now();
    window.setTimeout(() => {
      expandLockRef.current = false;
    }, EXPAND_COOLDOWN_MS);
  }, [ordered.length, scheduleVisibleWindow, shiftPan]);

  // Size cells like regular feed cards (px — % tracks collapse on max-content grids).
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || ordered.length === 0) return;

    applyFeedCardMetrics(viewport, showText);

    if (!centeredRef.current) {
      const focus = focusCellRef.current ?? pickRandomFocusCell();
      focusCellRef.current = focus;
      // Ensure the focus card (and neighbors) are mounted before framing.
      setVisibleWindow(
        windowAroundFocus(
          focus,
          colMinRef.current,
          rowMinRef.current,
          colCountRef.current,
          rowCountRef.current,
        ),
      );
      const opening = getInitialPileView(
        viewport,
        colMinRef.current,
        rowMinRef.current,
        focus,
      );
      commitTransform(opening.pan, opening.zoom);
      centeredRef.current = true;

      // Refine metrics after paint, then re-frame the same random card.
      const raf = requestAnimationFrame(() => {
        applyFeedCardMetrics(viewport, showText);
        const refined = getInitialPileView(
          viewport,
          colMinRef.current,
          rowMinRef.current,
          focus,
        );
        commitTransform(refined.pan, refined.zoom);
      });
      return () => cancelAnimationFrame(raf);
    }

    scheduleVisibleWindow();
    const raf = requestAnimationFrame(() => {
      applyFeedCardMetrics(viewport, showText);
      scheduleVisibleWindow();
    });
    return () => cancelAnimationFrame(raf);
  }, [showText, ordered.length, scheduleVisibleWindow, commitTransform]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onResize = () => {
      applyFeedCardMetrics(viewport, showText);
      setZoomEnabled(isPileZoomEnabled(viewport));

      const clamped = clampZoom(viewport, zoomRef.current);
      if (clamped !== zoomRef.current) {
        const lock = {
          x: (viewport.clientWidth / 2 - panRef.current.x) / zoomRef.current,
          y: (viewport.clientHeight / 2 - panRef.current.y) / zoomRef.current,
        };
        zoomToLockedPoint(clamped, lock);
      } else {
        scheduleVisibleWindow();
      }
    };

    const observer = new ResizeObserver(onResize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [scheduleVisibleWindow, showText, zoomToLockedPoint]);

  useEffect(() => {
    return () => {
      if (wheelLockTimerRef.current !== null) {
        window.clearTimeout(wheelLockTimerRef.current);
      }
      if (visibleRafRef.current !== null) {
        cancelAnimationFrame(visibleRafRef.current);
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const syncPinch = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isPileZoomEnabled(viewport)) return;

    const pointers = [...pointersRef.current.values()];
    if (pointers.length !== 2) {
      pinchRef.current = null;
      return;
    }

    const [a, b] = pointers;
    const dist = pointerDistance(a, b);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;

    const viewportRect = viewport.getBoundingClientRect();
    const focus = {
      x: cx - viewportRect.left,
      y: cy - viewportRect.top,
    };

    if (!pinchRef.current) {
      dragRef.current = null;
      pinchRef.current = {
        dist,
        zoom: zoomRef.current,
        lock: resolveStageLock(viewport, cx, cy),
        focus,
      };
      return;
    }

    const ratio = dist / pinchRef.current.dist;
    // Keep the original pinch midpoint fixed in screen space (no center snap).
    zoomToLockedPoint(
      pinchRef.current.zoom * ratio,
      pinchRef.current.lock,
      true,
      pinchRef.current.focus,
    );
  }, [resolveStageLock, zoomToLockedPoint]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("button")) return;

      dragMovedRef.current = false;
      wheelLockRef.current = null;
      if (wheelLockTimerRef.current !== null) {
        window.clearTimeout(wheelLockTimerRef.current);
        wheelLockTimerRef.current = null;
      }

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size >= 2) {
        hadMultiTouchRef.current = true;
      }

      if (pointersRef.current.size === 2) {
        e.currentTarget.setPointerCapture(e.pointerId);
        syncPinch();
        return;
      }

      if (e.button !== 0) return;

      dragRef.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: panRef.current.x,
        originY: panRef.current.y,
        moved: 0,
        captured: false,
      };
    },
    [syncPinch],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return;

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size >= 2) {
        syncPinch();
        return;
      }

      const drag = dragRef.current;
      if (!drag?.active || drag.pointerId !== e.pointerId) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved >= DRAG_CLICK_THRESHOLD_PX) {
        if (!drag.captured) {
          drag.captured = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        dragMovedRef.current = true;
      }

      if (!drag.captured) return;
      applyStageTransform(
        {
          x: drag.originX + dx,
          y: drag.originY + dy,
        },
        zoomRef.current,
      );
      maybeExpand();
    },
    [applyStageTransform, maybeExpand, syncPinch],
  );

  const endPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      pointersRef.current.delete(e.pointerId);

      if (pointersRef.current.size < 2) {
        pinchRef.current = null;
        syncTransformState();
      }

      const drag = dragRef.current;
      if (drag?.active && drag.pointerId === e.pointerId) {
        if (
          !dragMovedRef.current &&
          !hadMultiTouchRef.current &&
          pointersRef.current.size === 0
        ) {
          navigateToToyAtPoint(e.clientX, e.clientY);
        }
        dragRef.current = null;
        syncTransformState();
        maybeExpand();
      }

      if (pointersRef.current.size === 0) {
        hadMultiTouchRef.current = false;
      }

      if (pointersRef.current.size === 1) {
        const remaining = [...pointersRef.current.entries()][0];
        if (remaining) {
          const [id, point] = remaining;
          dragRef.current = {
            active: true,
            pointerId: id,
            startX: point.x,
            startY: point.y,
            originX: panRef.current.x,
            originY: panRef.current.y,
            moved: 0,
            captured: false,
          };
        }
      }
    },
    [maybeExpand, navigateToToyAtPoint, syncTransformState],
  );

  const onViewportClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const toyLink = (e.target as HTMLElement).closest('a[href^="/toy/"]');
    if (toyLink || dragMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    dragMovedRef.current = false;
  }, []);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const viewport = viewportRef.current;
      if (!viewport) return;

      if (e.ctrlKey || e.metaKey) {
        if (!isPileZoomEnabled(viewport)) return;

        if (!wheelLockRef.current) {
          const viewportRect = viewport.getBoundingClientRect();
          wheelLockRef.current = {
            lock: resolveStageLock(viewport, e.clientX, e.clientY),
            focus: {
              x: e.clientX - viewportRect.left,
              y: e.clientY - viewportRect.top,
            },
          };
        }

        if (wheelLockTimerRef.current !== null) {
          window.clearTimeout(wheelLockTimerRef.current);
        }
        wheelLockTimerRef.current = window.setTimeout(() => {
          wheelLockRef.current = null;
          wheelLockTimerRef.current = null;
        }, WHEEL_LOCK_IDLE_MS);

        const factor = Math.exp(-e.deltaY * 0.0025);
        const { lock, focus } = wheelLockRef.current;
        zoomToLockedPoint(zoomRef.current * factor, lock, false, focus);
        maybeExpand();
        return;
      }

      commitTransform(
        {
          x: panRef.current.x - e.deltaX,
          y: panRef.current.y - e.deltaY,
        },
        zoomRef.current,
      );
      maybeExpand();
    },
    [commitTransform, maybeExpand, resolveStageLock, zoomToLockedPoint],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const visibleCells = useMemo(() => {
    if (ordered.length === 0) return [];
    const { c0, c1, r0, r1 } = visibleWindow;
    if (c1 < c0 || r1 < r0) return [];

    const cells: Array<{ col: number; row: number; toy: Toy; colShift: number }> =
      [];
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const relCol = col - colMin;
        cells.push({
          col,
          row,
          toy: toyForCell(col, row, ordered),
          colShift: relCol % 2 === 1 ? 0.5 : 0,
        });
      }
    }
    return cells;
  }, [ordered, visibleWindow, colMin]);

  if (ordered.length === 0) {
    return (
      <div className="toy-pile-empty scroll-pad-bottom flex flex-1 items-center justify-center px-6">
        <div className="shelf-panel w-full max-w-md">
          <p className="shelf-panel__surface px-6 py-12 text-center text-[var(--ink-soft)]">
            No toys match. Try another search.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={viewportRef}
        className={`toy-pile-viewport scroll-pad-bottom min-h-0 flex-1${
          showText ? " toy-pile-viewport--text" : ""
        }`}
        aria-label={
          zoomEnabled
            ? "Toy grid — drag to explore, pinch to zoom"
            : "Toy grid — drag to explore"
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onClickCapture={onViewportClickCapture}
      >
        <div
          ref={stageRef}
          className="toy-pile-stage"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
        >
          <div
            className="toy-pile-grid"
            style={
              {
                "--pile-cols": colCount,
                "--pile-rows": rowCount,
              } as React.CSSProperties
            }
          >
            {visibleCells.map(({ col, row, toy, colShift }) => (
              <ToyPileCard
                key={`pile-${col}-${row}`}
                col={col}
                row={row}
                relCol={col - colMin}
                relRow={row - rowMin}
                toy={toy}
                showText={showText}
                colShift={colShift}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const ToyPileCard = memo(function ToyPileCard({
  col,
  row,
  relCol,
  relRow,
  toy,
  showText,
  colShift = 0,
}: {
  col: number;
  row: number;
  relCol: number;
  relRow: number;
  toy: Toy;
  showText: boolean;
  colShift?: number;
}) {
  return (
    <div
      className="toy-pile-card"
      data-pile-col={col}
      data-pile-row={row}
      data-toy-id={toy.id}
      style={
        {
          gridColumn: relCol + 1,
          gridRow: relRow + 1,
          "--pile-col-shift": colShift,
        } as React.CSSProperties
      }
    >
      <FeedCard
        toy={toy}
        showText={showText}
        photoLoading="lazy"
        className="w-full"
      />
    </div>
  );
});
