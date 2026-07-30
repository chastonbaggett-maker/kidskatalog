"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Toy } from "@/types/toy";
import { useAccentStore } from "@/lib/accent-store";
import { FeedHeader } from "./FeedHeader";
import { FilterRow } from "./FilterRow";
import { ThumbCarousel } from "./ThumbCarousel";
import { FeedCard } from "./FeedCard";
import { ShelfHeader } from "./ShelfHeader";

type ShelfMode = "hidden" | "shown" | "leaving";

export function BrowseFeed({ toys }: { toys: Toy[] }) {
  const audience = useAccentStore((s) => s.audience);
  const setAudience = useAccentStore((s) => s.setAudience);
  const [query, setQuery] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [showText, setShowText] = useState(false);
  const [shelfMode, setShelfMode] = useState<ShelfMode>("hidden");

  const scrollerRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const shelfWantedRef = useRef(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const chrome = chromeRef.current;
    if (!scroller || !chrome) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Show compact shelf once the expanded nav leaves the top of the scroller
        const want =
          !entry.isIntersecting || entry.intersectionRatio < 0.08;
        shelfWantedRef.current = want;
        setShelfMode((prev) => {
          if (want) return "shown";
          if (prev === "shown") return "leaving";
          return prev === "leaving" ? "leaving" : "hidden";
        });
      },
      {
        root: scroller,
        threshold: [0, 0.08, 0.25, 1],
        rootMargin: "0px 0px 0px 0px",
      },
    );

    observer.observe(chrome);
    return () => observer.disconnect();
  }, []);

  // Finish leave fade while staying pinned; cancel if chrome leaves again mid-fade
  useEffect(() => {
    if (shelfMode !== "leaving") return;
    const t = window.setTimeout(() => {
      if (!shelfWantedRef.current) setShelfMode("hidden");
    }, 320);
    return () => window.clearTimeout(t);
  }, [shelfMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return toys.filter((t) => {
      const audienceOk =
        audience === "all" ||
        t.audience === "all" ||
        t.audience === audience;
      const queryOk =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.blurb.toLowerCase().includes(q) ||
        t.category.includes(q);
      const ageOk = age == null || (t.ageMin <= age && t.ageMax >= age);
      return audienceOk && queryOk && ageOk;
    });
  }, [toys, query, audience, age]);

  const shelfActive = shelfMode === "shown" || shelfMode === "leaving";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Fixed to the browse viewport — fade in/out at the top, never rides the category nav */}
      <div
        className={`browse-shelf-overlay ${
          shelfMode === "shown" ? "is-visible" : ""
        } ${shelfMode === "leaving" ? "is-leaving" : ""}`}
        aria-hidden={!shelfActive || shelfMode === "leaving"}
      >
        <ShelfHeader />
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
      >
        {/* Expanded nav scrolls away with the feed — not sticky */}
        <div ref={chromeRef} className="relative z-20">
          <FeedHeader query={query} onQueryChange={setQuery} />
          <div className="bg-white">
            <FilterRow
              audience={audience}
              onAudienceChange={setAudience}
              showText={showText}
              onShowTextChange={setShowText}
              age={age}
              onAgeChange={setAge}
            />
            <ThumbCarousel />
          </div>
        </div>

        <div className="toy-feed-grid pb-28 pt-4">
          {filtered.map((toy, index) => (
            <FeedCard
              key={toy.id}
              toy={toy}
              showText={showText}
              index={index}
            />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full mx-4 rounded-[2rem] bg-white px-6 py-12 text-center text-[var(--ink-soft)] shadow-sm">
              No toys match. Try another search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
