"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { useCrazyRandomizeLoop } from "@/hooks/useCrazyLightning";
import { useNearViewportMount } from "@/hooks/useNearViewportMount";
import { isKartEffectBlocked } from "@/lib/kart-effect-guard";
import { shuffleWithSeed } from "@/lib/shuffle";
import { useCatalogPage } from "@/hooks/useCatalogPage";
import type { CatalogPageResult } from "@/lib/catalog-query";
import { FeedCard } from "./FeedCard";

const PAGE = 6;

export function MoreToysFeed({
  excludeToyId,
  initialPage,
  showText = true,
  sectionRef,
  crazyMode = false,
  crazyEffectsActive = false,
  scrollerRef,
  crazyBtnRef,
  onCrazyFlash,
}: {
  excludeToyId: string;
  initialPage?: CatalogPageResult;
  showText?: boolean;
  sectionRef?: RefObject<HTMLElement | null>;
  crazyMode?: boolean;
  crazyEffectsActive?: boolean;
  scrollerRef?: RefObject<HTMLElement | null>;
  crazyBtnRef?: RefObject<HTMLButtonElement | null>;
  onCrazyFlash?: (active: boolean) => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const displayIdsRef = useRef<string[]>([]);
  const localSectionRef = useRef<HTMLElement>(null);
  const mergedSectionRef = sectionRef ?? localSectionRef;
  const userScrolledRef = useRef(false);
  const loadReadyRef = useRef(false);

  const catalog = useCatalogPage({
    excludeId: excludeToyId,
    limit: PAGE,
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

  useEffect(() => {
    displayIdsRef.current = displayIds;
  }, [displayIds]);

  const handleRandomize = useCallback(() => {
    replaceDisplayIds(shuffleWithSeed(displayIdsRef.current, Date.now()));
  }, [replaceDisplayIds]);

  const crazyButtonRefs = useMemo(() => [crazyBtnRef], [crazyBtnRef]);

  const { portal: flashPortal } = useCrazyRandomizeLoop({
    active: crazyMode && crazyEffectsActive,
    buttonRefs: crazyButtonRefs,
    onRandomize: handleRandomize,
    onButtonFlash: onCrazyFlash,
  });

  useEffect(() => {
    const root = scrollerRef?.current;
    if (!root) {
      loadReadyRef.current = true;
      return;
    }

    userScrolledRef.current = root.scrollTop > 0;
    const markScroll = () => {
      userScrolledRef.current = true;
    };
    root.addEventListener("scroll", markScroll, { passive: true });

    const readyTimer = window.setTimeout(() => {
      loadReadyRef.current = true;
    }, 600);

    return () => {
      root.removeEventListener("scroll", markScroll);
      window.clearTimeout(readyTimer);
    };
  }, [scrollerRef]);

  const guardedLoadMore = useCallback(() => {
    if (isKartEffectBlocked()) return;
    void loadMore();
  }, [loadMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const root = scrollerRef?.current ?? null;
    let loadTimer: number | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        if (root && (!loadReadyRef.current || !userScrolledRef.current)) return;

        if (isKartEffectBlocked()) return;

        if (loadTimer) window.clearTimeout(loadTimer);
        loadTimer = window.setTimeout(() => {
          if (isKartEffectBlocked()) return;
          guardedLoadMore();
        }, 150);
      },
      { root, rootMargin: root ? "120px 0px" : "320px 0px", threshold: 0.01 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (loadTimer) window.clearTimeout(loadTimer);
    };
  }, [guardedLoadMore, scrollerRef]);

  const gridClassName = useMemo(
    () =>
      ["toy-feed-grid", crazyMode ? "toy-feed-grid--crazy" : ""]
        .filter(Boolean)
        .join(" "),
    [crazyMode],
  );

  const cardsMounted = useNearViewportMount(mergedSectionRef, scrollerRef);

  return (
    <>
      <section
        ref={mergedSectionRef}
        className="more-toys-feed mt-10 border-t border-black/5 pt-8"
        aria-label="More toys"
      >
        <h3 className="mb-5 px-4 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)] sm:px-6 lg:px-8 sm:text-3xl">
          More toys
        </h3>
        {displayed.length === 0 && !loading ? (
          <p className="px-4 text-sm text-[var(--ink-soft)] sm:px-6 lg:px-8">
            More toys coming soon.
          </p>
        ) : cardsMounted ? (
          <div className={gridClassName}>
            {displayed.map((toy, index) => (
              <FeedCard
                key={`more-slot-${index}`}
                toy={toy}
                showText={showText}
                index={index}
                slotIndex={index}
                animateEnter={false}
                photoLoading="eager"
              />
            ))}
          </div>
        ) : (
          <div className="more-toys-feed__placeholder h-[28rem] w-full" aria-hidden />
        )}
        <div ref={sentinelRef} className="h-10 w-full" aria-hidden />
        {hasMore && (
          <p className="more-toys-feed__hint mt-2 pb-4 text-center text-sm font-semibold text-[var(--ink-soft)]">
            Keep scrolling — more toys ahead
          </p>
        )}
      </section>
      {flashPortal}
    </>
  );
}
