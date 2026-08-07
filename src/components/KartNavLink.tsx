"use client";

import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";
import { registerKartNavEl } from "@/lib/kart-nav-target";
import { useKartStore } from "@/lib/kart-store";
import { readBootKartCount } from "@/lib/kart-boot";
import { usePersistHydrated, getStorePersist } from "@/hooks/usePersistHydrated";
import { useRouteChanging } from "@/hooks/useRouteChanging";

type Props = {
  active: boolean;
  accentClass: string;
  badgeClass: string;
};

/** Kart tab + badge — isolated so bottom-nav frost never re-renders on count change. */
export const KartNavLink = memo(function KartNavLink({
  active,
  accentClass,
  badgeClass,
}: Props) {
  const kartHydrated = usePersistHydrated(getStorePersist(useKartStore));
  const routeChanging = useRouteChanging();
  const count = useKartStore((s) => s.ids.length);
  const kartBounceToken = useKartStore((s) => s.kartBounceToken);
  const [landing, setLanding] = useState(false);
  const seenBounceTokenRef = useRef(kartBounceToken);

  useEffect(() => {
    if (!kartHydrated || routeChanging) return;
    if (kartBounceToken === seenBounceTokenRef.current) return;
    seenBounceTokenRef.current = kartBounceToken;
    if (kartBounceToken === 0) return;
    setLanding(true);
    const t = window.setTimeout(() => setLanding(false), 520);
    return () => window.clearTimeout(t);
  }, [kartBounceToken, kartHydrated, routeChanging]);

  useEffect(() => {
    if (routeChanging) setLanding(false);
  }, [routeChanging]);

  const displayCount = kartHydrated ? count : readBootKartCount();
  const showBadge = displayCount > 0;

  return (
    <li>
      <Link
        ref={registerKartNavEl}
        href="/kart"
        className={`relative flex h-14 w-16 flex-col items-center justify-center rounded-2xl transition active:scale-95 ${accentClass} ${
          active ? "opacity-100" : "opacity-80"
        } ${landing ? "bottom-nav__kart--land" : ""}`}
        aria-label="Kart"
        aria-current={active ? "page" : undefined}
      >
        <span className="bottom-nav__kart-icon">
          <KartIcon />
        </span>
        {showBadge && (
          <span
            className={`absolute right-1.5 top-0 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-bold text-white ${badgeClass} ${
              landing ? "bottom-nav__kart-badge--pop" : ""
            }`}
          >
            {displayCount}
          </span>
        )}
      </Link>
    </li>
  );
});

function KartIcon() {
  return (
    <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 5h2l2.2 10.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L22 8H7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}
