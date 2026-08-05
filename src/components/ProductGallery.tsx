"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 48;

export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const shots = images.length > 0 ? images : [];
  const [active, setActive] = useState(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = shots[active] ?? shots[0];

  const goPrev = useCallback(() => {
    setActive((index) => (index - 1 + shots.length) % shots.length);
  }, [shots.length]);

  const goNext = useCallback(() => {
    setActive((index) => (index + 1) % shots.length);
  }, [shots.length]);

  useEffect(() => {
    thumbRefs.current[active]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [active]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (shots.length <= 1) return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeStart.current || shots.length <= 1) return;

    const deltaX = event.clientX - swipeStart.current.x;
    const deltaY = event.clientY - swipeStart.current.y;
    swipeStart.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) goNext();
    else goPrev();
  };

  const handlePointerCancel = () => {
    swipeStart.current = null;
  };

  if (!current) return null;

  return (
    <div className="mb-4">
      <div
        className="product-gallery__stage relative mb-3 w-full touch-pan-y overflow-hidden rounded-[2rem] bg-white shadow-md"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        role={shots.length > 1 ? "region" : undefined}
        aria-roledescription={shots.length > 1 ? "carousel" : undefined}
        aria-label={shots.length > 1 ? `${alt} gallery` : undefined}
      >
        <img
          src={current}
          alt={alt}
          loading="eager"
          decoding="async"
          draggable={false}
          className="product-gallery__photo h-full w-full select-none object-contain"
        />
      </div>

      {shots.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-1 scrollbar-none">
          {shots.map((src, i) => (
            <button
              key={src}
              ref={(node) => {
                thumbRefs.current[i] = node;
              }}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white ring-2 transition ${
                i === active
                  ? "ring-[var(--blue)]"
                  : "ring-transparent opacity-80"
              }`}
              aria-label={`Photo ${i + 1}`}
              aria-pressed={i === active}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
