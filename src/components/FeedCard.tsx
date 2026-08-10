"use client";

import Link from "next/link";
import type { Toy } from "@/types/toy";
import { useAccentStore } from "@/lib/accent-store";
import { speakToyDescription } from "@/lib/toy-speech";
import { ToyPhoto } from "./ToyPhoto";

export function FeedCard({
  toy,
  showText,
  index = 0,
  slotIndex = index,
  crazyStrike = false,
  animateEnter = false,
  photoLoading,
  className,
  showBlurb = true,
  titleClassName = "text-xl",
  /** Pile: keep card height fixed while toggling text so the shelf doesn't jump. */
  stableTextLayout = false,
}: {
  toy: Toy;
  showText: boolean;
  index?: number;
  slotIndex?: number;
  crazyStrike?: boolean;
  animateEnter?: boolean;
  /** Override lazy/eager — more-toys uses eager for all cards to avoid decode flash on add. */
  photoLoading?: "lazy" | "eager";
  /** Replaces default horizontal margins when set (pile mode uses flush width). */
  className?: string;
  /** When false, text mode shows only the title (pile mode). */
  showBlurb?: boolean;
  titleClassName?: string;
  stableTextLayout?: boolean;
}) {
  const audience = useAccentStore((s) => s.audience);
  const viewBtnClass =
    audience === "boys"
      ? "bg-[var(--boys-chip)]"
      : audience === "girls"
        ? "bg-[var(--girls-chip)]"
        : "bg-[var(--mint)]";

  function onToyOpen() {
    speakToyDescription(toy);
  }

  return (
    <article
      data-feed-slot={slotIndex}
      data-toy-id={toy.id}
      className={`feed-card relative ${
        className ?? "mx-6 sm:mx-4 lg:mx-2"
      } ${crazyStrike ? "feed-card--crazy-strike" : ""}${
        animateEnter ? " feed-card--enter" : ""
      }${stableTextLayout ? " feed-card--stable-text" : ""}`}
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
    >
      <div
        className={`feed-card__surface relative bg-white${
          stableTextLayout ? " feed-card__surface--stable-text" : ""
        }`}
      >
        <Link
          href={`/toy/${toy.id}`}
          prefetch={false}
          onClick={onToyOpen}
          className={`feed-card__media block bg-white${
            stableTextLayout ? " feed-card__media--stable-text" : ""
          }`}
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
        {showText ? (
          <div
            className={`feed-card__title-slot px-4 pt-3 ${
              showBlurb ? "pb-4" : "pb-3 pr-14"
            }${stableTextLayout ? " feed-card__title-slot--stable" : ""}`}
          >
            <Link href={`/toy/${toy.id}`} onClick={onToyOpen}>
              <h2
                className={`font-[family-name:var(--font-display)] font-bold text-[var(--ink)] ${titleClassName}`}
              >
                {toy.name}
              </h2>
              {showBlurb ? (
                <p className="text-sm text-[var(--ink-soft)]">{toy.blurb}</p>
              ) : null}
            </Link>
          </div>
        ) : null}
        <Link
          href={`/toy/${toy.id}`}
          prefetch={false}
          onClick={onToyOpen}
          aria-label={`View ${toy.name}`}
          className={`feed-card__view-btn ${viewBtnClass}`}
        />
      </div>
    </article>
  );
}
