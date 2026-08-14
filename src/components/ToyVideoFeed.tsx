"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Toy } from "@/types/toy";
import { useAccentStore } from "@/lib/accent-store";
import { getToyVideos } from "@/lib/toy-media";

type Props = {
  toys: Toy[];
};

/**
 * Vertical Watch feed — one video card per toy that has clips.
 * Eye button opens the toy detail page.
 */
export function ToyVideoFeed({ toys }: Props) {
  const audience = useAccentStore((s) => s.audience);
  const viewBtnClass =
    audience === "boys"
      ? "bg-[var(--boys-chip)]"
      : audience === "girls"
        ? "bg-[var(--girls-chip)]"
        : "bg-[var(--mint)]";

  if (toys.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="shelf-panel max-w-md text-center">
          <div className="shelf-panel__surface px-6 py-10">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
              No toy videos yet
            </p>
            <p className="mt-2 text-[var(--ink-soft)]">
              When a toy has a video in its photo selector, it shows up here.
            </p>
          </div>
        </div>
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
}: {
  toy: Toy;
  index: number;
  viewBtnClass: string;
}) {
  const clips = getToyVideos(toy);
  const src = clips[0] ?? "";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const tryPlay = useCallback(async () => {
    const node = videoRef.current;
    if (!node) return;
    try {
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

  useEffect(() => {
    const card = cardRef.current;
    const node = videoRef.current;
    if (!card || !node || !src) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          void tryPlay();
        } else {
          pause();
        }
      },
      { threshold: [0.35, 0.65, 0.9] },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, [src, tryPlay, pause]);

  if (!src) return null;

  return (
    <article
      ref={cardRef}
      className="toy-video-card feed-card relative mx-0"
      data-toy-id={toy.id}
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
    >
      <div className="feed-card__surface toy-video-card__surface relative overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="toy-video-card__video"
          src={src}
          poster={toy.image}
          playsInline
          muted
          loop
          preload="metadata"
          aria-label={`${toy.name} video`}
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
