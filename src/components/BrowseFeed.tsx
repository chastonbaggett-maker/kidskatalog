"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Audience, Toy } from "@/types/toy";
import { FeedHeader } from "./FeedHeader";
import { FilterRow } from "./FilterRow";
import { ThumbCarousel } from "./ThumbCarousel";
import { FeedCard } from "./FeedCard";
import { FloatingActions } from "./FloatingActions";

const COLLAPSE_AT = 40;
const EXPAND_AT = 12;

export function BrowseFeed({ toys }: { toys: Toy[] }) {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [showText, setShowText] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

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
      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="sticky top-0 z-30">
          <FeedHeader
            query={query}
            onQueryChange={setQuery}
            collapsed={collapsed}
          />

          <div
            className={`grid bg-white transition-[grid-template-rows,opacity] duration-300 ease-out ${
              collapsed
                ? "pointer-events-none grid-rows-[0fr] opacity-0"
                : "grid-rows-[1fr] opacity-100"
            }`}
            aria-hidden={collapsed}
          >
            <div className="min-h-0 overflow-hidden">
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
