"use client";

import Link from "next/link";
import { useKartStore } from "@/lib/kart-store";
import { Logo } from "./Logo";

export function Header() {
  const count = useKartStore((s) => s.ids.length);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--forest)]/10 bg-[var(--cream)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo size="sm" href="/shop" />
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/shop"
            className="rounded-2xl px-3 py-2 text-sm font-semibold text-[var(--forest)] transition hover:bg-[var(--mint)]"
          >
            Browse
          </Link>
          <Link
            href="/kart"
            className="relative inline-flex items-center gap-2 rounded-2xl bg-[var(--forest)] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--forest-deep)] active:scale-[0.98]"
          >
            <KartIcon />
            <span>Kart</span>
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--leaf)] px-1 text-xs text-white">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function KartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 5h2l2.2 10.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L22 8H7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.5" fill="currentColor" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}
