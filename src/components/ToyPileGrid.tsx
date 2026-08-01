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
} from "react";
import type { Toy } from "@/types/toy";
import { useAccentStore } from "@/lib/accent-store";

const MIN_CHUNK = 6;
const GRID_VIEW = 6;
const EDGE_THRESHOLD = 220;
const EXPAND_COOLDOWN_MS = 450;
/** feed-card uses mx-6 (1.5rem) on each side */
const FEED_CARD_SIDE_INSET_PX = 48;

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
};

function getMetrics(viewport: HTMLElement) {
  const cell = parseFloat(getComputedStyle(viewport).getPropertyValue("--pile-cell")) || 160;
  const gap = parseFloat(getComputedStyle(viewport).getPropertyValue("--pile-gap")) || 14;
  return { cell, gap, stride: cell + gap };
}

function getZoomBounds(viewport: HTMLElement) {
  const { cell, gap, stride } = getMetrics(viewport);
  const { clientWidth, clientHeight } = viewport;
  const feedWidth = Math.max(clientWidth - FEED_CARD_SIDE_INSET_PX, cell);
  /** Six cells plus five gaps — exact footprint of a 6×6 block */
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

function pointerDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function ToyPileGrid({ toys, showText }: Props) {
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
  const pinchRef = useRef<{ dist: number; zoom: number; cx: number; cy: number } | null>(
    null,
  );
  const rafRef = useRef<number | null>(null);
  const centeredRef = useRef(false);
  const expandCooldownRef = useRef(0);
  const expandLockRef = useRef(false);

  const pool = useMemo(() => (toys.length === 0 ? [] : toys), [toys]);
  const slots = colCount * rowCount;

  const commitTransform = useCallback((nextPan: Pan, nextZoom: number) => {
    panRef.current = nextPan;
    zoomRef.current = nextZoom;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setPan({ ...panRef.current });
      setZoom(zoomRef.current);
    });
  }, []);

  const zoomAt = useCallback(
    (targetZoom: number, clientX: number, clientY: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const clamped = clampZoom(viewport, targetZoom);
      const prevZoom = zoomRef.current;
      if (Math.abs(clamped - prevZoom) < 0.0001) return;

      const rect = viewport.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const stageX = (px - panRef.current.x) / prevZoom;
      const stageY = (py - panRef.current.y) / prevZoom;

      commitTransform(
        {
          x: px - stageX * clamped,
          y: py - stageY * clamped,
        },
        clamped,
      );
    },
    [commitTransform],
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

    const { stride } = getMetrics(viewport);
    const gap = parseFloat(getComputedStyle(viewport).getPropertyValue("--pile-gap")) || 14;
    const gridW = colCount * stride - gap;
    const gridH = rowCount * stride - gap;
    const initialZoom = clampZoom(viewport, 1);
    const centered = {
      x: (viewport.clientWidth - gridW * initialZoom) / 2,
      y: (viewport.clientHeight - gridH * initialZoom) / 2,
    };
    commitTransform(centered, initialZoom);
    centeredRef.current = true;
  }, [colCount, rowCount, commitTransform]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onResize = () => {
      const clamped = clampZoom(viewport, zoomRef.current);
      if (clamped !== zoomRef.current) {
        const rect = viewport.getBoundingClientRect();
        zoomAt(clamped, rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    };

    const observer = new ResizeObserver(onResize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [zoomAt]);

  const syncPinch = useCallback(() => {
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
      dragRef.current = null;
      pinchRef.current = { dist, zoom: zoomRef.current, cx, cy };
      return;
    }

    const ratio = dist / pinchRef.current.dist;
    zoomAt(pinchRef.current.zoom * ratio, cx, cy);
  }, [zoomAt]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button")) return;

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

      commitTransform(
        {
          x: drag.originX + (e.clientX - drag.startX),
          y: drag.originY + (e.clientY - drag.startY),
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
        dragRef.current = null;
        maybeExpand();
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
          };
        }
      }
    },
    [maybeExpand],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.0025);
        zoomAt(zoomRef.current * factor, e.clientX, e.clientY);
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
    [commitTransform, zoomAt],
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
        <p className="rounded-[2rem] bg-white px-6 py-12 text-center text-[var(--ink-soft)] shadow-sm">
          No toys match. Try another search.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="toy-pile-viewport scroll-pad-bottom min-h-0 flex-1"
      aria-label="Toy grid — drag to explore, pinch to zoom"
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
            const toy = pool[toyIndexForCell(col, row, pool.length)]!;
            return (
              <ToyPileCard
                key={`pile-${col}-${row}`}
                toy={toy}
                showText={showText}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const ToyPileCard = memo(function ToyPileCard({
  toy,
  showText,
}: {
  toy: Toy;
  showText: boolean;
}) {
  const audience = useAccentStore((s) => s.audience);
  const viewBtnClass =
    audience === "boys"
      ? "bg-[var(--boys-chip)]"
      : audience === "girls"
        ? "bg-[var(--girls-chip)]"
        : "bg-[var(--mint)]";

  return (
    <article className="toy-pile-card">
      <div className="toy-pile-card__body relative overflow-hidden rounded-[1.35rem] bg-white shadow-[0_10px_28px_-14px_rgba(60,70,120,0.5)] ring-1 ring-black/[0.04] transition-transform active:scale-[0.97]">
        <Link href={`/toy/${toy.id}`} className="relative block aspect-[4/5] bg-white">
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
