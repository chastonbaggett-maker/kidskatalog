"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToyMediaItem } from "@/lib/toy-media";
import { getToyVideos } from "@/lib/toy-media";
import { PlayableVideo } from "./PlayableVideo";
import { ToyPhoto } from "./ToyPhoto";

const SWIPE_THRESHOLD_PX = 48;

/** Main photo first, primary video second, then remaining photos. */
function buildSelectorMedia(
  images: string[],
  videos: string[] | undefined,
): ToyMediaItem[] {
  const photos = (images.length > 0 ? images : [])
    .map((src) => src.trim())
    .filter(Boolean);
  const clips = getToyVideos({ videos });

  if (photos.length === 0) {
    return clips.map((src) => ({ kind: "video" as const, src }));
  }

  const items: ToyMediaItem[] = [{ kind: "image", src: photos[0]! }];
  if (clips[0]) items.push({ kind: "video", src: clips[0] });
  for (const src of photos.slice(1)) items.push({ kind: "image", src });
  for (const src of clips.slice(1)) items.push({ kind: "video", src });
  return items;
}

export function ProductGallery({
  images,
  videos,
  alt,
  poster,
}: {
  images: string[];
  /** Optional clips — primary clip is shown second in the selector. */
  videos?: string[];
  alt: string;
  /** Poster frame for video thumbs / paused state. */
  poster?: string;
}) {
  const shots = buildSelectorMedia(images, videos);
  const [active, setActive] = useState(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wantPlayRef = useRef(false);
  const current = shots[active] ?? shots[0];
  const posterSrc = poster || images[0] || "";
  const videoSelected = current?.kind === "video";

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

  // When the video thumb is selected, autoplay (muted for browser policy).
  useEffect(() => {
    wantPlayRef.current = videoSelected;
    const node = videoRef.current;
    if (!videoSelected) {
      if (node) {
        node.pause();
        try {
          node.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
      return;
    }

    const tryPlay = async () => {
      const video = videoRef.current;
      if (!video || !wantPlayRef.current) return;
      try {
        video.muted = true;
        await video.play();
      } catch {
        /* autoplay may still be blocked until another gesture */
      }
    };

    void tryPlay();
    const onCanPlay = () => {
      void tryPlay();
    };
    node?.addEventListener("canplay", onCanPlay);
    return () => {
      wantPlayRef.current = false;
      node?.removeEventListener("canplay", onCanPlay);
      node?.pause();
    };
  }, [active, videoSelected, current?.src]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (shots.length <= 1) return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeStart.current || shots.length <= 1) return;

    const deltaX = event.clientX - swipeStart.current.x;
    const deltaY = event.clientY - swipeStart.current.y;
    swipeStart.current = null;

    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) < Math.abs(deltaY)
    ) {
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
              muted
              loop
              preload="auto"
              aria-label={alt}
              onReady={() => {
                const video = videoRef.current;
                if (!video || !wantPlayRef.current) return;
                void video.play().catch(() => undefined);
              }}
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
