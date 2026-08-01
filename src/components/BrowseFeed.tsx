"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Toy } from "@/types/toy";
import { useAccentStore } from "@/lib/accent-store";
import { useCrazyModeStore, crazyModeRootClass, crazyModeScrollClass } from "@/lib/crazy-mode-store";
import { useToyPileModeStore, toyPileRootClass } from "@/lib/toy-pile-store";
import { pingMetrics } from "@/lib/metrics-client";
import {
  CRAZY_CARD_FLASH_MS,
  CRAZY_FLASH_INTERVAL_MS,
  preloadImages,
  urlsForSwappedSlots,
} from "@/lib/crazy-mode-timing";
import {
  planCrazyFlash,
  assignRandomProductsAt,
  useCrazyLightning,
} from "@/hooks/useCrazyLightning";
import { FeedHeader } from "./FeedHeader";
import { FilterRow } from "./FilterRow";
import { ThumbCarousel } from "./ThumbCarousel";
import { FeedCard } from "./FeedCard";
import { FeedAutoLoadMore } from "./FeedAutoLoadMore";
import { ShelfHeader } from "./ShelfHeader";
import { ToyPileGrid } from "./ToyPileGrid";
import { CrazyModeButton } from "./CrazyModeButton";
import { ToyPileModeButton } from "./ToyPileModeButton";

type ShelfMode = "hidden" | "shown" | "leaving";

const FEED_PAGE_SIZE = 20;

