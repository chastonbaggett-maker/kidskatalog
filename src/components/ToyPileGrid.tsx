"use client";

import Link from "next/link";
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
import { ToyPhoto } from "./ToyPhoto";
import { useAccentStore } from "@/lib/accent-store";
import { beginRouteChange } from "@/lib/route-change";

const WHEEL_LOCK_IDLE_MS = 180;
const DRAG_CLICK_THRESHOLD_PX = 8;
/** Mobile focus card width as a fraction of the visible pile band — also caps max zoom. */
const INITIAL_CENTER_CARD_WIDTH_RATIO = 0.64;
/** Visible grid span at min zoom on the reference mobile band. */
const MIN_ZOOM_OUT_COLUMNS = 3;
const MIN_ZOOM_OUT_ROWS = 6;
/** Tablet max zoom-out reference — ~6 columns × ~4.5 rows in the visible band. */
const TABLET_MIN_ZOOM_OUT_COLUMNS = 6;
const TABLET_MIN_ZOOM_OUT_ROWS = 4.5;
/** Tablet max zoom-in reference — ~3 columns × ~2.5 rows in the visible band. */
const TABLET_MAX_ZOOM_IN_COLUMNS = 3;
const TABLET_MAX_ZOOM_IN_ROWS = 2.5;
/** Desktop locked view — roughly 25 cards (5×5) in the visible band. */
const DESKTOP_VISIBLE_COLUMNS = 5;
const DESKTOP_VISIBLE_ROWS = 5;
const TABLET_MIN_WIDTH_PX = 640;
const DESKTOP_MIN_WIDTH_PX = 1024;

