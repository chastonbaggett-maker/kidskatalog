"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminPinGate } from "@/components/admin/AdminPinGate";
import { useAccentStore } from "@/lib/accent-store";
import { registerKartNavEl } from "@/lib/kart-nav-target";
import { useKartStore } from "@/lib/kart-store";
import { useToyPileModeStore } from "@/lib/toy-pile-store";
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
  const count = useKartStore((s) => s.ids.length);
  const kartBounceToken = useKartStore((s) => s.kartBounceToken);
  const accentClass = useViewAccentClass();
  const badgeClass = useViewBadgeClass();
  const toyPileMode = useToyPileModeStore((s) => s.toyPileMode);
  const enterPhase = useToyPileModeStore((s) => s.enterPhase);
  const onShopBrowse =
    pathname === "/" ||
    pathname.startsWith("/shop") ||
    pathname.startsWith("/toy");
  const revealGateOpen = usePileRevealGate();
  const pileNavActive =
    onShopBrowse && toyPileMode && enterPhase !== "chrome" && revealGateOpen;
  const pileNavEnterVisible = usePileEnterReveal(pileNavActive);
  const pileShelfRaised = pileNavActive && pileNavEnterVisible;
  const [landing, setLanding] = useState(false);
  const [pinGateOpen, setPinGateOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const brandTapCount = useRef(0);
  const brandTapTimer = useRef<number | null>(null);
  const brandNavTimer = useRef<number | null>(null);

  const handleAdminUnlocked = useCallback(() => {
    setPinGateOpen(false);
    setAdminOpen(true);
  }, []);

  useEffect(() => {
    if (kartBounceToken === 0) return;
    setLanding(true);
    const t = window.setTimeout(() => setLanding(false), 520);
    return () => window.clearTimeout(t);
  }, [kartBounceToken]);

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
          if (!onHome) router.push("/shop");
        }
        brandNavTimer.current = null;
      }, BRAND_SINGLE_TAP_NAV_MS);
    }
  }

  const items = [
    { href: "/shop", label: "Home", icon: HomeIcon },
    { href: "/kart", label: "Kart", icon: KartIcon, badge: count },
    { href: "/menu", label: "Menu", icon: MenuIcon },
  ] as const;

  const brandActive =
    pathname === "/" || pathname.startsWith("/shop") || pathname.startsWith("/toy");

  return (
    <>
      <nav
        className={`bottom-nav absolute inset-x-0 bottom-0 z-40${
          pileNavActive ? " bottom-nav--pile bottom-nav-enter" : ""
        }${pileShelfRaised ? " is-shelf-raised" : ""}${
          pileNavEnterVisible ? " is-enter-visible" : ""
        }`}
      >
        {pileNavActive && (
          <div className="bottom-nav__icons-base" aria-hidden="true" />
        )}
        <ul className="bottom-nav__icons flex items-center justify-around px-2.5 pt-2">
          {items.map((item) => {
            const active =
              item.href === "/shop"
                ? pathname.startsWith("/shop") || pathname.startsWith("/toy")
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const isKart = item.href === "/kart";
            return (
              <li key={item.href}>
                <Link
                  ref={isKart ? registerKartNavEl : undefined}
                  href={item.href}
                  className={`relative flex h-14 w-16 flex-col items-center justify-center rounded-2xl transition active:scale-95 ${accentClass} ${
                    active ? "opacity-100" : "opacity-80"
                  } ${isKart && landing ? "bottom-nav__kart--land" : ""}`}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                >
                  {isKart ? (
                    <span className="bottom-nav__kart-icon">
                      <Icon active={active} />
                    </span>
                  ) : (
                    <Icon active={active} />
                  )}
                  {"badge" in item && item.badge > 0 && (
                    <span
                      className={`absolute right-1.5 top-0 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-bold text-white ${badgeClass} ${
                        isKart && landing ? "bottom-nav__kart-badge--pop" : ""
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
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

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function MenuIcon({ active }: { active?: boolean }) {
  return (
    <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="4"
        ry="4"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 2}
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
