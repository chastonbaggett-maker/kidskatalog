"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Toy } from "@/types/toy";
import {
  CRAZY_CARD_FLASH_MS,
  CRAZY_FLASH_INTERVAL_MS,
  preloadImages,
} from "@/lib/crazy-mode-timing";
import { fetchRandomCatalogToys } from "@/lib/catalog-client";
import { planCrazyFlash, useCrazyLightning } from "@/hooks/useCrazyLightning";
import { useKartStore } from "@/lib/kart-store";
import { useRouteSettled } from "@/hooks/useRouteSettled";
import { useCatalogPage } from "@/hooks/useCatalogPage";
import type { CatalogPageResult } from "@/lib/catalog-query";
import { FeedCard } from "./FeedCard";

const PAGE = 6;
const emptyBtnRef = { current: null } as RefObject<HTMLButtonElement | null>;

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
  const [crazyFlashSlots, setCrazyFlashSlots] = useState<number[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const crazyFlashCountRef = useRef(0);
  const displayIdsRef = useRef<string[]>([]);
  const localSectionRef = useRef<HTMLElement>(null);
  const mergedSectionRef = sectionRef ?? localSectionRef;
  const userScrolledRef = useRef(false);
  const loadReadyRef = useRef(false);
  const routeSettled = useRouteSettled();

  const catalog = useCatalogPage({
    excludeId: excludeToyId,
    limit: PAGE,
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

  const { flash: flashScreen, portal: flashPortal } = useCrazyLightning();

  useEffect(() => {
    displayIdsRef.current = displayIds;
  }, [displayIds]);

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
    const { flyBall, kartAddActive } = useKartStore.getState();
    if (flyBall || kartAddActive > 0) return;
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

        const { flyBall, kartAddActive } = useKartStore.getState();
        if (flyBall || kartAddActive > 0) return;

        if (loadTimer) window.clearTimeout(loadTimer);
        loadTimer = window.setTimeout(() => {
          const state = useKartStore.getState();
          if (state.flyBall || state.kartAddActive > 0) return;
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

  useEffect(() => {
    if (!crazyMode || !crazyEffectsActive) {
      onCrazyFlash?.(false);
      setCrazyFlashSlots([]);
      return;
    }

    const scroller = scrollerRef?.current;
    if (!scroller) return;

    let flashTimer: number | undefined;
    let cancelled = false;

    const flash = async () => {
      const { flyBall, kartAddActive } = useKartStore.getState();
      if (flyBall || kartAddActive > 0 || cancelled) return;

      crazyFlashCountRef.current += 1;
      const nextKey = crazyFlashCountRef.current;

      const plan = planCrazyFlash(
        scroller,
        emptyBtnRef,
        crazyBtnRef ?? emptyBtnRef,
        nextKey,
      );
      if (!plan) return;

      const { slotIndices, flashX, flashY } = plan;
      const currentOrder =
        displayIdsRef.current.length > 0 ? [...displayIdsRef.current] : displayIds;

      const randomToys = await fetchRandomCatalogToys(
        { excludeId: excludeToyId },
        slotIndices.length,
        nextKey,
      );
      if (cancelled || randomToys.length === 0) return;

      const nextOrder = [...currentOrder];
      slotIndices.forEach((slotIndex, index) => {
        const toy = randomToys[index];
        if (!toy || slotIndex < 0 || slotIndex >= nextOrder.length) return;
        nextOrder[slotIndex] = toy.id;
      });

      mergeToys(randomToys);
      preloadImages(randomToys.map((toy) => toy.image));

      flashScreen(flashX, flashY);
      onCrazyFlash?.(true);
      replaceDisplayIds(nextOrder);
      setCrazyFlashSlots(slotIndices);

      flashTimer = window.setTimeout(() => {
        onCrazyFlash?.(false);
        setCrazyFlashSlots([]);
      }, CRAZY_CARD_FLASH_MS);
    };

    crazyFlashCountRef.current = 0;
    const id = window.setInterval(() => {
      void flash();
    }, CRAZY_FLASH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (flashTimer) window.clearTimeout(flashTimer);
      onCrazyFlash?.(false);
      setCrazyFlashSlots([]);
    };
  }, [
    crazyMode,
    crazyEffectsActive,
    scrollerRef,
    crazyBtnRef,
    displayIds,
    excludeToyId,
    flashScreen,
    mergeToys,
    onCrazyFlash,
    replaceDisplayIds,
  ]);

  const gridClassName = useMemo(
    () =>
      ["toy-feed-grid", crazyMode ? "toy-feed-grid--crazy" : ""]
        .filter(Boolean)
        .join(" "),
    [crazyMode],
  );

  if (!routeSettled) return null;

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
        ) : (
          <div className={gridClassName}>
            {displayed.map((toy, index) => (
              <FeedCard
                key={toy.id}
                toy={toy}
                showText={showText}
                index={index}
                slotIndex={index}
                crazyStrike={crazyFlashSlots.includes(index)}
                animateEnter={false}
              />
            ))}
          </div>
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
