"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CategoryId, Toy } from "@/types/toy";
import { useAccentStore } from "@/lib/accent-store";
import { useCrazyModeStore, crazyModeRootClass, crazyModeScrollClass } from "@/lib/crazy-mode-store";
import {
  isPileChromePhase,
  isPileTransitioning,
  useToyPileModeStore,
  toyPileRootClass,
} from "@/lib/toy-pile-store";
import { prefersReducedMotion } from "@/lib/pile-transition-utils";
import { usePileEnterTransition } from "@/hooks/usePileEnterTransition";
import { usePileEnterReveal } from "@/hooks/usePileEnterReveal";
import { usePileRevealGate } from "@/hooks/usePileRevealGate";
import { usePileNavModeRowTarget } from "@/hooks/usePileNavModeRowTarget";
import { useCatalogPage } from "@/hooks/useCatalogPage";
import { pingMetrics } from "@/lib/metrics-client";
import type { CatalogPageResult } from "@/lib/catalog-query";
import { useCrazyRandomizeLoop } from "@/hooks/useCrazyLightning";
import { isKartEffectBlocked } from "@/lib/kart-effect-guard";
import { shuffleWithSeed } from "@/lib/shuffle";
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

function pileFilterSeed(
  category: CategoryId | undefined,
  audience: string,
  age: number | null,
  query: string,
) {
  const key = `${category ?? ""}|${audience}|${age ?? ""}|${query}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Props = {
  category?: CategoryId;
  initialPage?: CatalogPageResult;
};

export function BrowseFeed({ category, initialPage }: Props) {
  const audience = useAccentStore((s) => s.audience);
  const setAudience = useAccentStore((s) => s.setAudience);
  const [query, setQuery] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [showText, setShowText] = useState(true);
  const crazyMode = useCrazyModeStore((s) => s.crazyMode);
  const setCrazyMode = useCrazyModeStore((s) => s.setCrazyMode);
  const toggleCrazyMode = useCrazyModeStore((s) => s.toggleCrazyMode);
  const toyPileMode = useToyPileModeStore((s) => s.toyPileMode);
  const setToyPileMode = useToyPileModeStore((s) => s.setToyPileMode);
  const enterPhase = useToyPileModeStore((s) => s.enterPhase);
  const startEnterTransition = useToyPileModeStore((s) => s.startEnterTransition);
  const resetTransition = useToyPileModeStore((s) => s.resetTransition);
  const skipToPileResting = useToyPileModeStore((s) => s.skipToPileResting);

  const crazyOn = crazyMode;
  const pileOn = toyPileMode;
  const filterSeed = useMemo(
    () => pileFilterSeed(category, audience, age, query),
    [category, audience, age, query],
  );

  const catalog = useCatalogPage({
    category,
    audience,
    age,
    q: query,
    limit: FEED_PAGE_SIZE,
    initialPage,
  });

  const {
    displayed,
    displayIds,
    replaceDisplayIds,
    hasMore,
    loading,
    loadMore,
  } = catalog;

  // Drain every filter-matching toy into the pile (full catalog when unfiltered).
  useEffect(() => {
    if (!pileOn || loading || !hasMore) return;
    void loadMore();
  }, [pileOn, loading, hasMore, loadMore, displayIds.length]);

  const isChromePhase = isPileChromePhase(enterPhase);
  const isTransitioning = isPileTransitioning(enterPhase);
  const showFilterChrome = !pileOn && !isChromePhase;

  usePileEnterTransition();

  const revealGateOpen = usePileRevealGate();
  const pileHeaderActive = pileOn && !isChromePhase && revealGateOpen;
  const pileHeaderVisible = usePileEnterReveal(pileHeaderActive);
  const pileShelfMounted = pileHeaderActive;
  const pileModeRowTarget = usePileNavModeRowTarget();
  const [chromeExiting, setChromeExiting] = useState(false);
  const [feedExiting, setFeedExiting] = useState(false);

  useEffect(() => {
    if (isChromePhase) {
      setChromeExiting(false);
      setFeedExiting(false);
      const id = requestAnimationFrame(() => {
        setChromeExiting(true);
        setFeedExiting(true);
      });
      return () => cancelAnimationFrame(id);
    }
    setChromeExiting(false);
    setFeedExiting(false);
  }, [isChromePhase]);

  const [crazyFlash, setCrazyFlash] = useState(false);
  const [shuffleNonce, setShuffleNonce] = useState(0);
  const [shelfMode, setShelfMode] = useState<ShelfMode>("hidden");
  const [compactShelfBlocked, setCompactShelfBlocked] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const filterCrazyBtnRef = useRef<HTMLButtonElement>(null);
  const shelfCrazyBtnRef = useRef<HTMLButtonElement>(null);
  const shelfWantedRef = useRef(false);
  const blockCompactShelfRef = useRef(false);
  const displayIdsRef = useRef<string[]>([]);
  const prevToyPileModeRef = useRef(false);

  useEffect(() => {
    displayIdsRef.current = displayIds;
  }, [displayIds]);

  useEffect(() => {
    const enteringPile = pileOn && !prevToyPileModeRef.current;
    prevToyPileModeRef.current = pileOn;
    if (enteringPile) {
      setShowText(false);
    }
  }, [pileOn]);

  const blockCompactShelf = useCallback(() => {
    blockCompactShelfRef.current = true;
    setCompactShelfBlocked(true);
    shelfWantedRef.current = false;
    setShelfMode("hidden");
  }, []);

  const exitPileMode = useCallback(() => {
    blockCompactShelfRef.current = false;
    setCompactShelfBlocked(false);
    setToyPileMode(false);
    resetTransition();
  }, [setToyPileMode, resetTransition]);

  const handleToyPileModeToggle = useCallback(() => {
    if (pileOn) {
      exitPileMode();
      return;
    }
    if (enterPhase !== "idle") return;

    blockCompactShelf();

    if (prefersReducedMotion()) {
      skipToPileResting();
      return;
    }

    startEnterTransition();
  }, [
    pileOn,
    enterPhase,
    exitPileMode,
    blockCompactShelf,
    skipToPileResting,
    startEnterTransition,
  ]);

  const handleCrazyModeToggle = useCallback(() => {
    if (!crazyOn) {
      pingMetrics("crazy_mode");
    }
    toggleCrazyMode();
  }, [crazyOn, toggleCrazyMode]);

  const handleRandomize = useCallback(() => {
    replaceDisplayIds(shuffleWithSeed(displayIdsRef.current, Date.now()));
    // Pile keeps its own spiral order — bump so it reshuffles with the feed.
    setShuffleNonce((n) => n + 1);
  }, [replaceDisplayIds]);

  const crazyButtonRefs = useMemo(
    () => [filterCrazyBtnRef, shelfCrazyBtnRef],
    [],
  );

  const { portal: flashPortal } = useCrazyRandomizeLoop({
    active: crazyOn,
    buttonRefs: crazyButtonRefs,
    onRandomize: handleRandomize,
    onButtonFlash: setCrazyFlash,
  });

  useEffect(() => {
    if (isChromePhase || pileOn) {
      blockCompactShelf();
    }
  }, [isChromePhase, pileOn, blockCompactShelf]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const chrome = chromeRef.current;
    if (!scroller || !chrome || isChromePhase || pileOn) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (blockCompactShelfRef.current) return;
        if (useToyPileModeStore.getState().enterPhase !== "idle") return;
        if (useToyPileModeStore.getState().toyPileMode) return;

        const want = !entry.isIntersecting || entry.intersectionRatio < 0.08;
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
  }, [isChromePhase, pileOn]);

  useEffect(() => {
    if (shelfMode !== "leaving" || blockCompactShelfRef.current) return;
    const t = window.setTimeout(() => {
      if (!shelfWantedRef.current && !blockCompactShelfRef.current) {
        setShelfMode("hidden");
      }
    }, 320);
    return () => window.clearTimeout(t);
  }, [shelfMode]);

  const handleLoadMore = useCallback(() => {
    if (isKartEffectBlocked()) return;
    void loadMore();
  }, [loadMore]);

  const gridClassName = ["toy-feed-grid", crazyOn ? "toy-feed-grid--crazy" : ""]
    .filter(Boolean)
    .join(" ");

  const shelfActive = shelfMode === "shown" || shelfMode === "leaving";

  const showCompactShelf =
    !compactShelfBlocked && enterPhase === "idle" && !pileOn && !isChromePhase;

  const filterRowProps = {
    audience,
    onAudienceChange: setAudience,
    showText,
    onShowTextChange: setShowText,
    age,
    onAgeChange: setAge,
    onRandomize: handleRandomize,
    crazyMode: crazyOn,
    onCrazyModeToggle: handleCrazyModeToggle,
    crazyFlash,
    crazyBtnRef: filterCrazyBtnRef,
    onToyPileModeToggle: handleToyPileModeToggle,
  } as const;

  const filterRow = <FilterRow {...filterRowProps} toyPileMode={false} />;
  const pileModeFilterRow = <FilterRow {...filterRowProps} toyPileMode />;

  const pileShelfHeader = (
    <ShelfHeader
      rounded={false}
      className="shelf-header--pile"
      trailing={
        <ToyPileModeButton
          active
          className="shelf-crazy-btn"
          onClick={exitPileMode}
        />
      }
    />
  );

  const showFeedLayer = !pileOn;
  const showBrowseChrome = !pileOn;

  const feedCards = (
    <div
      className={`pile-feed-layer scroll-pad-bottom space-y-6 pt-4${
        feedExiting ? " is-exiting" : ""
      }`}
    >
      {/* One continuous grid so load-more fills empty cells on 2/3-col layouts. */}
      <div className={gridClassName}>
        {displayed.map((toy, index) => (
          <FeedCard
            key={`feed-slot-${toy.id}`}
            toy={toy}
            showText={showText}
            index={index}
            slotIndex={index}
          />
        ))}
      </div>
      {hasMore && (
        <FeedAutoLoadMore
          scrollerRef={scrollerRef}
          active={hasMore && !loading}
          onLoad={handleLoadMore}
        />
      )}
      {!loading && displayed.length === 0 && (
        <div className="shelf-panel col-span-full mx-4">
          <p className="shelf-panel__surface px-6 py-12 text-center text-[var(--ink-soft)]">
            No toys match. Try another search.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`relative shelf-page flex min-h-0 flex-1 flex-col ${
        isTransitioning ? "browse-feed--pile-entering" : ""
      } ${pileOn ? "" : "star-field"} ${crazyModeRootClass(crazyOn)} ${toyPileRootClass(pileOn)}`}
    >
      {pileHeaderActive && (
        <div
          className={`pile-header-enter pointer-events-none absolute inset-x-0 top-0 z-50 ${
            pileHeaderVisible ? "is-visible" : ""
          }`}
        >
          <div className="pointer-events-auto">{pileShelfHeader}</div>
        </div>
      )}

      {showCompactShelf && (
        <div
          className={`browse-shelf-overlay ${
            shelfMode === "shown" ? "is-visible" : ""
          } ${shelfMode === "leaving" ? "is-leaving" : ""}`}
          aria-hidden={!shelfActive || shelfMode === "leaving"}
        >
          <ShelfHeader
            trailing={
              crazyOn ? (
                <CrazyModeButton
                  ref={shelfCrazyBtnRef}
                  className="shelf-crazy-btn"
                  crazyMode
                  crazyFlash={crazyFlash}
                  onClick={() => setCrazyMode(false)}
                />
              ) : undefined
            }
          />
        </div>
      )}

      <div
        ref={scrollerRef}
        className={`min-h-0 flex-1 ${
          pileOn
            ? "toy-pile-shell relative flex min-h-0 flex-1 flex-col overflow-hidden"
            : `page-scroll star-field ${crazyModeScrollClass(crazyOn)}${
                isChromePhase ? " overflow-hidden" : ""
              }`
        }`}
      >
        {pileOn && (
          <div className="toy-pile-grid-host star-field flex min-h-0 flex-1 flex-col">
            <ToyPileGrid
              toys={displayed}
              showText={showText}
              filterSeed={filterSeed}
              shuffleNonce={shuffleNonce}
            />
          </div>
        )}

        {showFeedLayer && (
          <>
            {showBrowseChrome && (
              <div
                ref={chromeRef}
                className={`pile-chrome-exit-host relative z-20 shrink-0 ${
                  chromeExiting ? "is-exiting" : ""
                }`}
              >
                <FeedHeader query={query} onQueryChange={setQuery} />
                <div
                  className={crazyOn ? "browse-controls" : "browse-chrome-panel"}
                >
                  {showFilterChrome && filterRow}
                  <ThumbCarousel />
                </div>
              </div>
            )}
            {feedCards}
          </>
        )}
      </div>
      {flashPortal}
      {pileShelfMounted &&
        pileModeRowTarget &&
        createPortal(pileModeFilterRow, pileModeRowTarget)}
    </div>
  );
}
