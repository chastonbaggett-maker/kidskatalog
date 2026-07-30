import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { categories } from "@/data/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { CategoryId } from "@/types/toy";

export default function MenuPage() {
  return (
    <AppShell>
      <header className="bg-[image:var(--header-grad)] px-4 pb-5 pt-10 text-center text-white">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          Piles
        </h1>
        <p className="text-white/85">Pick a toy group</p>
      </header>
      <div className="star-field grid flex-1 grid-cols-2 gap-3 px-4 py-5 pb-8">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/shop/${cat.id}`}
            className="flex flex-col items-center gap-2 rounded-[1.75rem] bg-white px-3 py-6 text-[var(--ink)] shadow-sm ring-1 ring-black/[0.03] transition active:scale-[0.98]"
          >
            <span
              className="rounded-2xl p-3 text-white"
              style={{ background: cat.hue }}
            >
              <CategoryIcon id={cat.id as CategoryId} className="h-8 w-8" />
            </span>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold">
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
