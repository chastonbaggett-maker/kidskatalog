import Link from "next/link";
import { categories } from "@/data/categories";
import { CategoryIcon } from "./CategoryIcon";

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {categories.map((cat, i) => (
        <Link
          key={cat.id}
          href={`/shop/${cat.id}`}
          className="cat-tile group flex flex-col items-center justify-center gap-2 rounded-[1.75rem] px-3 py-6 text-center text-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
          style={{
            background: `linear-gradient(145deg, ${cat.hue}, color-mix(in srgb, ${cat.hue} 70%, #0b1f18))`,
            animationDelay: `${i * 40}ms`,
          }}
        >
          <span className="rounded-2xl bg-white/15 p-3 transition group-hover:bg-white/25">
            <CategoryIcon id={cat.id} className="h-9 w-9" />
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-wide">
            {cat.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
