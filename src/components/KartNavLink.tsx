"use client";

import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { registerKartNavEl } from "@/lib/kart-nav-target";
import { useKartStore } from "@/lib/kart-store";
import { readBootKartCount } from "@/lib/kart-boot";
import { usePersistHydrated, getStorePersist } from "@/hooks/usePersistHydrated";
import { onKartFlyBallLand } from "@/lib/kart-fly-ball";
import { launchKartBounceBalls } from "@/lib/kart-bounce-balls";
import { beginRouteChange } from "@/lib/route-change";

type Props = {
  active: boolean;
  badgeClass: string;
};

const LAND_PULSE_MS = 520;
const EASTER_TAP_TARGET = 5;
const EASTER_TAP_WINDOW_MS = 900;
/** Wait before treating tap 1 as normal navigation. */
const EASTER_SINGLE_TAP_NAV_MS = 380;

/** Kart tab + badge — pulses when the decorative fly ball lands. */
export const KartNavLink = memo(function KartNavLink({
  active,
  badgeClass,
}: Props) {
  const router = useRouter();
  const kartHydrated = usePersistHydrated(getStorePersist(useKartStore));
  const count = useKartStore((s) => s.ids.length);
  const displayCount = kartHydrated ? count : readBootKartCount();
  const [landing, setLanding] = useState(false);
  const tapCountRef = useRef(0);
  const tapWindowTimerRef = useRef<number | undefined>(undefined);
  const singleTapNavTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let clearTimer: number | undefined;
    const unsubscribe = onKartFlyBallLand(() => {
      setLanding(false);
      window.requestAnimationFrame(() => {
        setLanding(true);
        if (clearTimer) window.clearTimeout(clearTimer);
        clearTimer = window.setTimeout(() => {
          setLanding(false);
          clearTimer = undefined;
        }, LAND_PULSE_MS);
      });
    });
    return () => {
      unsubscribe();
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, []);

  useEffect(
    () => () => {
      if (tapWindowTimerRef.current) window.clearTimeout(tapWindowTimerRef.current);
      if (singleTapNavTimerRef.current) {
        window.clearTimeout(singleTapNavTimerRef.current);
      }
    },
    [],
  );

  const resetTaps = () => {
    tapCountRef.current = 0;
    if (tapWindowTimerRef.current) {
      window.clearTimeout(tapWindowTimerRef.current);
      tapWindowTimerRef.current = undefined;
    }
    if (singleTapNavTimerRef.current) {
      window.clearTimeout(singleTapNavTimerRef.current);
      singleTapNavTimerRef.current = undefined;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    tapCountRef.current += 1;

    if (singleTapNavTimerRef.current) {
      window.clearTimeout(singleTapNavTimerRef.current);
      singleTapNavTimerRef.current = undefined;
    }

    // Refresh the rapid-tap window on every tap.
    if (tapWindowTimerRef.current) {
      window.clearTimeout(tapWindowTimerRef.current);
    }
    tapWindowTimerRef.current = window.setTimeout(() => {
      resetTaps();
    }, EASTER_TAP_WINDOW_MS);

    if (tapCountRef.current >= EASTER_TAP_TARGET) {
      const launchCount =
        displayCount > 0 ? displayCount : useKartStore.getState().ids.length;
      const origin = e.currentTarget.getBoundingClientRect();
      resetTaps();
      if (launchCount > 0) {
        launchKartBounceBalls(launchCount, origin);
      }
      return;
    }

    if (tapCountRef.current === 1) {
      singleTapNavTimerRef.current = window.setTimeout(() => {
        if (tapCountRef.current === 1) {
          beginRouteChange();
          router.push("/kart");
        }
        singleTapNavTimerRef.current = undefined;
      }, EASTER_SINGLE_TAP_NAV_MS);
    }
  };

  const pulseKart = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const item = e.currentTarget;
    item.classList.remove("is-pulsing");
    void item.offsetWidth;
    item.classList.add("is-pulsing");
  };

  const clearKartPulse = (e: React.AnimationEvent<HTMLAnchorElement>) => {
    if (e.animationName === "bottom-nav-tap-pulse") {
      e.currentTarget.classList.remove("is-pulsing");
    }
  };

  return (
    <li>
      <Link
        ref={registerKartNavEl}
        href="/kart"
        onClick={handleClick}
        onPointerDown={pulseKart}
        onAnimationEnd={clearKartPulse}
        className={`bottom-nav__item relative flex h-14 w-16 flex-col items-center justify-center ${
          active ? "bottom-nav__item--active" : ""
        } ${landing ? "bottom-nav__kart--land" : ""}`}
        aria-label="Kart"
        aria-current={active ? "page" : undefined}
      >
        <span className="bottom-nav__kart-icon">
          <KartIcon active={active} />
        </span>
        <span
          className={`bottom-nav__kart-badge absolute right-1.5 top-0 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-bold text-white ${badgeClass} ${
            landing ? "bottom-nav__kart-badge--pop" : ""
          }`}
          style={{
            opacity: displayCount > 0 ? 1 : 0,
          }}
          aria-hidden={displayCount <= 0}
        >
          {displayCount > 0 ? displayCount : 0}
        </span>
      </Link>
    </li>
  );
});

function KartIcon({ active }: { active?: boolean }) {
  return (
    <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 5h2l2.2 10.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L22 8H7"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}
