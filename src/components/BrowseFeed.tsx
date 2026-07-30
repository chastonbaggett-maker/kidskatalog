"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Audience, Toy } from "@/types/toy";
import { FeedHeader } from "./FeedHeader";
import { FilterRow } from "./FilterRow";
import { ThumbCarousel } from "./ThumbCarousel";
import { FeedCard } from "./FeedCard";
import { ShelfHeader } from "./ShelfHeader";

export function BrowseFeed({ toys }: { toys: Toy[] }) {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [showText, setShowText] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const chrome = chromeRef.current;
    if (!scroller || !chrome) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Collapse once most of the expanded chrome has left the top
        const next = entry.intersectionRatio < 0.35 || entry.boundingClientRect.top < -24;
        setCollapsed(next);
      },
      {
        root: scroller,
        threshold: [0, 0.15, 0.35, 0.5, 0.75, 1],
        rootMargin: "-8px 0px 0px 0px",
      },
    );

    observer.observe(chrome);
    return () => observer.disconnect();
  }, []);

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
      return audienceOk && queryOk;
    });
  }, [toys, query, audience]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
      >
        {/* Expanded chrome scrolls away with the feed (no sticky height change) */}
        <div ref={chromeRef} className="relative z-20">
          <FeedHeader query={query} onQueryChange={setQuery} />
          <div className="bg-white">
            <FilterRow
              audience={audience}
              onAudienceChange={setAudience}
              showText={showText}
              onShowTextChange={setShowText}
            />
            <ThumbCarousel />
          </div>
        </div>

        {/* Simple shelf fades in and sticks — overlay, no layout jump */}
        <div className="sticky top-0 z-30 h-0 overflow-visible">
          <div
            className={`browse-shelf-enter absolute inset-x-0 top-0 ${
              collapsed ? "is-visible pointer-events-auto" : "pointer-events-none"
            }`}
            aria-hidden={!collapsed}
          >
            <ShelfHeader />
          </div>
        </div>

        <div className="flex flex-col gap-10 pb-28 pt-4">
          {filtered.map((toy, index) => (
            <FeedCard
              key={toy.id}
              toy={toy}
              showText={showText}
              index={index}
            />
          ))}
          {filtered.length === 0 && (
            <p className="mx-4 rounded-[2rem] bg-white px-6 py-12 text-center text-[var(--ink-soft)] shadow-sm">
              No toys match. Try another search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
