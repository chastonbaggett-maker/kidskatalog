"use client";

import Link from "next/link";
import {
  getCategoriesForAudience,
  getCategoryCover,
} from "@/data/categories";
import { ShelfHeader } from "@/components/ShelfHeader";
import { ToyPhoto } from "@/components/ToyPhoto";
import { useAccentStore } from "@/lib/accent-store";
import {
  useCrazyModeStore,
  crazyModeRootClass,
  crazyModeScrollClass,
} from "@/lib/crazy-mode-store";

export default function MenuPage() {
  const crazyMode = useCrazyModeStore((s) => s.crazyMode);
  const audience = useAccentStore((s) => s.audience);
  const menuCategories = getCategoriesForAudience(audience);

  return (
    <div
      className={`shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden ${crazyModeRootClass(crazyMode)}`}
    >
      <ShelfHeader title="Piles" subtitle="Pick a toy group" />
      <div
        className={`page-scroll star-field grid min-h-0 flex-1 grid-cols-2 gap-3 px-4 py-5 scroll-pad-bottom sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:px-6 ${crazyModeScrollClass(crazyMode)}`}
      >
        {menuCategories.map((cat) => (
          <div
            key={cat.id}
            className="shelf-panel shelf-panel--soft transition active:scale-[0.98]"
          >
            <Link
              href={`/shop/${cat.id}`}
              className="shelf-panel__surface menu-pile-card flex flex-col items-center gap-2.5 px-3 pb-4 pt-3 text-[var(--ink)]"
            >
              <span
                className="menu-pile-card__photo-wrap"
                style={{ ["--pile-hue" as string]: cat.hue }}
              >
                <ToyPhoto
                  src={getCategoryCover(cat, audience)}
                  alt={cat.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="menu-pile-card__photo"
                />
              </span>
              <span className="font-[family-name:var(--font-display)] text-lg font-bold">
                {cat.label}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
