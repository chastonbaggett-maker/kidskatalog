"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { usePileNavSettled } from "@/hooks/usePileNavSettled";
import { usePersistHydrated, getStorePersist } from "@/hooks/usePersistHydrated";
import { useCatalogPage } from "@/hooks/useCatalogPage";
import { pingMetrics } from "@/lib/metrics-client";
import { fetchRandomCatalogToys } from "@/lib/catalog-client";
import type { CatalogPageResult } from "@/lib/catalog-query";
import {
  CRAZY_CARD_FLASH_MS,
  CRAZY_FLASH_INTERVAL_MS,
  preloadImages,
} from "@/lib/crazy-mode-timing";
import { planCrazyFlash, useCrazyLightning } from "@/hooks/useCrazyLightning";
import { isKartEffectBlocked } from "@/lib/kart-effect-guard";
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
  const crazyHydrated = usePersistHydrated(getStorePersist(useCrazyModeStore));
  const pileHydrated = usePersistHydrated(getStorePersist(useToyPileModeStore));
  const crazyMode = useCrazyModeStore((s) => s.crazyMode);
  const setCrazyMode = useCrazyModeStore((s) => s.setCrazyMode);
  const toggleCrazyMode = useCrazyModeStore((s) => s.toggleCrazyMode);
  const toyPileMode = useToyPileModeStore((s) => s.toyPileMode);
  const setToyPileMode = useToyPileModeStore((s) => s.setToyPileMode);
  const enterPhase = useToyPileModeStore((s) => s.enterPhase);
  const startEnterTransition = useToyPileModeStore((s) => s.startEnterTransition);
  const resetTransition = useToyPileModeStore((s) => s.resetTransition);
  const skipToPileResting = useToyPileModeStore((s) => s.skipToPileResting);

  const crazyOn = crazyHydrated && crazyMode;
  const pileOn = pileHydrated && toyPileMode;

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
    mergeToys,
    hasMore,
    loading,
    loadMore,
  } = catalog;

  const isChromePhase = isPileChromePhase(enterPhase);
  const isTransitioning = isPileTransitioning(enterPhase);
  const showFilterChrome = !pileOn && !isChromePhase;

  usePileEnterTransition();

  const revealGateOpen = usePileRevealGate();
  const pileHeaderActive = pileOn && !isChromePhase && revealGateOpen;
  const pileHeaderVisible = usePileEnterReveal(pileHeaderActive);
  const pileShelfMounted = pileHeaderActive;
  const pileNavSettled = usePileNavSettled(pileHeaderVisible);
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
  const [crazyFlashSlots, setCrazyFlashSlots] = useState<number[]>([]);
  const [shelfMode, setShelfMode] = useState<ShelfMode>("hidden");
  const [compactShelfBlocked, setCompactShelfBlocked] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const filterCrazyBtnRef = useRef<HTMLButtonElement>(null);
  const shelfCrazyBtnRef = useRef<HTMLButtonElement>(null);
  const shelfWantedRef = useRef(false);
  const blockCompactShelfRef = useRef(false);
  const crazyFlashCountRef = useRef(0);
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

  const { flash: flashScreen, portal: flashPortal } = useCrazyLightning();

  const catalogFilters = useMemo(
    () => ({ category, audience, age, q: query }),
    [category, audience, age, query],
  );

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

  useEffect(() => {
    if (!crazyOn) {
      setCrazyFlash(false);
      setCrazyFlashSlots([]);
    }
  }, [crazyOn]);

  useEffect(() => {
    if (!crazyOn || pileOn) return;

    let flashTimer: number | undefined;
    let cancelled = false;

    const flash = async () => {
      const scroller = scrollerRef.current;
      if (!scroller || cancelled) return;

      if (isKartEffectBlocked()) return;

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
      const currentOrder =
        displayIdsRef.current.length > 0 ? [...displayIdsRef.current] : displayIds;

      const randomToys = await fetchRandomCatalogToys(
        catalogFilters,
        slotIndices.length,
        nextKey,
      );
      if (
        cancelled ||
        randomToys.length === 0 ||
        isKartEffectBlocked()
      ) {
        return;
      }

      const nextOrder = [...currentOrder];
      slotIndices.forEach((slotIndex, index) => {
        const toy = randomToys[index];
        if (!toy || slotIndex < 0 || slotIndex >= nextOrder.length) return;
        nextOrder[slotIndex] = toy.id;
      });

      mergeToys(randomToys);
      preloadImages(randomToys.map((toy) => toy.image));

      flashScreen(flashX, flashY);
      setCrazyFlash(true);
      replaceDisplayIds(nextOrder);
      setCrazyFlashSlots(slotIndices);

      flashTimer = window.setTimeout(() => {
        setCrazyFlash(false);
        setCrazyFlashSlots([]);
      }, CRAZY_CARD_FLASH_MS);
    };

    crazyFlashCountRef.current = 0;
    void flash();
    const id = window.setInterval(() => {
      void flash();
    }, CRAZY_FLASH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (flashTimer) window.clearTimeout(flashTimer);
    };
  }, [
    crazyOn,
    pileOn,
    catalogFilters,
    displayIds,
    flashScreen,
    mergeToys,
    replaceDisplayIds,
  ]);

  const handleLoadMore = useCallback(() => {
    if (isKartEffectBlocked()) return;
    void loadMore();
  }, [loadMore]);

  const visibleChunks = useMemo(() => {
    const chunks: Toy[][] = [];
    for (let i = 0; i < displayed.length; i += FEED_PAGE_SIZE) {
      chunks.push(displayed.slice(i, i + FEED_PAGE_SIZE));
    }
    return chunks;
  }, [displayed]);

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
    onRandomize: () => {
      replaceDisplayIds(shuffleWithSeed(displayIdsRef.current, Date.now()));
    },
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
              active={hasMore && !loading}
              onLoad={handleLoadMore}
            />
          )}
        </Fragment>
      ))}
      {!loading && displayed.length === 0 && (
        <p className="col-span-full mx-4 rounded-[2rem] bg-white px-6 py-12 text-center text-[var(--ink-soft)] shadow-sm">
          No toys match. Try another search.
        </p>
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
              crazyMode={crazyOn && pileNavSettled}
              crazyBtnRef={filterCrazyBtnRef}
              onCrazyFlash={setCrazyFlash}
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
