"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { usePersistHydrated, getStorePersist } from "@/hooks/usePersistHydrated";
import { useVisualSettled } from "@/hooks/useVisualSettled";
import { useKartStore } from "@/lib/kart-store";
import { readBootInKart } from "@/lib/kart-boot";
import { pingMetrics } from "@/lib/metrics-client";
import { useKartEffectsReduced } from "@/hooks/useKartEffectsReduced";
import { fireKartFlyBall, notifyKartFlyBallLand } from "@/lib/kart-fly-ball";

const CLICK_PULSE_MS = 340;

/**
 * Minimal add/remove: click updates the store and button immediately.
 * Fly-ball is a deferred decorative paint only (no store/React coupling).
 */
export function AddToKartButton({ toyId }: { toyId: string }) {
  const pathname = usePathname();
  const inKart = useKartStore((s) => s.ids.includes(toyId));
  const add = useKartStore((s) => s.add);
  const remove = useKartStore((s) => s.remove);
  const kartHydrated = usePersistHydrated(getStorePersist(useKartStore));
  const visualReady = useVisualSettled(`${pathname}:${toyId}`);
  const bootInKart = readBootInKart(toyId);
  const reducedEffects = useKartEffectsReduced();
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

    if (!reducedEffects) {
      // Paint button/badge first; start the ball on the next frame.
      requestAnimationFrame(() => {
        if (!fireKartFlyBall(point)) notifyKartFlyBallLand();
      });
    } else {
      notifyKartFlyBallLand();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`add-kart-btn add-kart-btn--pill h-[3.9rem] min-w-0 flex-1 rounded-full px-5 text-base font-bold shadow-md ${
        visualReady ? "add-kart-btn--visual-ready" : ""
      } ${
        showInKart
          ? "add-kart-btn--in text-white"
          : "add-kart-btn--ready bg-[var(--blue)] text-white"
      } ${pulsing ? "add-kart-btn--pulse" : ""}`}
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
  );
}
