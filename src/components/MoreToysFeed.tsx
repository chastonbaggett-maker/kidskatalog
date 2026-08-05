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
  urlsForSwappedSlots,
} from "@/lib/crazy-mode-timing";
import {
  planCrazyFlash,
  assignRandomProductsAt,
  useCrazyLightning,
} from "@/hooks/useCrazyLightning";
import { useKartStore } from "@/lib/kart-store";
import { FeedCard } from "./FeedCard";

const PAGE = 6;
const emptyBtnRef = { current: null } as RefObject<HTMLButtonElement | null>;

export function MoreToysFeed({
  seed,
  showText = true,
  sectionRef,
  crazyMode = false,
  crazyEffectsActive = false,
  scrollerRef,
  crazyBtnRef,
  onCrazyFlash,
}: {
  seed: Toy[];
  showText?: boolean;
  sectionRef?: RefObject<HTMLElement | null>;
  crazyMode?: boolean;
  crazyEffectsActive?: boolean;
  scrollerRef?: RefObject<HTMLElement | null>;
  crazyBtnRef?: RefObject<HTMLButtonElement | null>;
  onCrazyFlash?: (active: boolean) => void;
}) {
  const [displayIds, setDisplayIds] = useState<string[]>(() =>
    seed.slice(0, PAGE).map((t) => t.id),
  );
  const [crazyFlashSlots, setCrazyFlashSlots] = useState<number[]>([]);
  const cursorRef = useRef(Math.min(PAGE, seed.length));
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const crazyFlashCountRef = useRef(0);
  const displayIdsRef = useRef<string[]>([]);
  const localSectionRef = useRef<HTMLElement>(null);
  const mergedSectionRef = sectionRef ?? localSectionRef;

  const { flash: flashScreen, portal: flashPortal } = useCrazyLightning();

  const seedKey = seed.map((t) => t.id).join(",");
  const poolIds = useMemo(() => seed.map((t) => t.id), [seed]);
  const toyById = useMemo(() => new Map(seed.map((t) => [t.id, t])), [seed]);
  const toyImageById = useMemo(
    () => new Map(seed.map((t) => [t.id, t.image])),
    [seed],
  );

  useEffect(() => {
    displayIdsRef.current = displayIds;
  }, [displayIds]);

  const loadMore = useCallback(() => {
    if (loadingRef.current || seed.length === 0) return;
    loadingRef.current = true;

    const next: Toy[] = [];
    let i = cursorRef.current;
    for (let n = 0; n < PAGE; n++) {
      next.push(seed[i % seed.length]!);
      i += 1;
    }
    cursorRef.current = i;
    setDisplayIds((prev) => [...prev, ...next.map((t) => t.id)]);

    requestAnimationFrame(() => {
      loadingRef.current = false;
    });
  }, [seed]);

  useEffect(() => {
    const initial = seed.slice(0, PAGE);
    setDisplayIds(initial.map((t) => t.id));
    cursorRef.current = Math.min(PAGE, seed.length);
    setCrazyFlashSlots([]);
  }, [seed, seedKey]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const root = scrollerRef?.current ?? null;
    let loadTimer: number | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        const { flyBall, kartAddActive } = useKartStore.getState();
        if (flyBall || kartAddActive > 0) return;

        if (loadTimer) window.clearTimeout(loadTimer);
        loadTimer = window.setTimeout(() => {
          const state = useKartStore.getState();
          if (state.flyBall || state.kartAddActive > 0) return;
          loadMore();
        }, 150);
      },
      { root, rootMargin: root ? "320px 0px" : "480px 0px" },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (loadTimer) window.clearTimeout(loadTimer);
    };
  }, [loadMore, scrollerRef]);

  useEffect(() => {
    if (!crazyMode || !crazyEffectsActive) {
      onCrazyFlash?.(false);
      setCrazyFlashSlots([]);
      return;
    }

    const scroller = scrollerRef?.current;
    if (!scroller) return;

    let flashTimer: number | undefined;

    const flash = () => {
      const { flyBall, kartAddActive } = useKartStore.getState();
      if (flyBall || kartAddActive > 0) return;

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
      const nextOrder = assignRandomProductsAt(
        displayIdsRef.current,
        slotIndices,
        poolIds,
        nextKey,
      );

      preloadImages(urlsForSwappedSlots(nextOrder, slotIndices, toyImageById));

      flashScreen(flashX, flashY);
      onCrazyFlash?.(true);
      setDisplayIds(nextOrder);
      setCrazyFlashSlots(slotIndices);

      flashTimer = window.setTimeout(() => {
        onCrazyFlash?.(false);
        setCrazyFlashSlots([]);
      }, CRAZY_CARD_FLASH_MS);
    };

    crazyFlashCountRef.current = 0;
    const id = window.setInterval(flash, CRAZY_FLASH_INTERVAL_MS);
    return () => {
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
    flashScreen,
    onCrazyFlash,
    toyImageById,
    poolIds,
  ]);

  const displayed = useMemo(() => {
    return displayIds
      .map((id) => toyById.get(id))
      .filter((t): t is Toy => t != null);
  }, [displayIds, toyById]);

  const gridClassName = [
    "toy-feed-grid",
    crazyMode ? "toy-feed-grid--crazy" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (seed.length === 0) return null;

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
        <div className={gridClassName}>
          {displayed.map((toy, index) => (
            <FeedCard
              key={`feed-slot-${index}`}
              toy={toy}
              showText={showText}
              index={index}
              slotIndex={index}
              crazyStrike={crazyFlashSlots.includes(index)}
            />
          ))}
        </div>
        <div ref={sentinelRef} className="h-10 w-full" aria-hidden />
        <p className="more-toys-feed__hint mt-2 pb-4 text-center text-sm font-semibold text-[var(--ink-soft)]">
          Keep scrolling — more toys ahead
        </p>
      </section>
      {flashPortal}
    </>
  );
}
