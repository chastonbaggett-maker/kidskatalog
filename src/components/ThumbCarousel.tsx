"use client";

import Link from "next/link";
import {
  getCategoriesForAudience,
  getCategoryCollage,
} from "@/data/categories";
import { useAccentStore } from "@/lib/accent-store";
import { CategoryCollage } from "./CategoryCollage";

export function ThumbCarousel() {
  const audience = useAccentStore((s) => s.audience);
  const cats = getCategoriesForAudience(audience);

  return (
    <div className="thumb-carousel px-3 py-3">
      <div className="flex gap-3 overflow-x-auto pb-0.5 scrollbar-none">
        {cats.map((cat) => (
          <Link
            key={cat.id}
            href={`/shop/${cat.id}`}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition active:scale-95"
            aria-label={cat.label}
            title={cat.label}
            style={{ ["--pile-hue" as string]: cat.hue }}
          >
            <CategoryCollage
              images={getCategoryCollage(cat, audience)}
              alt={cat.imageAlt}
              compact
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
