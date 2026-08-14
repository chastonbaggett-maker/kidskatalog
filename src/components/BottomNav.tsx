"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminPinGate } from "@/components/admin/AdminPinGate";
import { useAccentStore } from "@/lib/accent-store";
import { useCrazyModeStore } from "@/lib/crazy-mode-store";
import { registerPileNavModeRow } from "@/lib/pile-nav-mode-target";
import { beginRouteChange } from "@/lib/route-change";
import { useToyPileModeStore, isPileBrowseRoute } from "@/lib/toy-pile-store";
import { KartNavLink } from "@/components/KartNavLink";
import { usePileEnterReveal } from "@/hooks/usePileEnterReveal";
import { usePileRevealGate } from "@/hooks/usePileRevealGate";

const BRAND_TAP_TARGET = 10;
const BRAND_TAP_WINDOW_MS = 2500;
/** Wait longer than a rapid multi-tap before treating tap 1 as "go home". */
const BRAND_SINGLE_TAP_NAV_MS = 400;

function useViewAccentVar() {
  const audience = useAccentStore((s) => s.audience);
  if (audience === "boys") return "var(--boys-chip)";
  if (audience === "girls") return "var(--girls-chip)";
  return "var(--mint)";
}

function useViewBadgeClass() {
  const audience = useAccentStore((s) => s.audience);
  if (audience === "boys") return "bg-[var(--boys-chip)]";
  if (audience === "girls") return "bg-[var(--girls-chip)]";
  return "bg-[var(--mint)]";
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const accentVar = useViewAccentVar();
  const badgeClass = useViewBadgeClass();
  const toyPileMode = useToyPileModeStore((s) => s.toyPileMode);
  const enterPhase = useToyPileModeStore((s) => s.enterPhase);
  const crazyMode = useCrazyModeStore((s) => s.crazyMode);
  const onPileBrowseRoute = isPileBrowseRoute(pathname);
  const revealGateOpen = usePileRevealGate();
  // Raised shelf with mode filters only on browse routes; mode itself stays session-wide.
  const pileNavShelf =
    onPileBrowseRoute &&
    toyPileMode &&
    enterPhase !== "chrome" &&
    revealGateOpen;
  const pileNavEnterVisible = usePileEnterReveal(pileNavShelf);
  const pileShelfMounted = pileNavShelf;
  const [pinGateOpen, setPinGateOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const brandTapCount = useRef(0);
  const brandTapTimer = useRef<number | null>(null);
  const brandNavTimer = useRef<number | null>(null);

  const handleAdminUnlocked = useCallback(() => {
    setPinGateOpen(false);
    setAdminOpen(true);
  }, []);

  function resetBrandTaps() {
    brandTapCount.current = 0;
    if (brandTapTimer.current !== null) {
      window.clearTimeout(brandTapTimer.current);
      brandTapTimer.current = null;
    }
    if (brandNavTimer.current !== null) {
      window.clearTimeout(brandNavTimer.current);
      brandNavTimer.current = null;
    }
  }

  function handleBrandTap(e: React.MouseEvent) {
    e.preventDefault();
    brandTapCount.current += 1;

    if (brandNavTimer.current !== null) {
      window.clearTimeout(brandNavTimer.current);
      brandNavTimer.current = null;
    }

    if (brandTapTimer.current === null) {
      brandTapTimer.current = window.setTimeout(() => {
        resetBrandTaps();
      }, BRAND_TAP_WINDOW_MS);
    }

    if (brandTapCount.current >= BRAND_TAP_TARGET) {
      resetBrandTaps();
      setPinGateOpen(true);
      return;
    }

    // Only a lone tap should navigate home — not taps 2–9 of the admin easter egg.
    if (brandTapCount.current === 1) {
      brandNavTimer.current = window.setTimeout(() => {
        if (brandTapCount.current === 1) {
          const onHome =
            pathname === "/" ||
            pathname.startsWith("/shop") ||
            pathname.startsWith("/toy");
          if (!onHome) {
            beginRouteChange();
            router.push("/shop");
          }
        }
        brandNavTimer.current = null;
      }, BRAND_SINGLE_TAP_NAV_MS);
    }
  }

  const homeActive =
    pathname === "/" || pathname.startsWith("/shop") || pathname.startsWith("/toy");
  const watchActive =
    pathname === "/menu" || pathname.startsWith("/menu/");

  const showFrostFill = !pileNavShelf || pileShelfMounted;

  function pulseNavItem(e: React.PointerEvent<HTMLElement>) {
    const item = e.currentTarget;
    item.classList.remove("is-pulsing");
    // Force reflow so rapid taps retrigger the pulse animation.
    void item.offsetWidth;
    item.classList.add("is-pulsing");
  }

  function clearNavPulse(e: React.AnimationEvent<HTMLElement>) {
    if (e.animationName === "bottom-nav-tap-pulse") {
      e.currentTarget.classList.remove("is-pulsing");
    }
  }

  return (
    <>
      <nav
        className={`bottom-nav absolute inset-x-0 bottom-0 z-40${
          pileNavShelf ? " bottom-nav--pile bottom-nav-enter" : ""
        }${pileShelfMounted ? " is-shelf-raised" : ""}${
          pileNavEnterVisible ? " is-enter-visible" : ""
        }${crazyMode ? " bottom-nav--crazy" : ""}`}
        style={{ ["--bottom-nav-accent" as string]: accentVar }}
      >
        {showFrostFill && (
          <div className="bottom-nav__frost" aria-hidden="true" />
        )}
        <ul className="bottom-nav__icons flex items-center justify-around px-2.5 pt-2">
          <li>
            <button
              type="button"
              onClick={handleBrandTap}
              onPointerDown={pulseNavItem}
              onAnimationEnd={clearNavPulse}
              className={`bottom-nav__item relative flex h-14 w-16 flex-col items-center justify-center ${
                homeActive ? "bottom-nav__item--active" : ""
              }`}
              aria-label="Home"
              aria-current={homeActive ? "page" : undefined}
            >
              <BrandIcon />
            </button>
          </li>
          <li>
            <Link
              href="/menu"
              onPointerDown={pulseNavItem}
              onAnimationEnd={clearNavPulse}
              className={`bottom-nav__item relative flex h-14 w-16 flex-col items-center justify-center ${
                watchActive ? "bottom-nav__item--active" : ""
              }`}
              aria-label="Watch"
              aria-current={watchActive ? "page" : undefined}
            >
              <MenuIcon active={watchActive} />
            </Link>
          </li>
          <KartNavLink
            active={pathname === "/kart" || pathname.startsWith("/kart/")}
            badgeClass={badgeClass}
          />
        </ul>
        {pileShelfMounted && (
          <div
            ref={registerPileNavModeRow}
            className="bottom-nav__mode-row"
            data-testid="pile-nav-mode-row"
          />
        )}
      </nav>

      <AdminPinGate
        open={pinGateOpen}
        onClose={() => setPinGateOpen(false)}
        onUnlocked={handleAdminUnlocked}
      />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
    </>
  );
}

/** Shared outline weight for Kart / Watch (logo home icon uses mask fill). */
const NAV_STROKE = 2;
const NAV_STROKE_ACTIVE = 2.4;
const NAV_ICON_PX = 31;
const NAV_ICON_VB = 24;
/** Watch SVG is 1:1 viewBox→px; scale stroke to match Kart’s rendered weight. */
const MENU_STROKE = NAV_STROKE * (NAV_ICON_PX / NAV_ICON_VB);
const MENU_STROKE_ACTIVE = NAV_STROKE_ACTIVE * (NAV_ICON_PX / NAV_ICON_VB);

function MenuIcon({ active }: { active?: boolean }) {
  // Tall toy-card frame with a play mark — suggests video / watching.
  const stroke = active ? MENU_STROKE_ACTIVE : MENU_STROKE;
  return (
    <svg width="22" height="38" viewBox="0 0 22 38" fill="none" aria-hidden>
      <rect
        x="2"
        y="2"
        width="18"
        height="34"
        rx="4.5"
        ry="4.5"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <path
        d="M9.2 14.2v9.6L16.1 19 9.2 14.2z"
        fill="currentColor"
      />
    </svg>
  );
}

function BrandIcon() {
  return (
    <span
      aria-hidden
      className="block h-[38px] w-[26px] bg-current"
      style={{
        WebkitMaskImage: "url(/logo-icon.png)",
        maskImage: "url(/logo-icon.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
