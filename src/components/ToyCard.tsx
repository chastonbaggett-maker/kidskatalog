"use client";

import Image from "next/image";
import Link from "next/link";
import type { Toy } from "@/types/toy";
import { useKartStore } from "@/lib/kart-store";

export function ToyCard({ toy }: { toy: Toy }) {
  const inKart = useKartStore((s) => s.ids.includes(toy.id));
  const toggle = useKartStore((s) => s.toggle);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-white/70 shadow-[0_10px_30px_-18px_rgba(27,77,62,0.45)] ring-1 ring-[var(--forest)]/8 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(27,77,62,0.55)]">
      <Link href={`/toy/${toy.id}`} className="relative block aspect-square overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `linear-gradient(160deg, ${toy.color}55, transparent 60%)`,
          }}
        />
        <Image
          src={toy.image}
          alt={toy.imageAlt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <Link href={`/toy/${toy.id}`}>
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--forest)] sm:text-xl">
            {toy.name}
          </h3>
          <p className="text-sm text-[var(--ink-soft)]">{toy.blurb}</p>
        </Link>
        <button
          type="button"
          onClick={() => toggle(toy.id)}
          className={`mt-auto rounded-2xl px-3 py-2.5 text-sm font-bold transition active:scale-[0.97] ${
            inKart
              ? "bg-[var(--leaf)] text-white"
              : "bg-[var(--mint)] text-[var(--forest)] hover:bg-[var(--forest)] hover:text-white"
          }`}
          aria-pressed={inKart}
        >
          {inKart ? "In Kart" : "Add to Kart"}
        </button>
      </div>
    </article>
  );
}
