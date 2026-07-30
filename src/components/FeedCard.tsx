"use client";

import Image from "next/image";
import Link from "next/link";
import type { Toy } from "@/types/toy";
import { useKartStore } from "@/lib/kart-store";

export function FeedCard({
  toy,
  showText,
  index = 0,
}: {
  toy: Toy;
  showText: boolean;
  index?: number;
}) {
  const inKart = useKartStore((s) => s.ids.includes(toy.id));
  const toggle = useKartStore((s) => s.toggle);

  return (
    <article
      className="feed-card relative mx-10 overflow-visible sm:mx-12"
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
    >
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_12px_30px_-18px_rgba(60,70,120,0.45)] ring-1 ring-black/[0.03]">
        <Link href={`/toy/${toy.id}`} className="relative block aspect-[4/5]">
          <Image
            src={toy.image}
            alt={toy.imageAlt}
            fill
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-cover"
            priority={index < 2}
          />
        </Link>
        {showText && (
          <div className="px-4 pb-4 pt-3">
            <Link href={`/toy/${toy.id}`}>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
                {toy.name}
              </h2>
              <p className="text-sm text-[var(--ink-soft)]">{toy.blurb}</p>
            </Link>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-0 z-10 flex translate-x-1/2 flex-col gap-3.5">
        <button
          type="button"
          onClick={() => toggle(toy.id)}
          className={`flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full text-4xl font-bold text-white shadow-lg transition active:scale-95 ${
            inKart ? "bg-[var(--purple-deep)]" : "bg-[var(--blue)]"
          }`}
          aria-label={inKart ? "Remove from Kart" : "Add to Kart"}
          aria-pressed={inKart}
        >
          {inKart ? "✓" : "+"}
        </button>
        <Link
          href={`/toy/${toy.id}`}
          className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-[var(--purple)] font-[family-name:var(--font-display)] text-xl font-bold text-white shadow-lg transition active:scale-95"
        >
          Go
        </Link>
      </div>
    </article>
  );
}
