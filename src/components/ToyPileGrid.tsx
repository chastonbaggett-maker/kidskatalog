"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Toy } from "@/types/toy";
import { useAccentStore } from "@/lib/accent-store";

const MIN_CHUNK = 6;
const EXPAND_THRESHOLD = 140;

/** Rotations covering every direction — flat, diagonal, and skewed piles. */
const ROTATIONS = [-52, -38, -24, -12, -6, 0, 6, 12, 24, 38, 52, -68, 68, 15, -15, 42];

type Props = {
  toys: Toy[];
  showText: boolean;
};

export function ToyPileGrid({ toys, showText }: Props) {
  const [cols, setCols] = useState(MIN_CHUNK * 2);
  const [rows, setRows] = useState(MIN_CHUNK * 2);
  const viewportRef = useRef<HTMLDivElement>(null);
  const expandingRef = useRef(false);
  const centeredRef = useRef(false);

  const pool = useMemo(() => {
    if (toys.length === 0) return [];
    return shuffleWithSeed(toys, toys.map((t) => t.id).join("|"));
  }, [toys]);

  const slots = cols * rows;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || centeredRef.current) return;

    const cell = parseFloat(
      getComputedStyle(viewport).getPropertyValue("--pile-cell") || "120",
    );
    const gap = parseFloat(
      getComputedStyle(viewport).getPropertyValue("--pile-gap") || "12",
    );
    const stride = cell + gap;
    viewport.scrollLeft = MIN_CHUNK * stride;
    viewport.scrollTop = MIN_CHUNK * stride;
    centeredRef.current = true;
  }, [cols, rows]);

  const expand = useCallback((direction: "north" | "south" | "east" | "west") => {
    if (expandingRef.current) return;
    expandingRef.current = true;

    const viewport = viewportRef.current;
    if (!viewport) {
      expandingRef.current = false;
      return;
    }

    const cell = parseFloat(
      getComputedStyle(viewport).getPropertyValue("--pile-cell") || "120",
    );
    const gap = parseFloat(
      getComputedStyle(viewport).getPropertyValue("--pile-gap") || "12",
    );
    const stride = cell + gap;
    const delta = MIN_CHUNK * stride;

    if (direction === "south") setRows((r) => r + MIN_CHUNK);
    if (direction === "north") {
      setRows((r) => r + MIN_CHUNK);
      requestAnimationFrame(() => {
        viewport.scrollTop += delta;
        expandingRef.current = false;
      });
      return;
    }
    if (direction === "east") setCols((c) => c + MIN_CHUNK);
    if (direction === "west") {
      setCols((c) => c + MIN_CHUNK);
      requestAnimationFrame(() => {
        viewport.scrollLeft += delta;
        expandingRef.current = false;
      });
      return;
    }

    requestAnimationFrame(() => {
      expandingRef.current = false;
    });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || pool.length === 0 || !centeredRef.current) return;

    const onScroll = () => {
      if (expandingRef.current) return;
      const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } =
        viewport;

      if (scrollHeight - scrollTop - clientHeight < EXPAND_THRESHOLD) expand("south");
      if (scrollWidth - scrollLeft - clientWidth < EXPAND_THRESHOLD) expand("east");
      if (scrollTop < EXPAND_THRESHOLD) expand("north");
      if (scrollLeft < EXPAND_THRESHOLD) expand("west");
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [expand, pool.length]);

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
  );
}

function ToyPileCard({
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
      <div className="toy-pile-card__body overflow-hidden rounded-2xl bg-white shadow-[0_8px_22px_-12px_rgba(60,70,120,0.5)] ring-1 ring-black/[0.04] transition-transform active:scale-[0.96]">
        <Link href={`/toy/${toy.id}`} className="relative block aspect-square bg-white">
          <Image
            src={toy.image}
            alt={toy.imageAlt}
            fill
            sizes="120px"
            className="object-contain p-1.5"
          />
        </Link>
        {showText ? (
          <div className="px-2 pb-2 pt-1">
            <Link href={`/toy/${toy.id}`}>
              <h2 className="truncate font-[family-name:var(--font-display)] text-xs font-bold text-[var(--ink)]">
                {toy.name}
              </h2>
            </Link>
          </div>
        ) : null}
      </div>
      <Link
        href={`/toy/${toy.id}`}
        aria-label={`View ${toy.name}`}
        className={`toy-pile-card__eye absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md transition active:scale-95 ${viewBtnClass}`}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-4 w-4">
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
}

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