export function BrowseFeed({ toys }: { toys: Toy[] }) {
  const audience = useAccentStore((s) => s.audience);
  const setAudience = useAccentStore((s) => s.setAudience);
  const [query, setQuery] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [showText, setShowText] = useState(true);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [displayIds, setDisplayIds] = useState<string[]>([]);
  const crazyMode = useCrazyModeStore((s) => s.crazyMode);
  const setCrazyMode = useCrazyModeStore((s) => s.setCrazyMode);
  const toggleCrazyMode = useCrazyModeStore((s) => s.toggleCrazyMode);
  const toyPileMode = useToyPileModeStore((s) => s.toyPileMode);
  const setToyPileMode = useToyPileModeStore((s) => s.setToyPileMode);
  const toggleToyPileMode = useToyPileModeStore((s) => s.toggleToyPileMode);

  const handleCrazyModeToggle = useCallback(() => {
    if (!crazyMode) {
      setToyPileMode(false);
      pingMetrics("crazy_mode");
    }
    toggleCrazyMode();
  }, [crazyMode, toggleCrazyMode, setToyPileMode]);

  const handleToyPileModeToggle = useCallback(() => {
    if (!toyPileMode) setCrazyMode(false);
    toggleToyPileMode();
  }, [toyPileMode, toggleToyPileMode, setCrazyMode]);
  const [crazyFlash, setCrazyFlash] = useState(false);
  const [crazyFlashSlots, setCrazyFlashSlots] = useState<number[]>([]);
  const [loadedPages, setLoadedPages] = useState(1);
  const [shelfMode, setShelfMode] = useState<ShelfMode>("hidden");

  const scrollerRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const filterCrazyBtnRef = useRef<HTMLButtonElement>(null);
  const shelfCrazyBtnRef = useRef<HTMLButtonElement>(null);
  const shelfWantedRef = useRef(false);
  const crazyFlashCountRef = useRef(0);
  const displayIdsRef = useRef<string[]>([]);

  const { flash: flashScreen, portal: flashPortal } = useCrazyLightning();

  useEffect(() => {
    const scroller = scrollerRef.current;
    const chrome = chromeRef.current;
    if (!scroller || !chrome) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
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
  const filteredIdsKey = useMemo(() => filteredIds.join("\0"), [filteredIds]);
  const toyImageById = useMemo(
    () => new Map(filtered.map((t) => [t.id, t.image])),
    [filtered],
  );
  const toyImageByIdRef = useRef(toyImageById);

  useEffect(() => {
    toyImageByIdRef.current = toyImageById;
  }, [toyImageById]);

  useEffect(() => {
    displayIdsRef.current = displayIds;
  }, [displayIds]);

  useEffect(() => {
    setDisplayIds(filteredIds);
    setLoadedPages(1);
    if (!crazyMode) {
      setShuffleKey(0);
      setCrazyFlashSlots([]);
    }
  }, [filteredIdsKey, filteredIds, crazyMode, toyPileMode]);

  useEffect(() => {
    if (!crazyMode) return;

    let flashTimer: number | undefined;

    const flash = () => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      crazyFlashCountRef.current += 1;
      const nextKey = crazyFlashCountRef.current;

      const plan = planCrazyFlash(
        scroller,
        filterCrazyBtnRef,
        shelfCrazyBtnRef,
        nextKey,
      );
      if (!plan) return;

      const { slotIndices, flashX, flashY } = plan;
      const prevOrder =
        displayIdsRef.current.length === filteredIds.length &&
        displayIdsRef.current.every((id) => filteredIds.includes(id))
          ? displayIdsRef.current
          : filteredIds;
      const nextOrder = assignRandomProductsAt(
        prevOrder,
        slotIndices,
        filteredIds,
        nextKey,
      );

      preloadImages(
        urlsForSwappedSlots(nextOrder, slotIndices, toyImageByIdRef.current),
      );

      flashScreen(flashX, flashY);
      setCrazyFlash(true);
      setShuffleKey(nextKey);
      setDisplayIds(nextOrder);
      setCrazyFlashSlots(slotIndices);

      flashTimer = window.setTimeout(() => {
        setCrazyFlash(false);
        setCrazyFlashSlots([]);
      }, CRAZY_CARD_FLASH_MS);
    };

    crazyFlashCountRef.current = 0;
    flash();
    const id = window.setInterval(flash, CRAZY_FLASH_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      if (flashTimer) window.clearTimeout(flashTimer);
    };
  }, [crazyMode, filteredIdsKey, filteredIds, flashScreen]);

  useEffect(() => {
    if (!crazyMode) {
      setCrazyFlash(false);
      setCrazyFlashSlots([]);
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

  const totalPages = Math.max(1, Math.ceil(displayed.length / FEED_PAGE_SIZE));
  const visiblePages = Math.min(loadedPages, totalPages);
  const hasMore = visiblePages < totalPages;

  const loadNextPage = useCallback(() => {
    setLoadedPages((pages) => Math.min(pages + 1, totalPages));
  }, [totalPages]);

  const visibleChunks = useMemo(() => {
    const chunks: Toy[][] = [];
    const end = visiblePages * FEED_PAGE_SIZE;
    const visible = displayed.slice(0, end);
    for (let i = 0; i < visible.length; i += FEED_PAGE_SIZE) {
      chunks.push(visible.slice(i, i + FEED_PAGE_SIZE));
    }
    return chunks;
  }, [displayed, visiblePages]);

  const gridClassName = ["toy-feed-grid", crazyMode ? "toy-feed-grid--crazy" : ""]
    .filter(Boolean)
    .join(" ");

  const shelfActive = shelfMode === "shown" || shelfMode === "leaving";

  const filterRow = (
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
      onCrazyModeToggle={handleCrazyModeToggle}
      crazyFlash={crazyFlash}
      crazyBtnRef={filterCrazyBtnRef}
      toyPileMode={toyPileMode}
      onToyPileModeToggle={handleToyPileModeToggle}
    />
  );

  const pileShelfHeader = (
    <ShelfHeader
      rounded={false}
      className="shelf-header--pile"
      trailing={
        <ToyPileModeButton
          active
          className="shelf-crazy-btn"
          onClick={() => setToyPileMode(false)}
        />
      }
    />
  );

  return (
    <div
      className={`relative shelf-page star-field flex min-h-0 flex-1 flex-col ${crazyModeRootClass(crazyMode)} ${toyPileRootClass(toyPileMode)}`}
    >
      <div
        className={`browse-shelf-overlay ${
          shelfMode === "shown" ? "is-visible" : ""
        } ${shelfMode === "leaving" ? "is-leaving" : ""}`}
        aria-hidden={!shelfActive || shelfMode === "leaving"}
      >
        <ShelfHeader
          trailing={
            crazyMode ? (
              <CrazyModeButton
                ref={shelfCrazyBtnRef}
                className="shelf-crazy-btn"
                crazyMode
                crazyFlash={crazyFlash}
                onClick={() => setCrazyMode(false)}
              />
            ) : toyPileMode ? (
              <ToyPileModeButton
                active
                className="shelf-crazy-btn"
                onClick={() => setToyPileMode(false)}
              />
            ) : undefined
          }
        />
      </div>

      <div
        ref={scrollerRef}
        className={`min-h-0 flex-1 ${
          toyPileMode
            ? "toy-pile-shell star-field flex flex-col overflow-hidden"
            : `page-scroll star-field ${crazyModeScrollClass(crazyMode)}`
        }`}
      >
        <div ref={chromeRef} className="relative z-20 shrink-0">
          {toyPileMode ? (
            <>
              {pileShelfHeader}
              <div className="browse-chrome-panel browse-chrome-panel--pile">
                {filterRow}
              </div>
            </>
          ) : (
            <>
              <FeedHeader query={query} onQueryChange={setQuery} />
              <div
                className={
                  crazyMode ? "browse-controls" : "browse-chrome-panel"
                }
              >
                {filterRow}
                <ThumbCarousel />
              </div>
            </>
          )}
        </div>

        {toyPileMode ? (
          <ToyPileGrid toys={displayed} showText={showText} />
        ) : (
        <div className="scroll-pad-bottom space-y-6 pt-4">
          {visibleChunks.map((chunk, chunkIndex) => (
            <Fragment key={`feed-chunk-${chunkIndex}`}>
              <div className={gridClassName}>
                {chunk.map((toy, indexInChunk) => {
                  const slotIndex = chunkIndex * FEED_PAGE_SIZE + indexInChunk;
                  return (
                    <FeedCard
                      key={`feed-slot-${slotIndex}`}
                      toy={toy}
                      showText={showText}
                      index={slotIndex}
                      slotIndex={slotIndex}
                      crazyStrike={crazyFlashSlots.includes(slotIndex)}
                    />
                  );
                })}
              </div>
              {chunkIndex === visibleChunks.length - 1 && hasMore && (
                <FeedAutoLoadMore
                  scrollerRef={scrollerRef}
                  active={hasMore}
                  onLoad={loadNextPage}
                />
              )}
            </Fragment>
          ))}
          {displayed.length === 0 && (
            <p className="col-span-full mx-4 rounded-[2rem] bg-white px-6 py-12 text-center text-[var(--ink-soft)] shadow-sm">
              No toys match. Try another search.
            </p>
          )}
        </div>
        )}
      </div>
      {flashPortal}
    </div>
  );
}

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
