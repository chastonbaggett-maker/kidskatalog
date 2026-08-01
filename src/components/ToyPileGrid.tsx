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
const EDGE_THRESHOLD = 220;
const EXPAND_COOLDOWN_MS = 450;

/** Rotations covering every direction — flat, diagonal, and skewed piles. */
const ROTATIONS = [-52, -38, -24, -12, -6, 0, 6, 12, 24, 38, 52, -68, 68, 15, -15, 42];

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

export function ToyPileGrid({ toys, showText }: Props) {
  const [cols, setCols] = useState(MIN_CHUNK * 3);
  const [rows, setRows] = useState(MIN_CHUNK * 3);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<Pan>({ x: 0, y: 0 });
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const centeredRef = useRef(false);
  const expandCooldownRef = useRef(0);
  const expandLockRef = useRef(false);

  const pool = useMemo(() => {
    if (toys.length === 0) return [];
    return shuffleWithSeed(toys, toys.map((t) => t.id).join("|"));
  }, [toys]);

  const slots = cols * rows;

  const applyPan = useCallback((next: Pan) => {
    panRef.current = next;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setPan({ ...panRef.current });
    });
  }, []);

  const maybeExpand = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || expandLockRef.current) return;
    if (Date.now() - expandCooldownRef.current < EXPAND_COOLDOWN_MS) return;

    const { stride } = getMetrics(viewport);
    const { x, y } = panRef.current;
    const { clientWidth, clientHeight } = viewport;
    const gridW = cols * stride - parseFloat(getComputedStyle(viewport).getPropertyValue("--pile-gap"));
    const gridH = rows * stride - parseFloat(getComputedStyle(viewport).getPropertyValue("--pile-gap"));

    const viewRight = -x + clientWidth;
    const viewBottom = -y + clientHeight;

    let expanded = false;

    if (viewRight > gridW - EDGE_THRESHOLD) {
      setCols((c) => c + MIN_CHUNK);
      expanded = true;
    }
    if (viewBottom > gridH - EDGE_THRESHOLD) {
      setRows((r) => r + MIN_CHUNK);
      expanded = true;
    }

    if (!expanded) return;

    expandLockRef.current = true;
    expandCooldownRef.current = Date.now();
    window.setTimeout(() => {
      expandLockRef.current = false;
    }, EXPAND_COOLDOWN_MS);
  }, [cols, rows]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || centeredRef.current) return;

    const { stride } = getMetrics(viewport);
    const gap = parseFloat(getComputedStyle(viewport).getPropertyValue("--pile-gap")) || 14;
    const gridW = cols * stride - gap;
    const gridH = rows * stride - gap;
    const centered = {
      x: (viewport.clientWidth - gridW) / 2,
      y: (viewport.clientHeight - gridH) / 2,
    };
    panRef.current = centered;
    setPan(centered);
    centeredRef.current = true;
  }, [cols, rows]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) return;

    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: panRef.current.x,
      originY: panRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag?.active || drag.pointerId !== e.pointerId) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      applyPan({
        x: drag.originX + dx,
        y: drag.originY + dy,
      });
    },
    [applyPan],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag?.active || drag.pointerId !== e.pointerId) return;
      dragRef.current = null;
      maybeExpand();
    },
    [maybeExpand],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      applyPan({
        x: panRef.current.x - e.deltaX,
        y: panRef.current.y - e.deltaY,
      });
    },
    [applyPan],
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
      aria-label="Toy pile — drag to explore in any direction"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="toy-pile-stage"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
        }}
      >
        <div
          className="toy-pile-grid"
          style={{ "--pile-cols": cols } as React.CSSProperties}
        >
          {Array.from({ length: slots }).map((_, index) => {
            const toy = pool[index % pool.length]!;
            return (
              <ToyPileCard
                key={`pile-${index}-${toy.id}`}
                toy={toy}
                index={index}
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
  index,
  showText,
}: {
  toy: Toy;
  index: number;
  showText: boolean;
}) {
  const audience = useAccentStore((s) => s.audience);
  const viewBtnClass =
    audience === "boys"
      ? "bg-[var(--boys-chip)]"
      : audience === "girls"
        ? "bg-[var(--girls-chip)]"
        : "bg-[var(--mint)]";

  const rotation = ROTATIONS[index % ROTATIONS.length] ?? 0;
  const offsetX = ((index * 17) % 9) - 4;
  const offsetY = ((index * 23) % 9) - 4;

  return (
    <article
      className="toy-pile-card"
      style={{
        transform: `rotate(${rotation}deg) translate(${offsetX}px, ${offsetY}px)`,
      }}
    >
      <div className="toy-pile-card__body overflow-hidden rounded-[1.35rem] bg-white shadow-[0_10px_28px_-14px_rgba(60,70,120,0.5)] ring-1 ring-black/[0.04] transition-transform active:scale-[0.97]">
        <Link href={`/toy/${toy.id}`} className="relative block aspect-square bg-white">
          <Image
            src={toy.image}
            alt={toy.imageAlt}
            fill
            sizes="(max-width: 640px) 28vw, 180px"
            className="object-contain p-2.5"
          />
        </Link>
        {showText ? (
          <div className="px-2.5 pb-2.5 pt-1">
            <Link href={`/toy/${toy.id}`}>
              <h2 className="truncate font-[family-name:var(--font-display)] text-sm font-bold text-[var(--ink)]">
                {toy.name}
              </h2>
            </Link>
          </div>
        ) : null}
      </div>
      <Link
        href={`/toy/${toy.id}`}
        aria-label={`View ${toy.name}`}
        className={`toy-pile-card__eye absolute -bottom-0.5 -right-0.5 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md transition active:scale-95 ${viewBtnClass}`}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
          <path
            d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.75" fill="currentColor" />
        </svg>
      </Link>
    </article>
  );
});

function shuffleWithSeed<T>(items: T[], seedKey: string): T[] {
  const arr = [...items];
  let s = 0;
  for (let i = 0; i < seedKey.length; i++) {
    s = (s + seedKey.charCodeAt(i) * (i + 1)) >>> 0;
  }
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
