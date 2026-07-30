"use client";

import Link from "next/link";
import { Logo } from "./Logo";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  showBack?: boolean;
  collapsed?: boolean;
};

export function FeedHeader({
  query,
  onQueryChange,
  showBack = false,
  collapsed = false,
}: Props) {
  return (
    <header
      className={`bg-[image:var(--header-grad)] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow-[0_8px_24px_-12px_rgba(80,100,180,0.55)] transition-[padding,border-radius] duration-300 ease-out ${
        collapsed
          ? "rounded-b-[2rem] pb-5"
          : "rounded-b-none pb-3"
      }`}
    >
      {/* Simple icon shelf (collapsed) */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          collapsed
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="relative flex min-h-11 items-center justify-center">
            {showBack ? (
              <Link
                href="/shop"
                className="absolute left-0 flex h-10 w-10 items-center justify-center"
                aria-label="Back"
              >
                <Chevron />
              </Link>
            ) : null}
            <Logo variant="icon" light href="/shop" size={44} />
          </div>
        </div>
      </div>

      {/* Expanded wordmark + search */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          collapsed
            ? "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mb-3 flex items-center justify-center">
            <Logo light href="/shop" size={110} />
          </div>

          <div className="flex items-center gap-2">
            {showBack && (
              <Link
                href="/shop"
                className="flex h-10 w-10 shrink-0 items-center justify-center text-white"
                aria-label="Back"
              >
                <Chevron />
              </Link>
            )}

            <label className="relative flex min-w-0 flex-1 items-center rounded-full bg-white px-3 py-2.5 shadow-sm">
              <span className="mr-2 text-[var(--blue)]" aria-hidden>
                <SearchIcon />
              </span>
              <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search toys"
                tabIndex={collapsed ? -1 : 0}
                className="min-w-0 flex-1 bg-transparent text-base text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]"
              />
              <button
                type="button"
                tabIndex={collapsed ? -1 : 0}
                className="-mr-1 ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--purple)] text-white shadow-md transition active:scale-95"
                aria-label="Voice search"
              >
                <MicIcon />
              </button>
            </label>
          </div>
        </div>
      </div>
    </header>
  );
}

function Chevron() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M16 16l4 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="9.25"
        y="3.5"
        width="5.5"
        height="10.5"
        rx="2.75"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6.5 11.25a5.5 5.5 0 0 0 11 0M12 16.75V19.5M10 19.5h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
