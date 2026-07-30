"use client";

import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { SendToParentForm } from "@/components/SendToParentForm";
import { getToysByIds } from "@/data/toys";
import { useKartStore } from "@/lib/kart-store";

export default function KartPage() {
  const ids = useKartStore((s) => s.ids);
  const remove = useKartStore((s) => s.remove);
  const clear = useKartStore((s) => s.clear);
  const toys = getToysByIds(ids);

  return (
    <>
      <Header />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--forest)] sm:text-4xl">
                My Kart
              </h1>
              <p className="text-[var(--ink-soft)]">
                {toys.length === 0
                  ? "Empty — go find toys!"
                  : `${toys.length} favorite${toys.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {toys.length > 0 && (
              <button
                type="button"
                onClick={() => clear()}
                className="text-sm font-bold text-[var(--ink-soft)] hover:text-[var(--forest)]"
              >
                Clear
              </button>
            )}
          </div>

          {toys.length === 0 ? (
            <div className="rounded-[2rem] bg-white/70 px-6 py-14 text-center ring-1 ring-[var(--forest)]/10">
              <p className="mb-4 text-[var(--ink-soft)]">Your Kart is waiting.</p>
              <Link
                href="/shop"
                className="inline-flex rounded-2xl bg-[var(--forest)] px-6 py-3 font-bold text-white"
              >
                Browse toys
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {toys.map((toy) => (
                <li
                  key={toy.id}
                  className="flex items-center gap-3 rounded-[1.5rem] bg-white/80 p-3 ring-1 ring-[var(--forest)]/10"
                >
                  <Link
                    href={`/toy/${toy.id}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl"
                  >
                    <Image
                      src={toy.image}
                      alt={toy.imageAlt}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/toy/${toy.id}`}
                      className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--forest)]"
                    >
                      {toy.name}
                    </Link>
                    <p className="truncate text-sm text-[var(--ink-soft)]">
                      {toy.blurb}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(toy.id)}
                    className="rounded-xl bg-[var(--mint)] px-3 py-2 text-sm font-bold text-[var(--forest)] hover:bg-red-100 hover:text-red-700"
                    aria-label={`Remove ${toy.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SendToParentForm toys={toys} />
        </aside>
      </main>
    </>
  );
}
