"use client";

import Image from "next/image";
import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Toy } from "@/types/toy";
import { useAccentStore } from "@/lib/accent-store";
import {
  CRAZY_CARD_FLASH_MS,
  CRAZY_FLASH_INTERVAL_MS,
  preloadImages,
} from "@/lib/crazy-mode-timing";
import { useCrazyLightning } from "@/hooks/useCrazyLightning";

const MIN_CHUNK = 6;
const GRID_VIEW = 6;
const EDGE_THRESHOLD = 220;
const EXPAND_COOLDOWN_MS = 450;
const SNAP_DURATION_MS = 420;
const SNAP_DRAG_THRESHOLD_PX = 10;
const WHEEL_LOCK_IDLE_MS = 180;
/** Focus card width as a fraction of the pile viewport (reference mobile layout). */
const INITIAL_CENTER_CARD_WIDTH_RATIO = 0.64;
/** feed-card uses mx-6 (1.5rem) on each side */
const FEED_CARD_SIDE_INSET_PX = 48;
const CRAZY_MIN_VISIBLE_PX = 8;

type Props = {
  toys: Toy[];
  showText: boolean;
  crazyMode?: boolean;
  crazyBtnRef?: RefObject<HTMLButtonElement | null>;
  onCrazyFlash?: (active: boolean) => void;
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
};

type StagePoint = { x: number; y: number };

function getMetrics(viewport: HTMLElement) {
  const cell = parseFloat(getComputedStyle(viewport).getPropertyValue("--pile-cell")) || 160;
  const gap = parseFloat(getComputedStyle(viewport).getPropertyValue("--pile-gap")) || 14;
  return { cell, gap, stride: cell + gap };
}

function getZoomBounds(viewport: HTMLElement) {
  const { cell, gap, stride } = getMetrics(viewport);
  const { clientWidth, clientHeight } = viewport;
  const feedWidth = Math.max(clientWidth - FEED_CARD_SIDE_INSET_PX, cell);
  const gridSpan = GRID_VIEW * stride - gap;
  const minZoom = Math.min(clientWidth / gridSpan, clientHeight / gridSpan);
  const maxZoom = feedWidth / cell;
  return {
    minZoom: Math.min(minZoom, maxZoom),
    maxZoom: Math.max(maxZoom, minZoom),
  };
}

function clampZoom(viewport: HTMLElement, value: number) {
  const { minZoom, maxZoom } = getZoomBounds(viewport);
  return Math.min(maxZoom, Math.max(minZoom, value));
}

function toyIndexForCell(col: number, row: number, poolLength: number) {
  const hash = ((col * 73856093) ^ (row * 19349663)) >>> 0;
  return hash % poolLength;
}

