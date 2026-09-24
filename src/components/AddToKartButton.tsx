"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { usePersistHydrated, getStorePersist } from "@/hooks/usePersistHydrated";
import { useVisualSettled } from "@/hooks/useVisualSettled";
import { useKartStore } from "@/lib/kart-store";
import { readBootInKart } from "@/lib/kart-boot";
import { pingMetrics } from "@/lib/metrics-client";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";
import { fireKartFlyBall, notifyKartFlyBallLand } from "@/lib/kart-fly-ball";

const CLICK_PULSE_MS = 420;

/**
 * Minimal add/remove: click updates the store and button immediately.
 * Fly-ball is a deferred decorative paint only (no store/React coupling).
 */
function useKartToggle(toyId: string) {
  const pathname = usePathname();
  const inKart = useKartStore((s) => s.ids.includes(toyId));
  const add = useKartStore((s) => s.add);
  const remove = useKartStore((s) => s.remove);
  const kartHydrated = usePersistHydrated(getStorePersist(useKartStore));
  const visualReady = useVisualSettled(`${pathname}:${toyId}`);
  const bootInKart = readBootInKart(toyId);
  const { fire: fireConfetti, portal: confettiPortal } = useConfettiBurst();
  const [pulsing, setPulsing] = useState(false);
  const pulseTimerRef = useRef<number | undefined>(undefined);

  const showInKart = kartHydrated ? inKart : bootInKart === true;

  useEffect(
    () => () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    },
    [],
  );

  const triggerPulse = () => {
    setPulsing(false);
    window.requestAnimationFrame(() => {
      setPulsing(true);
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = window.setTimeout(() => {
        setPulsing(false);
        pulseTimerRef.current = undefined;
      }, CLICK_PULSE_MS);
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerPulse();

    if (showInKart) {
      remove(toyId);
      return;
    }

    const point = { x: e.clientX, y: e.clientY };
    add(toyId);
    pingMetrics("kart_add");

    // Confetti + fly-ball run on mobile too (SFX unlocks in the click turn on iOS).
    fireConfetti(point, GOLD_CONFETTI);
    requestAnimationFrame(() => {
      if (!fireKartFlyBall(point)) notifyKartFlyBallLand();
    });
  };

  return {
    showInKart,
    visualReady,
    pulsing,
    handleClick,
    confettiPortal,
  };
}

export function AddToKartButton({ toyId }: { toyId: string }) {
  const { showInKart, visualReady, pulsing, handleClick, confettiPortal } =
    useKartToggle(toyId);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`add-kart-btn add-kart-btn--pill h-[3.9rem] min-w-0 flex-1 rounded-full px-5 text-base font-bold shadow-md ${
          visualReady ? "add-kart-btn--visual-ready" : ""
        } ${showInKart ? "add-kart-btn--in" : "add-kart-btn--ready"} ${
          pulsing ? "add-kart-btn--pulse" : ""
        }`}
        aria-pressed={showInKart}
        aria-label={showInKart ? "Remove from Kart" : "Add to Kart"}
      >
        <span className="add-kart-btn__label relative z-[2] inline-flex items-center justify-center">
          {showInKart ? (
            "Tap to remove"
          ) : (
            <>
              <span className="add-kart-btn__plus">+</span>
              <span>Add to Kart</span>
            </>
          )}
        </span>
      </button>
      {confettiPortal}
    </>
  );
}

/** Product page: the add pill and Kart circle trade size when the toy is saved. */
export function ProductKartActions({ toyId }: { toyId: string }) {
  const { showInKart, visualReady, handleClick, confettiPortal } =
    useKartToggle(toyId);
  const [giggling, setGiggling] = useState(false);
  const settledRef = useRef(false);
  const giggleTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!visualReady) return;
    if (!settledRef.current) {
      settledRef.current = true;
      return;
    }
    setGiggling(true);
    if (giggleTimerRef.current) window.clearTimeout(giggleTimerRef.current);
    giggleTimerRef.current = window.setTimeout(() => {
      setGiggling(false);
      giggleTimerRef.current = undefined;
    }, 1100);
  }, [showInKart, visualReady]);

  useEffect(
    () => () => {
      if (giggleTimerRef.current) window.clearTimeout(giggleTimerRef.current);
    },
    [],
  );

  return (
    <>
      <div
        className={`product-kart-actions mt-6 ${
          showInKart ? "is-in-kart" : ""
        } ${visualReady ? "is-visual-ready" : ""} ${
          giggling ? "is-giggling" : ""
        }`}
      >
        <div className="product-kart-slot product-kart-slot--add">
          <button
            type="button"
            onClick={handleClick}
            className={`add-kart-btn add-kart-btn--pill product-kart-add h-[3.9rem] min-w-0 rounded-full text-base font-bold shadow-md ${
              visualReady ? "add-kart-btn--visual-ready" : ""
            } add-kart-btn--ready`}
            aria-pressed={showInKart}
            aria-label={showInKart ? "Remove from Kart" : "Add to Kart"}
          >
            <span className="kart-swap-stack add-kart-btn__label relative z-[2]">
              <span className="kart-swap-glyph kart-swap-glyph--add">
                <span className="add-kart-btn__plus">+</span>
                <span>Add to Kart</span>
              </span>
              <span className="kart-swap-glyph kart-swap-glyph--remove" aria-hidden>
                <span className="kart-swap-minus" />
              </span>
            </span>
          </button>
        </div>
        <div className="product-kart-slot product-kart-slot--go">
          <Link
            href="/kart"
            aria-label="Go to Kart"
            className={`kart-go-btn product-kart-go inline-flex h-[3.9rem] min-w-0 items-center justify-center rounded-full text-base font-bold shadow-md ${
              visualReady ? "kart-go-btn--visual-ready" : ""
            }`}
          >
            <span className="product-kart-go__label" aria-hidden>
              <span>Go to Kart</span>
            </span>
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
      </div>
      {confettiPortal}
    </>
  );
}
