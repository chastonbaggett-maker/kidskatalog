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

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleAlternatingGroup(ids: string[], evenGroup: boolean, seed: number) {
  const next = [...ids];
  const slots = ids
    .map((_, i) => i)
    .filter((i) => (evenGroup ? i % 2 === 0 : i % 2 === 1));
  const shuffled = shuffleWithSeed(
    slots.map((slot) => ids[slot]),
    seed,
  );
  slots.forEach((slot, i) => {
    next[slot] = shuffled[i];
  });
  return next;
}

export function BrowseFeed({ toys }: { toys: Toy[] }) {
  const audience = useAccentStore((s) => s.audience);
  const setAudience = useAccentStore((s) => s.setAudience);
  const [query, setQuery] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [showText, setShowText] = useState(true);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [displayIds, setDisplayIds] = useState<string[]>([]);
  const [crazyMode, setCrazyMode] = useState(false);
  const [crazyFlash, setCrazyFlash] = useState(false);
  const [crazyFlashGroup, setCrazyFlashGroup] = useState<"even" | "odd" | null>(
    null,
  );
  const [shelfMode, setShelfMode] = useState<ShelfMode>("hidden");

  const scrollerRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const shelfWantedRef = useRef(false);
  const crazyFlashCountRef = useRef(0);

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

  const filteredIds = useMemo(() => filtered.map((t) => t.id), [filtered]);

  useEffect(() => {
    setDisplayIds(filteredIds);
    setShuffleKey(0);
    setCrazyMode(false);
    setCrazyFlashGroup(null);
  }, [filteredIds]);

  useEffect(() => {
    if (!crazyMode) return;

    let flashTimer: number | undefined;

    const flash = () => {
      crazyFlashCountRef.current += 1;
      const nextKey = crazyFlashCountRef.current;
      const shuffleEvens = nextKey % 2 === 1;

      setShuffleKey(nextKey);
      setDisplayIds((prev) => {
        const order =
          prev.length === filteredIds.length &&
          prev.every((id) => filteredIds.includes(id))
            ? prev
            : filteredIds;
        return shuffleAlternatingGroup(order, shuffleEvens, nextKey);
      });

      setCrazyFlashGroup(shuffleEvens ? "even" : "odd");
      setCrazyFlash(true);
      flashTimer = window.setTimeout(() => {
        setCrazyFlash(false);
        setCrazyFlashGroup(null);
      }, 380);
    };

    crazyFlashCountRef.current = 0;
    flash();
    const id = window.setInterval(flash, CRAZY_FLASH_MS);
    return () => {
      window.clearInterval(id);
      if (flashTimer) window.clearTimeout(flashTimer);
    };
  }, [crazyMode, filteredIds]);

  useEffect(() => {
    if (!crazyMode) {
      setCrazyFlash(false);
      setCrazyFlashGroup(null);
    }
  }, [crazyMode]);

  const displayed = useMemo(() => {
    const byId = new Map(filtered.map((t) => [t.id, t]));
    const ids =
      shuffleKey === 0 && !crazyMode
        ? filteredIds
        : displayIds.length === filteredIds.length
          ? displayIds
          : filteredIds;
    return ids
      .map((id) => byId.get(id))
      .filter((t): t is Toy => t != null);
  }, [filtered, filteredIds, displayIds, shuffleKey, crazyMode]);

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
              onRandomize={() => {
                setShuffleKey((k) => {
                  const next = k + 1;
                  setDisplayIds((prev) =>
                    shuffleWithSeed(
                      prev.length === filteredIds.length ? prev : filteredIds,
                      next,
                    ),
                  );
                  return next;
                });
              }}
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
          } ${
            crazyFlash && crazyFlashGroup === "even"
              ? "toy-feed-grid--crazy-flash-even"
              : ""
          } ${
            crazyFlash && crazyFlashGroup === "odd"
              ? "toy-feed-grid--crazy-flash-odd"
              : ""
          }`}
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
