"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Toy } from "@/types/toy";
import {
  useCrazyModeStore,
  crazyModeRootClass,
  crazyModeScrollClass,
} from "@/lib/crazy-mode-store";
import { useMoreToysCrazyActive } from "@/hooks/useMoreToysCrazyActive";
import type { CatalogPageResult } from "@/lib/catalog-query";
import { ProductGallery } from "./ProductGallery";
import { ShelfHeader } from "./ShelfHeader";
import { MoreToysFeed } from "./MoreToysFeed";
import { ProductKartActions } from "./AddToKartButton";
import { CrazyModeButton } from "./CrazyModeButton";
import { useToyInterestStore } from "@/lib/toy-interest-store";
import { INTEREST_MAX_SECONDS_PER_VISIT } from "@/lib/toy-interest";

type Props = {
  toy: Toy;
  categoryLabel: string;
  gallery: string[];
  moreInitialPage?: CatalogPageResult;
};

export function ToyPageView({ toy, categoryLabel, gallery, moreInitialPage }: Props) {
  const crazyMode = useCrazyModeStore((s) => s.crazyMode);
  const setCrazyMode = useCrazyModeStore((s) => s.setCrazyMode);
  const crazyOn = crazyMode;
  const [crazyFlash, setCrazyFlash] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const productAreaRef = useRef<HTMLDivElement>(null);
  const moreToysRef = useRef<HTMLElement>(null);
  const shelfCrazyBtnRef = useRef<HTMLButtonElement>(null);

  const moreToysCrazyActive = useMoreToysCrazyActive(
    crazyOn,
    scrollerRef,
    moreToysRef,
  );
  const recordOpen = useToyInterestStore((s) => s.recordOpen);
  const recordPhoto = useToyInterestStore((s) => s.recordPhoto);
  const recordSeconds = useToyInterestStore((s) => s.recordSeconds);
  const onViewImage = useCallback(
    (src: string) => recordPhoto(toy.id, src),
    [recordPhoto, toy.id],
  );

  useEffect(() => {
    recordOpen(toy.id);
    let pending = 0;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (pending >= INTEREST_MAX_SECONDS_PER_VISIT) return;
      pending += 1;
    }, 1000);
    const flush = () => {
      if (pending <= 0) return;
      recordSeconds(toy.id, pending);
      pending = 0;
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [recordOpen, recordSeconds, toy.id]);

  return (
    <div
      className={`shelf-page star-field flex min-h-0 flex-1 flex-col ${crazyModeRootClass(crazyOn)}`}
    >
      <ShelfHeader
        backHref="/shop"
        trailing={
          crazyOn ? (
            <CrazyModeButton
              ref={shelfCrazyBtnRef}
              className="shelf-crazy-btn"
              crazyMode
              crazyFlash={crazyFlash}
              onClick={() => setCrazyMode(false)}
            />
          ) : undefined
        }
      />

      <div
        ref={scrollerRef}
        className={`page-scroll star-field min-h-0 flex-1 py-4 ${crazyModeScrollClass(crazyOn)}`}
      >
        <div
          className={`product-detail mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8${
            crazyOn ? " product-detail--crazy" : ""
          }`}
        >
          <div ref={productAreaRef} className="product-detail__layout">
            <ProductGallery
              images={gallery}
              videos={toy.videos}
              poster={toy.image}
              alt={toy.imageAlt}
              onViewImage={onViewImage}
            />

            <div className="product-detail__info min-w-0">
              <p className="mb-1 text-sm font-bold text-[var(--blue)]">
                {categoryLabel}
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)] sm:text-4xl">
                {toy.name}
              </h2>
              <p className="mt-2 text-lg text-[var(--ink-soft)]">{toy.blurb}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--purple-deep)]">
                Ages {toy.ageMin}–{toy.ageMax}
              </p>

              <ProductKartActions toyId={toy.id} />

              <p className="mt-5 text-center text-sm text-[var(--ink-soft)] sm:text-left">
                No buying here. Save it, then send the Kart to a grown-up.
              </p>
            </div>
          </div>
        </div>

        <div className="scroll-pad-bottom pt-4">
          <MoreToysFeed
            excludeToyId={toy.id}
            initialPage={moreInitialPage}
            showText
            sectionRef={moreToysRef}
            crazyMode={crazyOn}
            crazyEffectsActive={moreToysCrazyActive}
            scrollerRef={scrollerRef}
            crazyBtnRef={shelfCrazyBtnRef}
            onCrazyFlash={setCrazyFlash}
          />
        </div>
      </div>
    </div>
  );
}
