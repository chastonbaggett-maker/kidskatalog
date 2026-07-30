"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Audience, Toy } from "@/types/toy";
import { FeedHeader } from "./FeedHeader";
import { FilterRow } from "./FilterRow";
import { ThumbCarousel } from "./ThumbCarousel";
import { FeedCard } from "./FeedCard";
import { ShelfHeader } from "./ShelfHeader";

/** Scroll distance (px) over which the chrome fully collapses */
const COLLAPSE_RANGE = 140;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function BrowseFeed({ toys }: { toys: Toy[] }) {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [showText, setShowText] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const feedHeaderRef = useRef<HTMLDivElement>(null);
  const shelfHeaderRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const filtersInnerRef = useRef<HTMLDivElement>(null);
  const heightsRef = useRef({ feed: 0, shelf: 0, filters: 0 });
  const progressRef = useRef(0);
  const rafRef = useRef(0);

  const applyProgress = (raw: number) => {
    const p = easeInOutCubic(Math.min(1, Math.max(0, raw)));
    progressRef.current = p;

    const { feed, shelf, filters } = heightsRef.current;
    const chrome = chromeRef.current;
    const feedEl = feedHeaderRef.current;
    const shelfEl = shelfHeaderRef.current;
    const filtersEl = filtersRef.current;
    if (!chrome || !feedEl || !shelfEl || !filtersEl) return;

    const headerH = feed + (shelf - feed) * p;
    chrome.style.height = `${headerH}px`;

    // Soft crossfade — shelf fades in a bit later than feed fades out
    const feedOpacity = 1 - Math.min(1, p / 0.72);
    const shelfOpacity = Math.max(0, (p - 0.28) / 0.72);
    feedEl.style.opacity = String(feedOpacity);
    feedEl.style.transform = `translate3d(0, ${-6 * p}px, 0)`;
    shelfEl.style.opacity = String(shelfOpacity);
    shelfEl.style.transform = `translate3d(0, ${(1 - p) * 10}px, 0)`;

    filtersEl.style.height = `${filters * (1 - p)}px`;
    filtersEl.style.opacity = String(1 - Math.min(1, p * 1.15));

    const nextCollapsed = p > 0.92;
    setCollapsed((prev) => (prev === nextCollapsed ? prev : nextCollapsed));
  };

  useLayoutEffect(() => {
    const feed = feedHeaderRef.current;
    const shelf = shelfHeaderRef.current;
    const filtersInner = filtersInnerRef.current;
    if (!feed || !shelf || !filtersInner) return;

    const measure = () => {
      heightsRef.current = {
        feed: feed.scrollHeight,
        shelf: shelf.scrollHeight,
        filters: filtersInner.scrollHeight,
      };
      applyProgress(progressRef.current);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(feed);
    ro.observe(shelf);
    ro.observe(filtersInner);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        applyProgress(el.scrollTop / COLLAPSE_RANGE);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="z-30 shrink-0">
        <div
          ref={chromeRef}
          className="browse-header-swap relative overflow-hidden"
        >
          <div
            ref={feedHeaderRef}
            className="browse-header-panel"
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
            className="browse-header-panel browse-header-panel--shelf"
            aria-hidden={!collapsed}
          >
            <ShelfHeader />
          </div>
        </div>

        <div
          ref={filtersRef}
          className="browse-filters-collapse"
          aria-hidden={collapsed}
          style={{ pointerEvents: collapsed ? "none" : "auto" }}
        >
          <div ref={filtersInnerRef} className="browse-filters-collapse__inner bg-white">
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
