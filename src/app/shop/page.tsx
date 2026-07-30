import { Header } from "@/components/Header";
import { CategoryGrid } from "@/components/CategoryGrid";
import { ToyGrid } from "@/components/ToyGrid";
import { toys } from "@/data/toys";

export default function ShopPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <section className="mb-10">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--forest)] sm:text-4xl">
            Pick a pile
          </h1>
          <p className="mt-1 text-[var(--ink-soft)]">Tap a group. Find favorites.</p>
          <div className="mt-5">
            <CategoryGrid />
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--forest)]">
            All toys
          </h2>
          <ToyGrid toys={toys} />
        </section>
      </main>
    </>
  );
}