type Props = {
  toys: Toy[];
  showText: boolean;
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

function getMetrics(viewport: HTMLElement) {
  const cell = parseFloat(getComputedStyle(viewport).getPropertyValue("--pile-cell")) || 160;
  const gap = parseFloat(getComputedStyle(viewport).getPropertyValue("--pile-gap")) || 14;
  return { cell, gap, stride: cell + gap };
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

function getMaxPileZoom(viewport: HTMLElement) {
  const { cell, stride } = getMetrics(viewport);
  const band = getPileVisibleBand(viewport);
  const formFactor = getPileFormFactor(viewport);

  if (formFactor === "desktop") {
    return Math.max(
      band.width / (DESKTOP_VISIBLE_COLUMNS * stride),
      band.height / (DESKTOP_VISIBLE_ROWS * stride),
    );
  }

  if (formFactor === "tablet") {
    return Math.max(
      band.width / (TABLET_MAX_ZOOM_IN_COLUMNS * stride),
      band.height / (TABLET_MAX_ZOOM_IN_ROWS * stride),
    );
  }

  return (band.width * INITIAL_CENTER_CARD_WIDTH_RATIO) / cell;
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
  const { stride } = getMetrics(viewport);
  const band = getPileVisibleBand(viewport);
  const { columns, rows } = getMinZoomOutCounts(viewport);
  return Math.max(
    band.width / (columns * stride),
    band.height / (rows * stride),
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

/** One unique card per toy — finite shelf, no recycling. */
function layoutUniquePile(pool: Toy[]) {
  const n = pool.length;
  if (n === 0) {
    return {
      colCount: 0,
      rowCount: 0,
      cells: [] as Array<{ col: number; row: number; toy: Toy }>,
    };
  }

  // Slightly wider than tall so the pile reads like a shelf, not a tower.
  const colCount = Math.max(1, Math.ceil(Math.sqrt(n * 1.15)));
  const rowCount = Math.ceil(n / colCount);
  const cells = pool.map((toy, index) => ({
    col: index % colCount,
    row: Math.floor(index / colCount),
    toy,
  }));

  return { colCount, rowCount, cells };
}

function pointerDistance(a: StagePoint, b: StagePoint) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

function intersectionArea(a: DOMRect, b: DOMRect) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

function getPileFocusCenter(viewport: HTMLElement) {
  const band = getPileVisibleBand(viewport);
  return {
    x: band.centerX,
    y: band.centerY,
  };
}

function getCardStageCenterFromLayout(viewport: HTMLElement, card: Element): StagePoint | null {
  const stage = viewport.querySelector<HTMLElement>(".toy-pile-stage");
  if (!stage) return null;

  const cardRect = card.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();

  return {
    x: cardRect.left + cardRect.width / 2 - stageRect.left,
    y: cardRect.top + cardRect.height / 2 - stageRect.top,
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

/** Stage-space size of the card grid, including stagger overhang on odd columns. */
function getPileContentSize(
  viewport: HTMLElement,
  colCount: number,
  rowCount: number,
) {
  const { cell, gap, stride } = getMetrics(viewport);
  const grid = viewport.querySelector<HTMLElement>(".toy-pile-grid");
  const padding = grid
    ? getGridPadding(grid)
    : { top: 24, right: 16, bottom: 40, left: 16 };
  const cols = Math.max(0, colCount);
  const rows = Math.max(0, rowCount);

  return {
    width:
      padding.left +
      padding.right +
      cols * cell +
      Math.max(0, cols - 1) * gap,
    // Odd columns are shifted down by half a stride via transform (not in layout).
    height:
      padding.top +
      padding.bottom +
      rows * cell +
      Math.max(0, rows - 1) * gap +
      stride * 0.5,
  };
}

/**
 * Keep the visible pile band over card content — hit a wall at empty edges.
 * If the grid is smaller than the band, pin it centered in the band.
 */
function clampPanToContent(
  viewport: HTMLElement,
  pan: Pan,
  zoom: number,
  contentW: number,
  contentH: number,
): Pan {
  if (contentW <= 0 || contentH <= 0 || zoom <= 0) return pan;

  const band = getPileVisibleBand(viewport);
  const bandLeft = 0;
  const bandRight = band.width;
  const bandTop = band.centerY - band.height / 2;
  const bandBottom = band.centerY + band.height / 2;

  const scaledW = contentW * zoom;
  const scaledH = contentH * zoom;
  const bandW = bandRight - bandLeft;
  const bandH = bandBottom - bandTop;

  let x = pan.x;
  let y = pan.y;

  if (scaledW <= bandW) {
    x = bandLeft + (bandW - scaledW) / 2;
  } else {
    const minX = bandRight - scaledW;
    const maxX = bandLeft;
    x = Math.min(maxX, Math.max(minX, x));
  }

  if (scaledH <= bandH) {
    y = bandTop + (bandH - scaledH) / 2;
  } else {
    const minY = bandBottom - scaledH;
    const maxY = bandTop;
    y = Math.min(maxY, Math.max(minY, y));
  }

  return { x, y };
}

function getCellStageCenter(
  viewport: HTMLElement,
  col: number,
  row: number,
  colMin: number,
  rowMin: number,
) {
  const grid = viewport.querySelector<HTMLElement>(".toy-pile-grid");
  const { cell, stride } = getMetrics(viewport);
  const padding = grid
    ? getGridPadding(grid)
    : { top: 0, left: 0 };
  const relCol = col - colMin;
  const relRow = row - rowMin;
  const colShift = relCol % 2 === 1 ? 0.5 : 0;

  return {
    x: padding.left + relCol * stride + cell / 2,
    y: padding.top + relRow * stride + cell / 2 + colShift * stride,
  };
}

function getInitialPileView(
  viewport: HTMLElement,
  colCount: number,
  rowCount: number,
  colMin: number,
  rowMin: number,
) {
  const zoom = clampZoom(viewport, getMaxPileZoom(viewport));
  const centerCol = colMin + Math.floor(colCount / 2);
  const centerRow = rowMin + Math.floor(rowCount / 2);
  const centerCard = viewport.querySelector(
    `[data-pile-col="${centerCol}"][data-pile-row="${centerRow}"]`,
  );
  const lock =
    (centerCard && getCardStageCenterFromLayout(viewport, centerCard)) ||
    getCellStageCenter(viewport, centerCol, centerRow, colMin, rowMin);

  return {
    zoom,
    pan: panToFocusPoint(viewport, lock, zoom),
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

export function ToyPileGrid({ toys, showText }: Props) {
  const router = useRouter();
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [zoomEnabled, setZoomEnabled] = useState(true);

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
  const centeredRef = useRef(false);
  const colCountRef = useRef(0);
  const rowCountRef = useRef(0);

  const pool = useMemo(() => {
    const seen = new Set<string>();
    const unique: Toy[] = [];
    for (const toy of toys) {
      if (seen.has(toy.id)) continue;
      seen.add(toy.id);
      unique.push(toy);
    }
    return unique;
  }, [toys]);

  const { colCount, rowCount, cells } = useMemo(
    () => layoutUniquePile(pool),
    [pool],
  );

  colCountRef.current = colCount;
  rowCountRef.current = rowCount;

  const poolKey = useMemo(() => pool.map((toy) => toy.id).join("\0"), [pool]);

  const applyStageTransform = useCallback((nextPan: Pan, nextZoom: number) => {
    const viewport = viewportRef.current;
    let clampedPan = nextPan;
    if (viewport) {
      const { width, height } = getPileContentSize(
        viewport,
        colCountRef.current,
        rowCountRef.current,
      );
      clampedPan = clampPanToContent(
        viewport,
        nextPan,
        nextZoom,
        width,
        height,
      );
    }
    panRef.current = clampedPan;
    zoomRef.current = nextZoom;
    const stage = stageRef.current;
    if (stage) {
      stage.style.transform = `translate3d(${clampedPan.x}px, ${clampedPan.y}px, 0) scale(${nextZoom})`;
    }
  }, []);

  const syncTransformState = useCallback(() => {
    setPan({ ...panRef.current });
    setZoom(zoomRef.current);
  }, []);

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
      const zoom = zoomRef.current;
      return {
        x: (px - panRef.current.x) / zoom,
        y: (py - panRef.current.y) / zoom,
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

  // Re-center when the unique toy set changes (filters / search).
  useEffect(() => {
    centeredRef.current = false;
  }, [poolKey]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || centeredRef.current || colCount === 0 || rowCount === 0) {
      return;
    }

    const { pan, zoom } = getInitialPileView(
      viewport,
      colCount,
      rowCount,
      0,
      0,
    );
    commitTransform(pan, zoom);
    centeredRef.current = true;
  }, [colCount, rowCount, poolKey, commitTransform]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onResize = () => {
      setZoomEnabled(isPileZoomEnabled(viewport));

      const clamped = clampZoom(viewport, zoomRef.current);
      if (clamped !== zoomRef.current) {
        const lock = {
          x: (viewport.clientWidth / 2 - panRef.current.x) / zoomRef.current,
          y: (viewport.clientHeight / 2 - panRef.current.y) / zoomRef.current,
        };
        zoomToLockedPoint(clamped, lock);
      }
    };

    const observer = new ResizeObserver(onResize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [zoomToLockedPoint]);

  useEffect(() => {
    return () => {
      if (wheelLockTimerRef.current !== null) {
        window.clearTimeout(wheelLockTimerRef.current);
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
      // Absorb overscroll against the wall so reversing doesn't feel sticky.
      drag.originX = panRef.current.x - dx;
      drag.originY = panRef.current.y - dy;
    },
    [applyStageTransform, syncPinch],
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
    [navigateToToyAtPoint, syncTransformState],
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
        return;
      }

      commitTransform(
        {
          x: panRef.current.x - e.deltaX,
          y: panRef.current.y - e.deltaY,
        },
        zoomRef.current,
      );
    },
    [commitTransform, resolveStageLock, zoomToLockedPoint],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  if (pool.length === 0) {
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
        className="toy-pile-viewport scroll-pad-bottom min-h-0 flex-1"
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
            style={{ "--pile-cols": colCount } as React.CSSProperties}
          >
            {cells.map(({ col, row, toy }) => (
              <ToyPileCard
                key={toy.id}
                col={col}
                row={row}
                toy={toy}
                showText={showText}
                colShift={col % 2 === 1 ? 0.5 : 0}
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
  toy,
  showText,
  colShift = 0,
}: {
  col: number;
  row: number;
  toy: Toy;
  showText: boolean;
  colShift?: number;
}) {
  const audience = useAccentStore((s) => s.audience);
  const viewBtnClass =
    audience === "boys"
      ? "bg-[var(--boys-chip)]"
      : audience === "girls"
        ? "bg-[var(--girls-chip)]"
        : "bg-[var(--mint)]";

  return (
    <article
      className="toy-pile-card"
      data-pile-col={col}
      data-pile-row={row}
      data-toy-id={toy.id}
      style={{ "--pile-col-shift": colShift } as React.CSSProperties}
    >
      <div className="toy-pile-card__body transition-transform active:scale-[0.97]">
        <Link
          href={`/toy/${toy.id}`}
          className={`toy-pile-card__media relative block aspect-[4/5] overflow-hidden ${
            showText ? "toy-pile-card__media--with-text" : "toy-pile-card__media--solo"
          }`}
        >
          <ToyPhoto
            src={toy.image}
            alt={toy.imageAlt}
            loading="lazy"
            decoding="async"
            className="toy-pile-card__photo absolute inset-0 h-full w-full object-contain p-2.5 sm:p-3"
          />
        </Link>
        {showText ? (
          <div className="px-2.5 pb-2.5 pt-1 pr-11 sm:px-3 sm:pb-3 sm:pt-2 sm:pr-12">
            <Link href={`/toy/${toy.id}`}>
              <h2 className="truncate font-[family-name:var(--font-display)] text-sm font-bold text-[var(--ink)] sm:text-base">
                {toy.name}
              </h2>
            </Link>
          </div>
        ) : null}
        <Link
          href={`/toy/${toy.id}`}
          aria-label={`View ${toy.name}`}
          className={`toy-pile-card__eye absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md transition active:scale-95 sm:h-10 sm:w-10 ${viewBtnClass}`}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-4 w-4 sm:h-5 sm:w-5">
            <path
              d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.75" fill="currentColor" />
          </svg>
        </Link>
      </div>
    </article>
  );
});
