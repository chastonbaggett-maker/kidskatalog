"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Toy } from "@/types/toy";
import { useCrazyModeStore, crazyModeRootClass, crazyModeScrollClass } from "@/lib/crazy-mode-store";
import { ProductGallery } from "./ProductGallery";
import { ShelfHeader } from "./ShelfHeader";
import { MoreToysFeed } from "./MoreToysFeed";
import { AddToKartButton } from "./AddToKartButton";
import { CrazyModeButton } from "./CrazyModeButton";

type Props = {
  toy: Toy;
  categoryLabel: string;
  gallery: string[];
  more: Toy[];
};

export function ToyPageView({ toy, categoryLabel, gallery, more }: Props) {
  const crazyMode = useCrazyModeStore((s) => s.crazyMode);
  const setCrazyMode = useCrazyModeStore((s) => s.setCrazyMode);
  const [crazyFlash, setCrazyFlash] = useState(false);
  const [moreToysInView, setMoreToysInView] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const productAreaRef = useRef<HTMLDivElement>(null);
  const moreToysRef = useRef<HTMLElement>(null);
  const shelfCrazyBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!crazyMode) {
      setMoreToysInView(false);
      setCrazyFlash(false);
      return;
    }

    const scroller = scrollerRef.current;
    const productArea = productAreaRef.current;
    const moreToys = moreToysRef.current;
    if (!scroller || !productArea || !moreToys) return;

    let productVisible = true;
    let moreToysVisible = false;

    const sync = () => {
      setMoreToysInView(moreToysVisible && !productVisible);
    };

    const productObserver = new IntersectionObserver(
      ([entry]) => {
        productVisible = entry?.isIntersecting ?? false;
        sync();
      },
      { root: scroller, threshold: 0.12 },
    );

    const moreToysObserver = new IntersectionObserver(
      ([entry]) => {
        moreToysVisible = entry?.isIntersecting ?? false;
        sync();
      },
      { root: scroller, threshold: 0.08 },
    );

    productObserver.observe(productArea);
    moreToysObserver.observe(moreToys);

    return () => {
      productObserver.disconnect();
      moreToysObserver.disconnect();
    };
  }, [crazyMode, more.length]);

  return (
    <div className={`shelf-page star-field flex min-h-0 flex-1 flex-col ${crazyModeRootClass(crazyMode)}`}>
      <ShelfHeader
        backHref="/shop"
        trailing={
          crazyMode ? (
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
        className={`page-scroll star-field min-h-0 flex-1 px-4 py-4 sm:px-6 lg:px-8 ${crazyModeScrollClass(crazyMode)}`}
      >
        <div
          className={`product-detail mx-auto w-full max-w-6xl${crazyMode ? " product-detail--crazy" : ""}`}
        >
          <div ref={productAreaRef} className="product-detail__layout">
            <ProductGallery images={gallery} alt={toy.imageAlt} />

            <div className="product-detail__info min-w-0">
              <p className="mb-1 text-sm font-bold text-[var(--blue)]">
                {categoryLabel}
              </p>
              <h2
                className={`font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl ${
                  crazyMode ? "text-white" : "text-[var(--ink)]"
                }`}
              >
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
                  className="kart-go-btn inline-flex h-[3.9rem] w-[3.9rem] shrink-0 items-center justify-center rounded-full text-white shadow-md transition active:scale-[0.98]"
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

          <MoreToysFeed
            seed={more}
            showText
            sectionRef={moreToysRef}
            crazyMode={crazyMode}
            crazyEffectsActive={moreToysInView}
            scrollerRef={scrollerRef}
            crazyBtnRef={shelfCrazyBtnRef}
            onCrazyFlash={setCrazyFlash}
          />
        </div>
      </div>
    </div>
  );
}
