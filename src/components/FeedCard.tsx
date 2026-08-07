"use client";

import Link from "next/link";
import type { Toy } from "@/types/toy";
import { useAccentStore } from "@/lib/accent-store";
import { ToyPhoto } from "./ToyPhoto";

export function FeedCard({
  toy,
  showText,
  index = 0,
  slotIndex = index,
  crazyStrike = false,
  animateEnter = false,
  photoLoading,
}: {
  toy: Toy;
  showText: boolean;
  index?: number;
  slotIndex?: number;
  crazyStrike?: boolean;
  animateEnter?: boolean;
  /** Override lazy/eager — more-toys uses eager for all cards to avoid decode flash on add. */
  photoLoading?: "lazy" | "eager";
}) {
  const audience = useAccentStore((s) => s.audience);
  const viewBtnClass =
    audience === "boys"
      ? "bg-[var(--boys-chip)]"
      : audience === "girls"
        ? "bg-[var(--girls-chip)]"
        : "bg-[var(--mint)]";

  return (
    <article
      data-feed-slot={slotIndex}
      data-toy-id={toy.id}
      className={`feed-card relative mx-6 sm:mx-4 lg:mx-2 ${
        crazyStrike ? "feed-card--crazy-strike" : ""
      }${animateEnter ? " feed-card--enter" : ""}`}
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
    >
      <div className="feed-card__surface relative bg-white">
        <Link
          href={`/toy/${toy.id}`}
          prefetch={false}
          className="feed-card__media block bg-white"
        >
          <ToyPhoto
            src={toy.image}
            alt={toy.imageAlt}
            loading={photoLoading ?? (index < 2 ? "eager" : "lazy")}
            decoding="async"
            width={400}
            height={500}
            className="feed-card__photo"
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
        <Link
          href={`/toy/${toy.id}`}
          prefetch={false}
          aria-label={`View ${toy.name}`}
          className={`feed-card__view-btn ${viewBtnClass}`}
        />
      </div>
    </article>
  );
}
