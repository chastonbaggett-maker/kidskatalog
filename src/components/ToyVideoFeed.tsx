"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Toy } from "@/types/toy";
import { useAccentStore } from "@/lib/accent-store";
import { getToyVideos } from "@/lib/toy-media";
import { PlayableVideo } from "./PlayableVideo";

type Props = {
  toys: Toy[];
};

/**
 * Vertical Watch feed — one video card per toy that has clips.
 * The in-view card autoplays; others pause when the next takes focus.
 */
export function ToyVideoFeed({ toys }: Props) {
  const audience = useAccentStore((s) => s.audience);
  const viewBtnClass =
    audience === "boys"
      ? "bg-[var(--boys-chip)]"
      : audience === "girls"
        ? "bg-[var(--girls-chip)]"
        : "bg-[var(--mint)]";

  const [activeId, setActiveId] = useState<string | null>(null);

  if (toys.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="font-[family-name:var(--font-display)] text-center text-2xl font-bold text-[var(--ink)] sm:text-3xl">
          No video content available
        </p>
      </div>
    );
  }

  return (
    <div className="toy-video-feed page-scroll star-field min-h-0 flex-1 scroll-pad-bottom">
      <div className="toy-video-feed__list mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-4 sm:max-w-xl sm:px-5 lg:max-w-2xl">
        {toys.map((toy, index) => (
          <ToyVideoCard
            key={toy.id}
            toy={toy}
            index={index}
            viewBtnClass={viewBtnClass}
            active={activeId === toy.id}
            onActiveChange={(isActive) => {
              if (isActive) setActiveId(toy.id);
              else setActiveId((cur) => (cur === toy.id ? null : cur));
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ToyVideoCard({
  toy,
  index,
  viewBtnClass,
  active,
  onActiveChange,
}: {
  toy: Toy;
  index: number;
  viewBtnClass: string;
  active: boolean;
  onActiveChange: (active: boolean) => void;
}) {
  const clips = getToyVideos(toy);
  const src = clips[0] ?? "";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const readyRef = useRef(false);
  const inViewRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  const tryPlay = useCallback(async () => {
    const node = videoRef.current;
    if (!node || !readyRef.current || !inViewRef.current) return;
    try {
      node.muted = true;
      await node.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    const node = videoRef.current;
    if (!node) return;
    node.pause();
    setPlaying(false);
  }, []);

  // Parent "active" flag: only the in-view card should play.
  useEffect(() => {
    if (active) {
      inViewRef.current = true;
      void tryPlay();
    } else {
      inViewRef.current = false;
      pause();
    }
  }, [active, tryPlay, pause]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !src) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const mostlyVisible =
          entry.isIntersecting && entry.intersectionRatio >= 0.6;
        onActiveChange(mostlyVisible);
      },
      { threshold: [0.25, 0.6, 0.85], rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, [src, onActiveChange]);

  if (!src) return null;

  return (
    <article
      ref={cardRef}
      className="toy-video-card feed-card relative mx-0"
      data-toy-id={toy.id}
      data-active={active ? "1" : "0"}
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
    >
      <div className="feed-card__surface toy-video-card__surface relative overflow-hidden bg-black">
        <PlayableVideo
          ref={videoRef}
          className="toy-video-card__video"
          src={src}
          poster={toy.image}
          playsInline
          muted
          loop
          preload="auto"
          aria-label={`${toy.name} video`}
          onReady={() => {
            readyRef.current = true;
            if (inViewRef.current) void tryPlay();
          }}
          onClick={() => {
            if (playing) pause();
            else void tryPlay();
          }}
        />

        <div className="toy-video-card__shade" aria-hidden />

        <div className="toy-video-card__meta pointer-events-none absolute inset-x-0 bottom-0 z-[5] px-4 pb-4 pt-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white drop-shadow">
            {toy.name}
          </h2>
          <p className="mt-0.5 text-sm text-white/85">{toy.blurb}</p>
        </div>

        {!playing ? (
          <button
            type="button"
            className="toy-video-card__play"
            aria-label={`Play ${toy.name}`}
            onClick={() => void tryPlay()}
          >
            <span aria-hidden />
          </button>
        ) : null}

        <Link
          href={`/toy/${toy.id}`}
          prefetch={false}
          aria-label={`View ${toy.name}`}
          className={`feed-card__view-btn ${viewBtnClass}`}
        />
      </div>
    </article>
  );
}
