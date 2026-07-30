import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ToyGrid } from "@/components/ToyGrid";
import { getCategory } from "@/data/categories";
import { getToysByCategory } from "@/data/toys";
import type { CategoryId } from "@/types/toy";

type Props = {
  params: Promise<{ category: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  const list = getToysByCategory(cat.id);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/shop"
          className="mb-4 inline-flex text-sm font-bold text-[var(--forest)] hover:underline"
        >
          ← All piles
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <span
            className="rounded-2xl p-3 text-white"
            style={{ background: cat.hue }}
          >
            <CategoryIcon id={cat.id as CategoryId} className="h-8 w-8" />
          </span>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--forest)]">
              {cat.label}
            </h1>
            <p className="text-[var(--ink-soft)]">{list.length} toys</p>
          </div>
        </div>
        <ToyGrid toys={list} />
      </main>
    </>
  );
}
