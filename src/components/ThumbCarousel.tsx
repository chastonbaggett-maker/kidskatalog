"use client";

import Link from "next/link";
import { useState } from "react";
import {
  getCategoriesForAudience,
  getCategoryCollage,
} from "@/data/categories";
import { useAccentStore } from "@/lib/accent-store";
import { CategoryCollage } from "./CategoryCollage";

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

        {cats.map((cat) => (
          <Link
            key={cat.id}
            href={`/shop/${cat.id}`}
            className="thumb-carousel__item group shrink-0"
            aria-label={cat.label}
            title={cat.label}
            style={{ ["--pile-hue" as string]: cat.hue }}
          >
            <span className="thumb-carousel__tile relative overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition active:scale-95">
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
