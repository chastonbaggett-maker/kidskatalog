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

/** Synced with `.filter-crazy-btn--active` lightning flash cycle. */
const CRAZY_FLASH_MS = 2200;

export function BrowseFeed({ toys }: { toys: Toy[] }) {
  const audience = useAccentStore((s) => s.audience);
  const setAudience = useAccentStore((s) => s.setAudience);
  const [query, setQuery] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [showText, setShowText] = useState(true);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [crazyMode, setCrazyMode] = useState(false);
  const [crazyFlash, setCrazyFlash] = useState(false);
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

  useEffect(() => {
    setShuffleKey(0);
    setCrazyMode(false);
  }, [query, audience, age, toys]);

  useEffect(() => {
    if (!crazyMode) return;

    let flashTimer: number | undefined;

    const flash = () => {
      setShuffleKey((k) => k + 1);
      setCrazyFlash(true);
      flashTimer = window.setTimeout(() => setCrazyFlash(false), 380);
    };

    flash();
    const id = window.setInterval(flash, CRAZY_FLASH_MS);
    return () => {
      window.clearInterval(id);
      if (flashTimer) window.clearTimeout(flashTimer);
    };
  }, [crazyMode]);

  useEffect(() => {
    if (!crazyMode) setCrazyFlash(false);
  }, [crazyMode]);

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

  const displayed = useMemo(() => {
    if (shuffleKey === 0) return filtered;

    const shuffled = [...filtered];
    let seed = shuffleKey;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, [filtered, shuffleKey]);

  const shelfActive = shelfMode === "shown" || shelfMode === "leaving";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Compact shelf — glides down when expanded header scrolls away */}
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
        className="page-scroll star-field min-h-0 flex-1"
      >
        {/* Header, filters, and categories scroll with the feed */}
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
              onRandomize={() => setShuffleKey((k) => k + 1)}
              crazyMode={crazyMode}
              onCrazyModeToggle={() => setCrazyMode((v) => !v)}
              crazyFlash={crazyFlash}
            />
            <ThumbCarousel />
          </div>
        </div>

        <div
          className={`toy-feed-grid scroll-pad-bottom pt-4 ${
            crazyMode ? "toy-feed-grid--crazy" : ""
          } ${crazyFlash ? "toy-feed-grid--crazy-flash" : ""}`}
        >
          {displayed.map((toy, index) => (
            <FeedCard
              key={toy.id}
              toy={toy}
              showText={showText}
              index={index}
            />
          ))}
          {displayed.length === 0 && (
            <p className="col-span-full mx-4 rounded-[2rem] bg-white px-6 py-12 text-center text-[var(--ink-soft)] shadow-sm">
              No toys match. Try another search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
