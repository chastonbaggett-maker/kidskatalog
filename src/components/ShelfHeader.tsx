"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { ShelfCrazyTrailing } from "./ShelfCrazyTrailing";

const SCROLL_TOP_SHOW_PX = 48;

type ShelfHeaderProps = {
  /** Optional page title under the icon */
  title?: string;
  /** Optional subtitle under the title */
  subtitle?: string;
  /** Show back chevron — takes priority over back-to-top */
  backHref?: string;
  /** Taller product-style bar with soft bottom corners */
  rounded?: boolean;
  /** Use alternate gradient (profile) */
  altGradient?: boolean;
  className?: string;
  /** Right-side action, e.g. crazy mode toggle in browse shelf */
  trailing?: ReactNode;
};

function findPageScroller(from: HTMLElement | null): HTMLElement | null {
  if (!from) return null;
  const page = from.closest(".shelf-page");
  if (page) {
    const scroller = page.querySelector<HTMLElement>(".page-scroll");
    if (scroller) return scroller;
  }
  return from.closest(".page-scroll");
}

export function ShelfHeader({
  title,
  subtitle,
  backHref,
  rounded = true,
  altGradient = false,
  className = "",
  trailing,
}: ShelfHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    if (backHref) {
      setShowBackToTop(false);
      return;
    }

    const header = headerRef.current;
    const scroller = findPageScroller(header);
    if (!scroller) {
      setShowBackToTop(false);
      return;
    }

    const update = () => {
      setShowBackToTop(scroller.scrollTop > SCROLL_TOP_SHOW_PX);
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => scroller.removeEventListener("scroll", update);
  }, [backHref]);

  const scrollToTop = useCallback(() => {
    const scroller = findPageScroller(headerRef.current);
    scroller?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const headerClass = [
    "shelf-header shrink-0",
    rounded ? "shelf-header--rounded" : "",
    altGradient ? "shelf-header--alt" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const cornerBtnClass =
    "back-fun flex h-11 w-11 items-center justify-center rounded-full bg-white/25 text-white shadow-[0_6px_16px_-8px_rgba(40,40,80,0.55)] ring-2 ring-white/40 backdrop-blur-[2px] transition active:scale-90";

  return (
    <header ref={headerRef} className={headerClass}>
      <div className="relative flex min-h-11 items-center justify-center px-3">
        {backHref ? (
          <div className="shelf-back-btn">
            <Link href={backHref} className={cornerBtnClass} aria-label="Back">
              <BackChevronIcon />
            </Link>
          </div>
        ) : showBackToTop ? (
          <div className="shelf-back-btn">
            <button
              type="button"
              className={`${cornerBtnClass} back-fun--up`}
              aria-label="Back to top"
              onClick={scrollToTop}
            >
              <UpChevronIcon />
            </button>
          </div>
        ) : null}

        <Logo variant="icon" light glow href="/shop" size={44} />
        {trailing ?? <ShelfCrazyTrailing />}
      </div>

      {title ? (
        <h1 className="mt-2 px-3 text-center font-[family-name:var(--font-display)] text-2xl font-bold leading-tight sm:text-3xl">
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <p className="mt-0.5 px-3 text-center text-white/85">{subtitle}</p>
      ) : null}
    </header>
  );
}

function BackChevronIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h9"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UpChevronIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 14.5 12 8l6.5 6.5"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v9"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
