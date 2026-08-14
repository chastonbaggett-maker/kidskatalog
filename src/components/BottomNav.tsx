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

function useViewAccentClass() {
  const audience = useAccentStore((s) => s.audience);
  if (audience === "boys") return "text-[var(--boys-chip)]";
  if (audience === "girls") return "text-[var(--girls-chip)]";
  return "text-[var(--mint)]";
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
  const accentClass = useViewAccentClass();
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

  const navItems = [
    { href: "/shop", label: "Home", icon: HomeIcon },
    { href: "/menu", label: "Watch", icon: MenuIcon },
  ] as const;

  const brandActive =
    pathname === "/" || pathname.startsWith("/shop") || pathname.startsWith("/toy");

  const showFrostFill = !pileNavShelf || pileShelfMounted;

  return (
    <>
      <nav
        className={`bottom-nav absolute inset-x-0 bottom-0 z-40${
          pileNavShelf ? " bottom-nav--pile bottom-nav-enter" : ""
        }${pileShelfMounted ? " is-shelf-raised" : ""}${
          pileNavEnterVisible ? " is-enter-visible" : ""
        }${crazyMode ? " bottom-nav--crazy" : ""}`}
      >
        {showFrostFill && (
          <div className="bottom-nav__frost" aria-hidden="true" />
        )}
        <ul className="bottom-nav__icons flex items-center justify-around px-2.5 pt-2">
          {navItems.map((item) => {
            const active =
              item.href === "/shop"
                ? pathname.startsWith("/shop") || pathname.startsWith("/toy")
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`relative flex h-14 w-16 flex-col items-center justify-center rounded-2xl transition active:scale-95 ${accentClass} ${
                    active ? "opacity-100" : "opacity-80"
                  }`}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon active={active} />
                </Link>
              </li>
            );
          })}
          <KartNavLink
            active={pathname === "/kart" || pathname.startsWith("/kart/")}
            accentClass={accentClass}
            badgeClass={badgeClass}
          />
          <li>
            <button
              type="button"
              onClick={handleBrandTap}
              className={`relative flex h-14 w-16 flex-col items-center justify-center rounded-2xl transition active:scale-95 ${accentClass} ${
                brandActive ? "opacity-100" : "opacity-80"
              }`}
              aria-label="Brand"
            >
              <BrandIcon />
            </button>
          </li>
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

/** Shared outline weight for Home / Kart / Watch (logo brand icon unchanged). */
const NAV_STROKE = 2;
const NAV_STROKE_ACTIVE = 2.4;
const NAV_ICON_PX = 31;
const NAV_ICON_VB = 24;
/** Watch SVG is 1:1 viewBox→px; scale stroke to match Home/Kart’s rendered weight. */
const MENU_STROKE = NAV_STROKE * (NAV_ICON_PX / NAV_ICON_VB);
const MENU_STROKE_ACTIVE = NAV_STROKE_ACTIVE * (NAV_ICON_PX / NAV_ICON_VB);

function HomeIcon({ active }: { active?: boolean }) {
  // Pile of toys — blocks + ball stacked for the Home / browse entry.
  const stroke = active ? NAV_STROKE_ACTIVE : NAV_STROKE;
  return (
    <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden>
      {/* Bottom block */}
      <rect
        x="3.5"
        y="15.5"
        width="10"
        height="5.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      {/* Right block */}
      <rect
        x="12.5"
        y="13.5"
        width="8"
        height="7.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      {/* Top-left block */}
      <rect
        x="5"
        y="9"
        width="7.5"
        height="6.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      {/* Ball on the pile */}
      <circle
        cx="15.5"
        cy="8.5"
        r="4"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      {/* Small block peeking on top */}
      <rect
        x="7.5"
        y="4.5"
        width="4.5"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth={stroke}
      />
    </svg>
  );
}

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
