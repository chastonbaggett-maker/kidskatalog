"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Audience, Toy } from "@/types/toy";
import { FeedHeader } from "./FeedHeader";
import { FilterRow } from "./FilterRow";
import { ThumbCarousel } from "./ThumbCarousel";
import { FeedCard } from "./FeedCard";
import { ShelfHeader } from "./ShelfHeader";

/** Scroll distance (px) over which the chrome fully collapses */
const COLLAPSE_RANGE = 160;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function BrowseFeed({ toys }: { toys: Toy[] }) {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [age, setAge] = useState<number | null>(null);
  const [showText, setShowText] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const shelfWrapRef = useRef<HTMLDivElement>(null);
  const heightsRef = useRef({ expanded: 0, shelf: 0 });
  const progressRef = useRef(0);
  const rafRef = useRef(0);

  const applyProgress = (raw: number) => {
    const p = clamp01(raw);
    progressRef.current = p;

    const { expanded, shelf } = heightsRef.current;
    const stage = stageRef.current;
    const expandedEl = expandedRef.current;
    const shelfEl = shelfWrapRef.current;
    if (!stage || !expandedEl || !shelfEl || !expanded || !shelf) return;

    // Expanded pack slides up first; simple header glides down after
    const exit = easeInOutCubic(clamp01(p / 0.62));
    const enter = easeOutCubic(clamp01((p - 0.28) / 0.72));

    expandedEl.style.transform = `translate3d(0, ${-expanded * exit}px, 0)`;
    expandedEl.style.opacity = String(1 - exit);
    expandedEl.style.pointerEvents = exit > 0.85 ? "none" : "auto";

    shelfEl.style.transform = `translate3d(0, ${-shelf * (1 - enter)}px, 0)`;
    shelfEl.style.opacity = String(enter);
    shelfEl.style.pointerEvents = enter > 0.85 ? "auto" : "none";

    const stageH = Math.max(
      shelf * enter,
      expanded * (1 - exit) + shelf * enter * 0.15,
    );
    // Settle cleanly at the ends
    if (p <= 0.001) stage.style.height = `${expanded}px`;
    else if (p >= 0.999) stage.style.height = `${shelf}px`;
    else stage.style.height = `${Math.max(stageH, shelf * 0.35)}px`;

    const nextCollapsed = p > 0.9;
    setCollapsed((prev) => (prev === nextCollapsed ? prev : nextCollapsed));
  };

  useLayoutEffect(() => {
    const expandedEl = expandedRef.current;
    const shelfEl = shelfWrapRef.current;
    if (!expandedEl || !shelfEl) return;

    const measure = () => {
      heightsRef.current = {
        expanded: expandedEl.scrollHeight,
        shelf: shelfEl.scrollHeight,
      };
      applyProgress(progressRef.current);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(expandedEl);
    ro.observe(shelfEl);
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
      const ageOk = age == null || (t.ageMin <= age && t.ageMax >= age);
      return audienceOk && queryOk && ageOk;
    });
  }, [toys, query, audience, age]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={stageRef}
        className="browse-chrome-stage relative z-30 shrink-0 overflow-hidden"
      >
        {/* Full browse nav — slides up together */}
        <div
          ref={expandedRef}
          className="browse-chrome-expanded absolute inset-x-0 top-0 w-full will-change-transform"
          aria-hidden={collapsed}
        >
          <FeedHeader
            query={query}
            onQueryChange={setQuery}
            inert={collapsed}
          />
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

        {/* Simple product shelf — glides down into place */}
        <div
          ref={shelfWrapRef}
          className="browse-chrome-shelf absolute inset-x-0 top-0 w-full will-change-transform"
          aria-hidden={!collapsed}
        >
          <ShelfHeader />
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
