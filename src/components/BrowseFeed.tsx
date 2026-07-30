"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Audience, Toy } from "@/types/toy";
import { FeedHeader } from "./FeedHeader";
import { FilterRow } from "./FilterRow";
import { ThumbCarousel } from "./ThumbCarousel";
import { FeedCard } from "./FeedCard";
import { ShelfHeader } from "./ShelfHeader";

const COLLAPSE_AT = 48;
const EXPAND_AT = 10;

export function BrowseFeed({ toys }: { toys: Toy[] }) {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [showText, setShowText] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [heights, setHeights] = useState({ feed: 0, shelf: 0 });
  const collapsedRef = useRef(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const feedHeaderRef = useRef<HTMLDivElement>(null);
  const shelfHeaderRef = useRef<HTMLDivElement>(null);

  const syncCollapsed = useCallback((y: number) => {
    const next = collapsedRef.current ? y > EXPAND_AT : y > COLLAPSE_AT;
    if (next === collapsedRef.current) return;
    collapsedRef.current = next;
    setCollapsed(next);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => syncCollapsed(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [syncCollapsed]);

  useLayoutEffect(() => {
    const feed = feedHeaderRef.current;
    const shelf = shelfHeaderRef.current;
    if (!feed || !shelf) return;

    const measure = () => {
      setHeights({
        feed: feed.scrollHeight,
        shelf: shelf.scrollHeight,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(feed);
    ro.observe(shelf);
    return () => ro.disconnect();
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

  const headerHeight = collapsed
    ? heights.shelf || undefined
    : heights.feed || undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="z-30 shrink-0">
        <div
          className="browse-header-swap relative overflow-hidden"
          style={headerHeight ? { height: headerHeight } : undefined}
        >
          <div
            ref={feedHeaderRef}
            className={`browse-header-panel ${
              collapsed ? "is-hidden" : "is-shown"
            }`}
            aria-hidden={collapsed}
          >
            <FeedHeader
              query={query}
              onQueryChange={setQuery}
              inert={collapsed}
            />
          </div>
          <div
            ref={shelfHeaderRef}
            className={`browse-header-panel browse-header-panel--shelf ${
              collapsed ? "is-shown" : "is-hidden"
            }`}
            aria-hidden={!collapsed}
          >
            <ShelfHeader />
          </div>
        </div>

        <div
          className={`browse-filters-collapse ${
            collapsed ? "is-collapsed" : ""
          }`}
          aria-hidden={collapsed}
        >
          <div className="browse-filters-collapse__inner bg-white">
            <FilterRow
              audience={audience}
              onAudienceChange={setAudience}
              showText={showText}
              onShowTextChange={setShowText}
            />
            <ThumbCarousel />
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
      >
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
