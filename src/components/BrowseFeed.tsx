"use client";

import { useCallback, useMemo, useRef, useState, type UIEvent } from "react";
import type { Audience, Toy } from "@/types/toy";
import { FeedHeader } from "./FeedHeader";
import { FilterRow } from "./FilterRow";
import { ThumbCarousel } from "./ThumbCarousel";
import { FeedCard } from "./FeedCard";
import { FloatingActions } from "./FloatingActions";
import { ShelfHeader } from "./ShelfHeader";

const COLLAPSE_AT = 56;
const EXPAND_AT = 8;

export function BrowseFeed({ toys }: { toys: Toy[] }) {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [showText, setShowText] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const onScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const scroller = e.currentTarget;
    const y = scroller.scrollTop;
    const next = collapsedRef.current ? y > EXPAND_AT : y > COLLAPSE_AT;
    if (next === collapsedRef.current) return;

    const before = headerRef.current?.offsetHeight ?? 0;
    collapsedRef.current = next;
    setCollapsed(next);

    // Keep the feed from jumping when the chrome height changes
    requestAnimationFrame(() => {
      const after = headerRef.current?.offsetHeight ?? 0;
      scroller.scrollTop = Math.max(0, y - (before - after));
    });
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
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={onScroll}
      >
        <div ref={headerRef} className="sticky top-0 z-30">
          {collapsed ? (
            <ShelfHeader />
          ) : (
            <>
              <FeedHeader
                query={query}
                onQueryChange={setQuery}
                sticky={false}
              />
              <div className="bg-white">
                <FilterRow
                  audience={audience}
                  onAudienceChange={setAudience}
                  showText={showText}
                  onShowTextChange={setShowText}
                />
                <ThumbCarousel />
              </div>
            </>
          )}
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

      <FloatingActions />
    </div>
  );
}
