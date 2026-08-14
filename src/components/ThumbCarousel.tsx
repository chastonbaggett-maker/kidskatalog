"use client";

import Link from "next/link";
import { getCategoriesForAudience } from "@/data/categories";
import { useAccentStore } from "@/lib/accent-store";
import { ToyPhoto } from "./ToyPhoto";

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
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/5 transition active:scale-95"
            aria-label={cat.label}
            title={cat.label}
          >
            <ToyPhoto
              src={cat.image}
              alt={cat.imageAlt}
              loading="lazy"
              decoding="async"
              className="thumb-carousel__photo"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
