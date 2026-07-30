"use client";

import Link from "next/link";
import { useKartStore } from "@/lib/kart-store";

export function FloatingActions() {
  const count = useKartStore((s) => s.ids.length);

  return (
    <div className="fab-stack pointer-events-none absolute bottom-24 right-4 z-40 flex flex-col gap-3">
      <Link
        href="/kart"
        className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--purple)] font-[family-name:var(--font-display)] text-lg font-bold text-white shadow-[0_10px_24px_-8px_rgba(177,156,217,0.95)] transition active:scale-95"
      >
        Go
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--blue)] px-1 text-[10px] font-bold">
            {count}
          </span>
        )}
      </Link>
    </div>
  );
}
