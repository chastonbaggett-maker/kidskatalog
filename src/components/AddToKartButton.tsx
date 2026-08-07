"use client";

import { usePathname } from "next/navigation";
import { usePersistHydrated, getStorePersist } from "@/hooks/usePersistHydrated";
import { useVisualSettled } from "@/hooks/useVisualSettled";
import { useKartStore } from "@/lib/kart-store";
import { readBootInKart } from "@/lib/kart-boot";
import { pingMetrics } from "@/lib/metrics-client";
import { useKartEffectsReduced } from "@/hooks/useKartEffectsReduced";
import { fireKartFlyBall } from "@/lib/kart-fly-ball";

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

  const showInKart = kartHydrated ? inKart : bootInKart === true;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
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
        fireKartFlyBall(point);
      });
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
  );
}
