"use client";

import Image from "next/image";
import Link from "next/link";
import type { Toy } from "@/types/toy";

export function FeedCard({
  toy,
  showText,
  index = 0,
}: {
  toy: Toy;
  showText: boolean;
  index?: number;
}) {
  return (
    <article
      className="feed-card relative mx-6 overflow-visible sm:mx-4 lg:mx-2"
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
    >
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_12px_30px_-18px_rgba(60,70,120,0.45)] ring-1 ring-black/[0.03]">
        <Link href={`/toy/${toy.id}`} className="relative block aspect-[4/5] bg-white">
          <Image
            src={toy.image}
            alt={toy.imageAlt}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 360px"
            className="object-contain p-3 sm:p-4"
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

      <div className="absolute bottom-3 right-0 z-10 translate-x-[18%] sm:translate-x-[12%] lg:translate-x-[15%]">
        <Link
          href={`/toy/${toy.id}`}
          aria-label={`View ${toy.name}`}
          className="flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full bg-[var(--mint)] text-white shadow-lg transition active:scale-95 sm:h-[5.5rem] sm:w-[5.5rem]"
        >
          <EyeIcon />
        </Link>
      </div>
    </article>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="h-9 w-9 sm:h-11 sm:w-11"
    >
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" fill="currentColor" />
    </svg>
  );
}
