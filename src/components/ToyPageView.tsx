"use client";

import Link from "next/link";
import { useRef, useState } from "react";
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
import { AddToKartButton } from "./AddToKartButton";
import { CrazyModeButton } from "./CrazyModeButton";
import { useVisualSettled } from "@/hooks/useVisualSettled";

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
  const kartGoReady = useVisualSettled(toy.id);

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

              <div className="mt-6 flex max-w-md items-stretch gap-3">
                <AddToKartButton toyId={toy.id} />
                <Link
                  href="/kart"
                  aria-label="Go to Kart"
                  className={`kart-go-btn inline-flex h-[3.9rem] w-[3.9rem] shrink-0 items-center justify-center rounded-full shadow-md transition active:scale-[0.98] ${
                    kartGoReady ? "kart-go-btn--visual-ready" : ""
                  }`}
                >
                  <svg
                    className="kart-go-arrow shrink-0"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M9.5 5.5 16 12l-6.5 6.5"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 12H6"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </Link>
              </div>

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
