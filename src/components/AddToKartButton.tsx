"use client";

import { useEffect, useRef, useState } from "react";
import { useKartStore } from "@/lib/kart-store";
import { pingMetrics } from "@/lib/metrics-client";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";
import { useKartFlyBallTrigger } from "@/hooks/useKartFlyBall";

/** Fill + label wipe 480ms; pop starts at 480ms (320ms); toggle when fill completes. */
const REMOVE_FILL_MS = 480;
const REMOVE_POP_MS = 320;
const REMOVE_TOTAL_MS = REMOVE_FILL_MS + REMOVE_POP_MS + 40;

export function AddToKartButton({ toyId }: { toyId: string }) {
  const inKart = useKartStore((s) => s.ids.includes(toyId));
  const add = useKartStore((s) => s.add);
  const toggle = useKartStore((s) => s.toggle);
  const beginKartAdd = useKartStore((s) => s.beginKartAdd);
  const endKartAdd = useKartStore((s) => s.endKartAdd);
  const btnRef = useRef<HTMLButtonElement>(null);
  const removeTimersRef = useRef<number[]>([]);
  const kartAddEndTimerRef = useRef<number | undefined>(undefined);
  const [charging, setCharging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [adding, setAdding] = useState(false);
  const { fire, portal, bursting } = useConfettiBurst();
  const { fire: fireFlyBall, pulseKartNav } = useKartFlyBallTrigger();

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

  const finishKartAdd = () => {
    if (kartAddEndTimerRef.current) {
      window.clearTimeout(kartAddEndTimerRef.current);
    }
    kartAddEndTimerRef.current = window.setTimeout(() => {
      endKartAdd();
      kartAddEndTimerRef.current = undefined;
    }, 480);
  };

  const handlePointerDown = () => {
    if (!inKart && !removing && !adding) setCharging(true);
  };

  const clearCharge = () => setCharging(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (removing || adding) return;

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
    beginKartAdd();
    const point = { x: e.clientX, y: e.clientY };
    const started = fireFlyBall(point, () => {
      add(toyId);
      setAdding(false);
      pingMetrics("kart_add");
      finishKartAdd();
    });

    if (started) {
      setAdding(true);
    }

    fire(point, GOLD_CONFETTI);

    if (!started) {
      add(toyId);
      pulseKartNav();
      pingMetrics("kart_add");
      finishKartAdd();
    }
  };

  const showMint = inKart || adding || removing;
  const showInKartLabel = (inKart || adding) && !removing;

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
          showMint
            ? "add-kart-btn--in text-white"
            : "add-kart-btn--ready bg-[var(--blue)] text-white hover:bg-[var(--blue-deep)]"
        } ${charging && !showMint ? "add-kart-btn--charging" : ""} ${
          bursting && !adding && !inKart ? "add-kart-btn--burst" : ""
        } ${removing ? "add-kart-btn--removing" : ""}`}
        aria-pressed={showInKartLabel}
        aria-label={inKart ? "Remove from Kart" : "Add to Kart"}
        aria-busy={removing}
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
