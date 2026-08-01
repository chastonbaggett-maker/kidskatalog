"use client";

import { useEffect, useRef } from "react";

type Props = {
  active: boolean;
  onLoad: () => void;
  scrollerRef: React.RefObject<HTMLElement | null>;
  label?: string;
};

export function FeedAutoLoadMore({
  active,
  onLoad,
  scrollerRef,
  label = "Loading more toys…",
}: Props) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadingRef.current = false;
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const zone = zoneRef.current;
    const root = scrollerRef.current;
    if (!zone || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || loadingRef.current) return;
        loadingRef.current = true;
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
  }, [active, onLoad, scrollerRef]);

  return (
    <div ref={zoneRef} className="feed-load-more col-span-full" aria-live="polite">
      <div className="feed-load-more__inner">
        <span className="feed-load-more__spark" aria-hidden />
        <p className="feed-load-more__label">
          {active ? label : "You’re all caught up!"}
        </p>
      </div>
    </div>
  );
}
