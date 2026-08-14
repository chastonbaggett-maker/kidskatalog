"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToyMediaItem } from "@/lib/toy-media";
import { getToyVideos } from "@/lib/toy-media";
import { PlayableVideo } from "./PlayableVideo";
import { ToyPhoto } from "./ToyPhoto";

const SWIPE_THRESHOLD_PX = 48;
const INTRO_HOLD_MS = 2000;
const INTRO_FADE_MS = 700;

/** Photos first, videos last in the selector. */
function buildSelectorMedia(
  images: string[],
  videos: string[] | undefined,
): ToyMediaItem[] {
  const photos = (images.length > 0 ? images : [])
    .map((src) => src.trim())
    .filter(Boolean)
    .map((src) => ({ kind: "image" as const, src }));
  const clips = getToyVideos({ videos }).map((src) => ({
    kind: "video" as const,
    src,
  }));
  return [...photos, ...clips];
}

export function ProductGallery({
  images,
  videos,
  alt,
  poster,
}: {
  images: string[];
  /** Optional clips shown at the end of the selector. */
  videos?: string[];
  alt: string;
  /** Poster frame for video thumbs / paused state. */
  poster?: string;
}) {
  const shots = buildSelectorMedia(images, videos);
  const videoIndex = shots.findIndex((item) => item.kind === "video");
  const hasIntroVideo = videoIndex > 0 && shots[0]?.kind === "image";
  const firstImage = hasIntroVideo ? shots[0]! : null;
  const primaryVideo =
    videoIndex >= 0 && shots[videoIndex]?.kind === "video"
      ? shots[videoIndex]!
      : null;

  const [active, setActive] = useState(0);
  const [introFading, setIntroFading] = useState(false);
  const [userTookOver, setUserTookOver] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wantPlayRef = useRef(false);
  const current = shots[active] ?? shots[0];
  const posterSrc = poster || images[0] || "";
  const videoSelected = current?.kind === "video";

  const useCrossfadeLayers =
    Boolean(hasIntroVideo && firstImage && primaryVideo) &&
    !userTookOver &&
    (active === 0 || active === videoIndex);

  const selectIndex = useCallback((index: number, fromUser = false) => {
    if (fromUser) {
      setUserTookOver(true);
      setIntroFading(false);
    }
    setActive(index);
  }, []);

  const goPrev = useCallback(() => {
    selectIndex((active - 1 + shots.length) % shots.length, true);
  }, [active, shots.length, selectIndex]);

  const goNext = useCallback(() => {
    selectIndex((active + 1) % shots.length, true);
  }, [active, shots.length, selectIndex]);

  useEffect(() => {
    thumbRefs.current[active]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [active]);

  // Hold on the first image, then fade into the ending video slide.
  useEffect(() => {
    if (!hasIntroVideo || videoIndex < 0 || userTookOver) return;

    const hold = window.setTimeout(() => {
      setIntroFading(true);
      setActive(videoIndex);
    }, INTRO_HOLD_MS);

    return () => window.clearTimeout(hold);
  }, [hasIntroVideo, videoIndex, userTookOver]);

  useEffect(() => {
    if (!introFading) return;
    const done = window.setTimeout(() => {
      setIntroFading(false);
    }, INTRO_FADE_MS);
    return () => window.clearTimeout(done);
  }, [introFading]);

  // Autoplay whenever the video slide is selected.
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
        /* autoplay may still be blocked */
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

  const videoPlayer = primaryVideo ? (
    <PlayableVideo
      key={primaryVideo.src}
      ref={videoRef}
      className="product-gallery__video"
      src={primaryVideo.src}
      poster={posterSrc || undefined}
      controls
      playsInline
      muted
      loop
      preload="auto"
      aria-label={alt}
      onReady={() => {
        if (!wantPlayRef.current) return;
        void videoRef.current?.play().catch(() => undefined);
      }}
    />
  ) : null;

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
          {useCrossfadeLayers && firstImage && primaryVideo ? (
            <>
              <div
                className={`product-gallery__fade-layer${
                  introFading || videoSelected
                    ? " product-gallery__fade-layer--out"
                    : ""
                }`}
              >
                <ToyPhoto
                  src={firstImage.src}
                  alt={alt}
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                  draggable={false}
                  width={800}
                  height={800}
                  className="product-gallery__photo"
                />
              </div>
              <div
                className={`product-gallery__fade-layer${
                  introFading || videoSelected
                    ? " product-gallery__fade-layer--in"
                    : " product-gallery__fade-layer--hidden"
                }`}
              >
                {videoPlayer}
              </div>
            </>
          ) : current.kind === "video" ? (
            videoPlayer
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
              onClick={() => selectIndex(i, true)}
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
