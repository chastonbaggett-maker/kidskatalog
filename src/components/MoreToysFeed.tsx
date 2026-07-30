"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Toy } from "@/types/toy";
import { FeedCard } from "./FeedCard";

const PAGE = 6;

export function MoreToysFeed({
  seed,
  showText = true,
}: {
  seed: Toy[];
  showText?: boolean;
}) {
  const [items, setItems] = useState<Toy[]>(() => seed.slice(0, PAGE));
  const cursorRef = useRef(Math.min(PAGE, seed.length));
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (loadingRef.current || seed.length === 0) return;
    loadingRef.current = true;

    const next: Toy[] = [];
    let i = cursorRef.current;
    for (let n = 0; n < PAGE; n++) {
      next.push(seed[i % seed.length]!);
      i += 1;
    }
    cursorRef.current = i;
    setItems((prev) => [...prev, ...next]);

    requestAnimationFrame(() => {
      loadingRef.current = false;
    });
  }, [seed]);

  const seedKey = seed.map((t) => t.id).join(",");

  useEffect(() => {
    setItems(seed.slice(0, PAGE));
    cursorRef.current = Math.min(PAGE, seed.length);
  }, [seed, seedKey]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "480px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  if (seed.length === 0) return null;

  return (
    <section className="mt-10 border-t border-black/5 pt-8" aria-label="More toys">
      <h3 className="mb-5 px-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)] sm:text-3xl">
        More toys
      </h3>
      <div className="toy-feed-grid">
        {items.map((toy, index) => (
          <FeedCard
            key={`${toy.id}-${index}`}
            toy={toy}
            showText={showText}
            index={index}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="h-10 w-full" aria-hidden />
      <p className="mt-2 pb-4 text-center text-sm font-semibold text-[var(--ink-soft)]">
        Keep scrolling — more toys ahead
      </p>
    </section>
  );
}
