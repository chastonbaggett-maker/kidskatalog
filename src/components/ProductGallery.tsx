"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToyMediaItem } from "@/lib/toy-media";
import { getToyVideos } from "@/lib/toy-media";
import { PlayableVideo } from "./PlayableVideo";
import { ToyPhoto } from "./ToyPhoto";

const SWIPE_THRESHOLD_PX = 48;

export function ProductGallery({
  images,
  videos,
  alt,
  poster,
}: {
  images: string[];
  /** Optional clips shown after photos in the selector. */
  videos?: string[];
  alt: string;
  /** Poster frame for video thumbs / paused state. */
  poster?: string;
}) {
  const media: ToyMediaItem[] = [
    ...(images.length > 0 ? images : []).map((src) => ({
      kind: "image" as const,
      src,
    })),
    ...getToyVideos({ videos }).map((src) => ({
      kind: "video" as const,
      src,
    })),
  ];
  const shots = media.length > 0 ? media : [];
  const [active, setActive] = useState(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const current = shots[active] ?? shots[0];
  const posterSrc = poster || images[0] || "";

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

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    node.pause();
    node.currentTime = 0;
  }, [active, current?.src]);

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
      <div className="product-gallery__frame mb-3">
        <div
          className="product-gallery__stage relative w-full touch-pan-y bg-white"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
          role={shots.length > 1 ? "region" : undefined}
          aria-roledescription={shots.length > 1 ? "carousel" : undefined}
          aria-label={shots.length > 1 ? `${alt} gallery` : undefined}
        >
          {current.kind === "video" ? (
            <PlayableVideo
              key={current.src}
              ref={videoRef}
              className="product-gallery__video"
              src={current.src}
              poster={posterSrc || undefined}
              controls
              playsInline
              preload="metadata"
              aria-label={alt}
            />
          ) : (
            <ToyPhoto
              src={current.src}
              alt={alt}
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              draggable={false}
              width={800}
              height={800}
              className="product-gallery__photo"
            />
          )}
        </div>
      </div>

      {shots.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-1 scrollbar-none">
          {shots.map((item, i) => (
            <button
              key={`${item.kind}-${item.src}`}
              ref={(node) => {
                thumbRefs.current[i] = node;
              }}
              type="button"
              onClick={() => setActive(i)}
              className={`product-gallery__thumb-btn relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white ring-2 transition ${
                i === active
                  ? "ring-[var(--blue)]"
                  : "ring-transparent opacity-80"
              }`}
              aria-label={
                item.kind === "video" ? `Video ${i + 1}` : `Photo ${i + 1}`
              }
              aria-pressed={i === active}
            >
              {item.kind === "video" ? (
                <>
                  {posterSrc ? (
                    <ToyPhoto
                      src={posterSrc}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="product-gallery__thumb"
                    />
                  ) : (
                    <span className="product-gallery__thumb-fallback" />
                  )}
                  <span className="product-gallery__thumb-play" aria-hidden />
                </>
              ) : (
                <ToyPhoto
                  src={item.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="product-gallery__thumb"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
