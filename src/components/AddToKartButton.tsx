"use client";

import { usePathname } from "next/navigation";
import { usePersistHydrated, getStorePersist } from "@/hooks/usePersistHydrated";
import { useVisualSettled } from "@/hooks/useVisualSettled";
import { useKartStore } from "@/lib/kart-store";
import { readBootInKart } from "@/lib/kart-boot";
import { pingMetrics } from "@/lib/metrics-client";
import { useKartEffectsReduced } from "@/hooks/useKartEffectsReduced";
import { useKartFlyBallTrigger } from "@/hooks/useKartFlyBall";

/**
 * Minimal add/remove: click updates the store and button immediately.
 * Fly-ball is decorative only — no landing callbacks or nav pulses.
 */
export function AddToKartButton({ toyId }: { toyId: string }) {
  const pathname = usePathname();
  const inKart = useKartStore((s) => s.ids.includes(toyId));
  const add = useKartStore((s) => s.add);
  const remove = useKartStore((s) => s.remove);
  const kartHydrated = usePersistHydrated(getStorePersist(useKartStore));
  const visualReady = useVisualSettled(`${pathname}:${toyId}`);
  const bootInKart = readBootInKart(toyId);
  const { fire: fireFlyBall } = useKartFlyBallTrigger();
  const reducedEffects = useKartEffectsReduced();

  const showInKart = kartHydrated ? inKart : bootInKart === true;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (showInKart) {
      remove(toyId);
      return;
    }

    add(toyId);
    pingMetrics("kart_add");

    if (!reducedEffects) {
      fireFlyBall({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`add-kart-btn add-kart-btn--pill h-[3.9rem] min-w-0 flex-1 rounded-full px-5 text-base font-bold shadow-md transition active:scale-[0.98] ${
        visualReady ? "add-kart-btn--visual-ready" : ""
      } ${
        showInKart
          ? "add-kart-btn--in text-white"
          : "add-kart-btn--ready bg-[var(--blue)] text-white hover:bg-[var(--blue-deep)]"
      }`}
      aria-pressed={showInKart}
      aria-label={showInKart ? "Remove from Kart" : "Add to Kart"}
    >
      <span className="add-kart-btn__fill" aria-hidden />
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