function pointerDistance(a: StagePoint, b: StagePoint) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
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

  if (bottom <= top) {
    return {
      x: viewport.clientWidth / 2,
      y: viewport.clientHeight / 2,
    };
  }

  return {
    x: viewport.clientWidth / 2,
    y: top + (bottom - top) / 2,
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

function panToCenterStagePoint(
  viewport: HTMLElement,
  stage: StagePoint,
  zoom: number,
): Pan {
  const { clientWidth, clientHeight } = viewport;
  return {
    x: clientWidth / 2 - stage.x * zoom,
    y: clientHeight / 2 - stage.y * zoom,
  };
}

function getGridPadding(grid: HTMLElement) {
  const style = getComputedStyle(grid);
  return {
    top: parseFloat(style.paddingTop) || 0,
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
  const { cell } = getMetrics(viewport);
  const zoom = clampZoom(
    viewport,
    (viewport.clientWidth * INITIAL_CENTER_CARD_WIDTH_RATIO) / cell,
  );
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

function findMostVisibleCard(viewport: HTMLElement) {
  const viewportRect = viewport.getBoundingClientRect();
  const cards = viewport.querySelectorAll(".toy-pile-card");
  let bestEl: Element | null = null;
  let bestArea = 0;

  for (const card of cards) {
    const area = intersectionArea(card.getBoundingClientRect(), viewportRect);
    if (area <= 0) continue;
    if (area > bestArea) {
      bestArea = area;
      bestEl = card;
    }
  }

  return bestEl;
}

function pileCellKey(col: number, row: number) {
  return `${col},${row}`;
}

function isPileCardVisible(card: Element, viewportRect: DOMRect) {
  const surface =
    card.querySelector<HTMLElement>(".toy-pile-card__body") ?? card;
  const rect = surface.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  const left = Math.max(rect.left, viewportRect.left);
  const top = Math.max(rect.top, viewportRect.top);
  const right = Math.min(rect.right, viewportRect.right);
  const bottom = Math.min(rect.bottom, viewportRect.bottom);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  return width >= CRAZY_MIN_VISIBLE_PX && height >= CRAZY_MIN_VISIBLE_PX;
}

function getVisiblePileCells(viewport: HTMLElement) {
  const viewportRect = viewport.getBoundingClientRect();
  const cells: { key: string; toyId: string }[] = [];

  viewport.querySelectorAll(".toy-pile-card").forEach((card) => {
    if (!isPileCardVisible(card, viewportRect)) return;

    const col = card.getAttribute("data-pile-col");
    const row = card.getAttribute("data-pile-row");
    const toyId = card.getAttribute("data-toy-id");
    if (col == null || row == null || toyId == null) return;

    cells.push({ key: pileCellKey(Number(col), Number(row)), toyId });
  });

  return cells;
}

function pickRandomToyId(poolIds: string[], currentId: string, seed: number) {
  if (poolIds.length === 0) return currentId;

  let candidates = poolIds.filter((id) => id !== currentId);
  if (candidates.length === 0) candidates = poolIds;

  const s = (seed * 1664525 + 1013904223) >>> 0;
  return candidates[s % candidates.length]!;
}

/** Pick ~half of visible pile cells, at least one when any are visible. */
function pickHalfVisibleCells(
  cells: { key: string; toyId: string }[],
  seed: number,
) {
  if (cells.length === 0) return [];

  const count = Math.max(1, Math.ceil(cells.length / 2));
  const shuffled = [...cells];
  let s = seed;

  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return shuffled.slice(0, count);
}

function toyForCell(
  col: number,
  row: number,
  pool: Toy[],
  overrides: Map<string, string>,
) {
  const key = pileCellKey(col, row);
  const overrideId = overrides.get(key);
  if (overrideId) {
    const found = pool.find((toy) => toy.id === overrideId);
    if (found) return found;
  }
  return pool[toyIndexForCell(col, row, pool.length)]!;
}

export function ToyPileGrid({
  toys,
  showText,
  crazyMode = false,
  crazyBtnRef,
  onCrazyFlash,
}: Props) {
  const [colMin, setColMin] = useState(0);
  const [rowMin, setRowMin] = useState(0);
  const [colCount, setColCount] = useState(MIN_CHUNK * 3);
  const [rowCount, setRowCount] = useState(MIN_CHUNK * 3);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<Pan>({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const dragRef = useRef<DragState | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    dist: number;
    zoom: number;
    lock: StagePoint;
  } | null>(null);
  const wheelLockRef = useRef<StagePoint | null>(null);
  const wheelLockTimerRef = useRef<number | null>(null);
  const snapAnimRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const centeredRef = useRef(false);
  const expandCooldownRef = useRef(0);
  const expandLockRef = useRef(false);

  const [crazyOverrides, setCrazyOverrides] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [crazyStrikeKeys, setCrazyStrikeKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const crazyFlashCountRef = useRef(0);
  const { flash: flashScreen, portal: crazyFlashPortal } = useCrazyLightning();

  const pool = useMemo(() => (toys.length === 0 ? [] : toys), [toys]);
  const poolIds = useMemo(() => pool.map((toy) => toy.id), [pool]);
  const poolImageById = useMemo(
    () => new Map(pool.map((toy) => [toy.id, toy.image])),
    [pool],
  );
  const slots = colCount * rowCount;

  const cancelSnap = useCallback(() => {
    if (snapAnimRef.current !== null) {
      cancelAnimationFrame(snapAnimRef.current);
      snapAnimRef.current = null;
    }
  }, []);

  const commitTransform = useCallback(
    (nextPan: Pan, nextZoom: number) => {
      panRef.current = nextPan;
      zoomRef.current = nextZoom;
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setPan({ ...panRef.current });
        setZoom(zoomRef.current);
      });
    },
    [],
  );

  const applyTransformImmediate = useCallback((nextPan: Pan, nextZoom: number) => {
    panRef.current = nextPan;
    zoomRef.current = nextZoom;
    setPan({ ...nextPan });
    setZoom(nextZoom);
  }, []);

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

  const zoomToLockedCard = useCallback(
    (targetZoom: number, lock: StagePoint) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const clamped = clampZoom(viewport, targetZoom);
      const prevZoom = zoomRef.current;
      if (Math.abs(clamped - prevZoom) < 0.0001) return;

      commitTransform(panToCenterStagePoint(viewport, lock, clamped), clamped);
    },
    [commitTransform],
  );

  const animateSnapToCard = useCallback(
    (card: Element) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      cancelSnap();

      const zoom = zoomRef.current;
      const lock = getCardStageCenter(viewport, card, panRef.current, zoom);
      const targetPan = panToCenterStagePoint(viewport, lock, zoom);
      const startPan = { ...panRef.current };
      const delta = Math.hypot(targetPan.x - startPan.x, targetPan.y - startPan.y);
      if (delta < 4) return;
      const startTime = performance.now();

      const tick = (now: number) => {
        const t = easeOutCubic(Math.min(1, (now - startTime) / SNAP_DURATION_MS));
        applyTransformImmediate(
          {
            x: startPan.x + (targetPan.x - startPan.x) * t,
            y: startPan.y + (targetPan.y - startPan.y) * t,
          },
          zoom,
        );

        if (t < 1) {
          snapAnimRef.current = requestAnimationFrame(tick);
        } else {
          snapAnimRef.current = null;
        }
      };

      snapAnimRef.current = requestAnimationFrame(tick);
    },
    [applyTransformImmediate, cancelSnap],
  );

  const snapToMostVisible = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const card = findMostVisibleCard(viewport);
    if (!card) return;

    animateSnapToCard(card);
  }, [animateSnapToCard]);

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

  const maybeExpand = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || expandLockRef.current || pool.length === 0) return;
    if (Date.now() - expandCooldownRef.current < EXPAND_COOLDOWN_MS) return;

    const scale = zoomRef.current;
    const { stride } = getMetrics(viewport);
    const chunkPx = MIN_CHUNK * stride * scale;
    const { x, y } = panRef.current;
    const { clientWidth, clientHeight } = viewport;
    const gap = parseFloat(getComputedStyle(viewport).getPropertyValue("--pile-gap")) || 14;
    const gridW = colCount * stride - gap;
    const gridH = rowCount * stride - gap;

    const viewLeft = -x / scale;
    const viewTop = -y / scale;
    const viewRight = viewLeft + clientWidth / scale;
    const viewBottom = viewTop + clientHeight / scale;

    let expanded = false;

    if (viewLeft < EDGE_THRESHOLD) {
      setColMin((min) => min - MIN_CHUNK);
      setColCount((count) => count + MIN_CHUNK);
      shiftPan(-chunkPx, 0);
      expanded = true;
    }
    if (viewTop < EDGE_THRESHOLD) {
      setRowMin((min) => min - MIN_CHUNK);
      setRowCount((count) => count + MIN_CHUNK);
      shiftPan(0, -chunkPx);
      expanded = true;
    }
    if (viewRight > gridW - EDGE_THRESHOLD) {
      setColCount((count) => count + MIN_CHUNK);
      expanded = true;
    }
    if (viewBottom > gridH - EDGE_THRESHOLD) {
      setRowCount((count) => count + MIN_CHUNK);
      expanded = true;
    }

    if (!expanded) return;

    expandLockRef.current = true;
    expandCooldownRef.current = Date.now();
    window.setTimeout(() => {
      expandLockRef.current = false;
    }, EXPAND_COOLDOWN_MS);
  }, [colCount, rowCount, pool.length, shiftPan]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || centeredRef.current) return;

    const { pan, zoom } = getInitialPileView(
      viewport,
      colCount,
      rowCount,
      colMin,
      rowMin,
    );
    commitTransform(pan, zoom);
    centeredRef.current = true;
  }, [colCount, rowCount, colMin, rowMin, commitTransform]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onResize = () => {
      const clamped = clampZoom(viewport, zoomRef.current);
      if (clamped !== zoomRef.current) {
        const card = findMostVisibleCard(viewport);
        const lock = card
          ? getCardStageCenter(viewport, card, panRef.current, zoomRef.current)
          : {
              x: (viewport.clientWidth / 2 - panRef.current.x) / zoomRef.current,
              y: (viewport.clientHeight / 2 - panRef.current.y) / zoomRef.current,
            };
        zoomToLockedCard(clamped, lock);
      }
    };

    const observer = new ResizeObserver(onResize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [zoomToLockedCard]);

  useEffect(() => {
    return () => {
      cancelSnap();
      if (wheelLockTimerRef.current !== null) {
        window.clearTimeout(wheelLockTimerRef.current);
      }
    };
  }, [cancelSnap]);

  const syncPinch = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const pointers = [...pointersRef.current.values()];
    if (pointers.length !== 2) {
      pinchRef.current = null;
      return;
    }

    const [a, b] = pointers;
    const dist = pointerDistance(a, b);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;

    if (!pinchRef.current) {
      cancelSnap();
      dragRef.current = null;
      pinchRef.current = {
        dist,
        zoom: zoomRef.current,
        lock: resolveStageLock(viewport, cx, cy),
      };
      return;
    }

    const ratio = dist / pinchRef.current.dist;
    zoomToLockedCard(pinchRef.current.zoom * ratio, pinchRef.current.lock);
  }, [cancelSnap, resolveStageLock, zoomToLockedCard]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button")) return;

      cancelSnap();
      wheelLockRef.current = null;
      if (wheelLockTimerRef.current !== null) {
        window.clearTimeout(wheelLockTimerRef.current);
        wheelLockTimerRef.current = null;
      }

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture(e.pointerId);

      if (pointersRef.current.size === 2) {
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
      };
    },
    [cancelSnap, syncPinch],
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

      commitTransform(
        {
          x: drag.originX + dx,
          y: drag.originY + dy,
        },
        zoomRef.current,
      );
    },
    [commitTransform, syncPinch],
  );

  const endPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      pointersRef.current.delete(e.pointerId);

      if (pointersRef.current.size < 2) {
        pinchRef.current = null;
      }

      const drag = dragRef.current;
      if (drag?.active && drag.pointerId === e.pointerId) {
        const shouldSnap = drag.moved >= SNAP_DRAG_THRESHOLD_PX;
        dragRef.current = null;
        maybeExpand();
        if (shouldSnap) {
          window.requestAnimationFrame(() => snapToMostVisible());
        }
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
          };
        }
      }
    },
    [maybeExpand, snapToMostVisible],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const viewport = viewportRef.current;
      if (!viewport) return;

      if (e.ctrlKey || e.metaKey) {
        cancelSnap();

        if (!wheelLockRef.current) {
          wheelLockRef.current = resolveStageLock(viewport, e.clientX, e.clientY);
        }

        if (wheelLockTimerRef.current !== null) {
          window.clearTimeout(wheelLockTimerRef.current);
        }
        wheelLockTimerRef.current = window.setTimeout(() => {
          wheelLockRef.current = null;
          wheelLockTimerRef.current = null;
        }, WHEEL_LOCK_IDLE_MS);

        const factor = Math.exp(-e.deltaY * 0.0025);
        zoomToLockedCard(zoomRef.current * factor, wheelLockRef.current);
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
    [cancelSnap, commitTransform, resolveStageLock, zoomToLockedCard],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  useEffect(() => {
    if (!crazyMode) {
      setCrazyOverrides(new Map());
      setCrazyStrikeKeys(new Set());
      onCrazyFlash?.(false);
      return;
    }

    let flashTimer: number | undefined;

    const flash = () => {
      const viewport = viewportRef.current;
      if (!viewport || poolIds.length === 0) return;

      const button = crazyBtnRef?.current;
      if (!button) return;

      const visibleCells = getVisiblePileCells(viewport);
      if (visibleCells.length === 0) return;

      crazyFlashCountRef.current += 1;
      const seed = crazyFlashCountRef.current;
      const picks = pickHalfVisibleCells(visibleCells, seed);
      let swapSeed = seed;

      const swaps = picks.map((pick) => {
        swapSeed = (swapSeed * 1664525 + 1013904223) >>> 0;
        return {
          key: pick.key,
          nextToyId: pickRandomToyId(poolIds, pick.toyId, swapSeed),
        };
      });

      preloadImages(
        swaps
          .map(({ nextToyId }) => poolImageById.get(nextToyId))
          .filter((src): src is string => Boolean(src)),
      );

      const btnRect = button.getBoundingClientRect();
      flashScreen(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);

      setCrazyOverrides((prev) => {
        const next = new Map(prev);
        for (const { key, nextToyId } of swaps) {
          next.set(key, nextToyId);
        }
        return next;
      });
      setCrazyStrikeKeys(new Set(swaps.map(({ key }) => key)));
      onCrazyFlash?.(true);

      flashTimer = window.setTimeout(() => {
        setCrazyStrikeKeys(new Set());
        onCrazyFlash?.(false);
      }, CRAZY_CARD_FLASH_MS);
    };

    crazyFlashCountRef.current = 0;
    const id = window.setInterval(flash, CRAZY_FLASH_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      if (flashTimer) window.clearTimeout(flashTimer);
      onCrazyFlash?.(false);
    };
  }, [crazyMode, poolIds, poolImageById, crazyBtnRef, flashScreen, onCrazyFlash]);

  if (pool.length === 0) {
    return (
      <div className="toy-pile-empty scroll-pad-bottom flex flex-1 items-center justify-center px-6">
        <p className="rounded-[2rem] bg-white px-6 py-12 text-center text-[var(--ink-soft)] shadow-sm">
          No toys match. Try another search.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={viewportRef}
        className="toy-pile-viewport scroll-pad-bottom min-h-0 flex-1"
        aria-label="Toy grid — drag to explore, pinch to zoom toward a card"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <div
          className="toy-pile-stage"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
        >
          <div
            className="toy-pile-grid"
            style={{ "--pile-cols": colCount } as React.CSSProperties}
          >
            {Array.from({ length: slots }).map((_, index) => {
              const col = colMin + (index % colCount);
              const row = rowMin + Math.floor(index / colCount);
              const relCol = index % colCount;
              const colShift = relCol % 2 === 1 ? 0.5 : 0;
              const cellKey = pileCellKey(col, row);
              const toy = toyForCell(col, row, pool, crazyOverrides);
              return (
                <ToyPileCard
                  key={`pile-${col}-${row}`}
                  col={col}
                  row={row}
                  toy={toy}
                  showText={showText}
                  colShift={colShift}
                  crazyStrike={crazyMode && crazyStrikeKeys.has(cellKey)}
                />
              );
            })}
          </div>
        </div>
      </div>
      {crazyFlashPortal}
    </>
  );
}

const ToyPileCard = memo(function ToyPileCard({
  col,
  row,
  toy,
  showText,
  colShift = 0,
  crazyStrike = false,
}: {
  col: number;
  row: number;
  toy: Toy;
  showText: boolean;
  colShift?: number;
  crazyStrike?: boolean;
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
      className={`toy-pile-card${crazyStrike ? " toy-pile-card--crazy-strike" : ""}`}
      data-pile-col={col}
      data-pile-row={row}
      data-toy-id={toy.id}
      style={{ "--pile-col-shift": colShift } as React.CSSProperties}
    >
      <div className="toy-pile-card__body relative overflow-hidden rounded-[1.35rem] bg-white transition-transform active:scale-[0.97]">
        <Link
          href={`/toy/${toy.id}`}
          className={`toy-pile-card__media relative block aspect-[4/5] overflow-hidden bg-white ${
            showText ? "toy-pile-card__media--with-text" : "toy-pile-card__media--solo"
          }`}
        >
          <Image
            src={toy.image}
            alt={toy.imageAlt}
            fill
            sizes="(max-width: 640px) 92vw, 360px"
            className="object-contain p-2.5 sm:p-3"
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
