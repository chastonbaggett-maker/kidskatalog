"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** More pages remain in the catalog. */
  hasMore: boolean;
  /** A fetch is in flight (filter/mode change or infinite scroll). */
  loading: boolean;
  onLoad: () => void;
  scrollerRef: React.RefObject<HTMLElement | null>;
  label?: string;
  caughtUpLabel?: string;
};

/**
 * Infinite-scroll sentinel. Shows a loading pill while pages are pending or
 * fetching — never the "caught up" copy during a mode/filter reload.
 */
export function FeedAutoLoadMore({
  hasMore,
  loading,
  onLoad,
  scrollerRef,
  label = "Loading more toys…",
  caughtUpLabel = "You’re all caught up!",
}: Props) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const waitingRef = useRef(false);

  // Allow another intersection trigger once the in-flight fetch settles.
  useEffect(() => {
    if (!loading) waitingRef.current = false;
  }, [loading]);

  useEffect(() => {
    if (!hasMore || loading) return;

    const zone = zoneRef.current;
    const root = scrollerRef.current;
    if (!zone || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || waitingRef.current) return;
        waitingRef.current = true;
        onLoad();
      },
      {
        root,
        rootMargin: "160px 0px",
        threshold: 0,
      },
    );

    observer.observe(zone);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoad, scrollerRef]);

  const showLoading = hasMore || loading;

  return (
    <div
      ref={zoneRef}
      className={`feed-load-more col-span-full${
        showLoading ? " feed-load-more--loading" : " feed-load-more--caught-up"
      }`}
      aria-live="polite"
      aria-busy={showLoading}
    >
      <div className="feed-load-more__inner">
        {showLoading ? (
          <span className="feed-load-more__spark" aria-hidden />
        ) : null}
        <p className="feed-load-more__label">
          {showLoading ? label : caughtUpLabel}
        </p>
      </div>
    </div>
  );
}
