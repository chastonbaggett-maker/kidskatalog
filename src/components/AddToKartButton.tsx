"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { usePersistHydrated, getStorePersist } from "@/hooks/usePersistHydrated";
import { useVisualSettled } from "@/hooks/useVisualSettled";
import { useKartStore } from "@/lib/kart-store";
import { readBootInKart } from "@/lib/kart-boot";
import { pingMetrics } from "@/lib/metrics-client";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";
import { useKartEffectsReduced } from "@/hooks/useKartEffectsReduced";
import { useKartFlyBallTrigger } from "@/hooks/useKartFlyBall";

/** Fill + label wipe 480ms; pop starts at 480ms (320ms); toggle when fill completes. */
const REMOVE_FILL_MS = 480;
const REMOVE_POP_MS = 320;
const REMOVE_TOTAL_MS = REMOVE_FILL_MS + REMOVE_POP_MS + 40;
/** Keep kart guards up after the ball lands so below-fold cards do not mount mid-effect. */
const KART_ADD_SETTLE_MS = 480;

export function AddToKartButton({ toyId }: { toyId: string }) {
  const pathname = usePathname();
  const inKart = useKartStore((s) => s.ids.includes(toyId));
  const add = useKartStore((s) => s.add);
  const pulseKartNav = useKartStore((s) => s.pulseKartNav);
  const toggle = useKartStore((s) => s.toggle);
  const beginKartAdd = useKartStore((s) => s.beginKartAdd);
  const endKartAdd = useKartStore((s) => s.endKartAdd);
  const btnRef = useRef<HTMLButtonElement>(null);
  const removeTimersRef = useRef<number[]>([]);
  const kartAddEndTimerRef = useRef<number | undefined>(undefined);
  const kartHydrated = usePersistHydrated(getStorePersist(useKartStore));
  const visualReady = useVisualSettled(`${pathname}:${toyId}`);
  const bootInKart = readBootInKart(toyId);
  const [charging, setCharging] = useState(false);
  const [removing, setRemoving] = useState(false);
  /** Blocks double-add during fly-ball; also forces mint button chrome immediately. */
  const [flying, setFlying] = useState(false);
  const { fire, clear: clearConfetti, portal, bursting } = useConfettiBurst();
  const { fire: fireFlyBall } = useKartFlyBallTrigger();
  const reducedEffects = useKartEffectsReduced();

  const clearRemoveTimers = () => {
    for (const id of removeTimersRef.current) {
      window.clearTimeout(id);
    }
    removeTimersRef.current = [];
  };

  const scheduleRemoveTimer = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    removeTimersRef.current.push(id);
  };

  useEffect(() => () => {
    clearRemoveTimers();
    if (kartAddEndTimerRef.current) {
      window.clearTimeout(kartAddEndTimerRef.current);
    }
  }, []);

  useEffect(() => {
    setFlying(false);
    setCharging(false);
    if (kartAddEndTimerRef.current) {
      window.clearTimeout(kartAddEndTimerRef.current);
      kartAddEndTimerRef.current = undefined;
    }
  }, [pathname, toyId]);

  const finishKartAdd = () => {
    if (kartAddEndTimerRef.current) {
      window.clearTimeout(kartAddEndTimerRef.current);
    }
    kartAddEndTimerRef.current = window.setTimeout(() => {
      setFlying(false);
      endKartAdd();
      kartAddEndTimerRef.current = undefined;
    }, KART_ADD_SETTLE_MS);
  };

  const handlePointerDown = () => {
    if (!inKart && !removing && !flying) setCharging(true);
  };

  const clearCharge = () => setCharging(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (removing || flying) return;

    if (inKart) {
      setRemoving(true);
      clearRemoveTimers();

      scheduleRemoveTimer(() => {
        toggle(toyId);
      }, REMOVE_FILL_MS);

      scheduleRemoveTimer(() => {
        setRemoving(false);
      }, REMOVE_TOTAL_MS);

      return;
    }

    clearCharge();

    if (reducedEffects) {
      add(toyId);
      pingMetrics("kart_add");
      return;
    }

    beginKartAdd();
    setFlying(true);
    add(toyId);
    pingMetrics("kart_add");

    const point = { x: e.clientX, y: e.clientY };
    const started = fireFlyBall(point, () => {
      clearConfetti();
      pulseKartNav();
      finishKartAdd();
    });

    if (!started) {
      clearConfetti();
      pulseKartNav();
      finishKartAdd();
      return;
    }

    fire(point, GOLD_CONFETTI);
  };

  const resolvedInKart = kartHydrated ? inKart : bootInKart === true;
  const showMint = resolvedInKart || removing || flying;
  const showInKartLabel = (resolvedInKart || flying) && !removing;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={clearCharge}
        onPointerLeave={clearCharge}
        onPointerCancel={clearCharge}
        className={`add-kart-btn add-kart-btn--pill h-[3.9rem] min-w-0 flex-1 rounded-full px-5 text-base font-bold shadow-md transition active:scale-[0.98] ${
          visualReady ? "add-kart-btn--visual-ready" : ""
        } ${
          showMint
            ? "add-kart-btn--in text-white"
            : "add-kart-btn--ready bg-[var(--blue)] text-white hover:bg-[var(--blue-deep)]"
        } ${charging && !showMint ? "add-kart-btn--charging" : ""} ${
          bursting && !flying && !inKart ? "add-kart-btn--burst" : ""
        } ${removing ? "add-kart-btn--removing" : ""}`}
        aria-busy={removing || flying}
        aria-pressed={showInKartLabel}
        aria-label={inKart ? "Remove from Kart" : "Add to Kart"}
      >
        <span className="add-kart-btn__fill" aria-hidden />
        <span
          className={`add-kart-btn__label relative z-[2] inline-flex items-center justify-center ${
            removing ? "add-kart-btn__label--wipe" : ""
          }`}
        >
          {removing ? (
            <>
              <span className="add-kart-btn__label-wipe add-kart-btn__label-wipe--add">
                <span className="add-kart-btn__plus">+</span>
                <span>Add to Kart</span>
              </span>
              <span className="add-kart-btn__label-wipe add-kart-btn__label-wipe--out">
                Tap to remove
              </span>
            </>
          ) : showInKartLabel ? (
            "Tap to remove"
          ) : (
            <>
              <span className="add-kart-btn__plus">+</span>
              <span>Add to Kart</span>
            </>
          )}
        </span>
        <span className="add-kart-btn__glow" aria-hidden />
      </button>
      {portal}
    </>
  );
}