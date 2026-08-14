"use client";

import Link from "next/link";
import { useState } from "react";
import {
  getCategoriesForAudience,
  getCategoryCollage,
} from "@/data/categories";
import { useAccentStore } from "@/lib/accent-store";
import type { Audience } from "@/types/toy";
import { CategoryCollage } from "./CategoryCollage";

/** Soft frame hues per gender filter — cycled across category tiles. */
const TILE_FRAME_HUES: Record<"all" | "boys" | "girls", readonly string[]> = {
  all: [
    "#3ECFC0", // mint
    "#F5A9C5", // pink
    "#D17CFF", // purple
    "#4E89FF", // blue
    "#FFC107", // yellow
    "#7BC67E", // green
    "#FF9F6B", // coral
    "#B19CD9", // lavender
  ],
  boys: [
    "#4E89FF", // blue
    "#3ECFC0", // teal
    "#7BC67E", // green
    "#FFC107", // yellow
    "#5BA3F0", // sky
    "#6EE8DB", // aqua
    "#FFB347", // orange
    "#3A6FE0", // deep blue
  ],
  girls: [
    "#F5A9C5", // pink
    "#D17CFF", // purple
    "#EF8FB3", // rose
    "#F7D774", // soft yellow
    "#C9A0DC", // lilac
    "#FFB6C1", // light pink
    "#B19CD9", // lavender
    "#E8A0BF", // blush
  ],
};

function tileFrameHue(audience: Audience, index: number): string {
  const key = audience === "boys" || audience === "girls" ? audience : "all";
  const palette = TILE_FRAME_HUES[key];
  return palette[index % palette.length]!;
}

export function ThumbCarousel() {
  const audience = useAccentStore((s) => s.audience);
  const cats = getCategoriesForAudience(audience);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`thumb-carousel px-3 ${
        expanded ? "thumb-carousel--expanded py-4" : "py-3"
      }`}
    >
      <div className="thumb-carousel__track flex items-start gap-3 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          type="button"
          className="thumb-carousel__expand shrink-0"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse categories" : "Expand categories"}
          title={expanded ? "Collapse" : "Expand"}
          onClick={() => setExpanded((v) => !v)}
        >
          <ExpandChevron expanded={expanded} />
        </button>

        {cats.map((cat, index) => (
          <Link
            key={cat.id}
            href={`/shop/${cat.id}`}
            className="thumb-carousel__item group shrink-0"
            aria-label={cat.label}
            title={cat.label}
            style={{
              ["--gender-filter-hue" as string]: tileFrameHue(audience, index),
            }}
          >
            <span className="thumb-carousel__tile relative overflow-hidden rounded-2xl ring-1 ring-black/5 transition active:scale-95">
              <CategoryCollage
                images={getCategoryCollage(cat, audience)}
                alt={cat.imageAlt}
                compact={!expanded}
              />
            </span>
            <span
              className={`thumb-carousel__label font-[family-name:var(--font-display)] font-bold text-[var(--ink)] ${
                expanded ? "is-visible" : ""
              }`}
            >
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ExpandChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`thumb-carousel__expand-icon ${expanded ? "is-expanded" : ""}`}
    >
      <path
        d="M6.5 9.5 12 15l5.5-5.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
