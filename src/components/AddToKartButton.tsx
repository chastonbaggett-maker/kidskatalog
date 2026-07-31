"use client";

import { useEffect, useRef, useState } from "react";
import { useKartStore } from "@/lib/kart-store";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";

export function AddToKartButton({ toyId }: { toyId: string }) {
  const inKart = useKartStore((s) => s.ids.includes(toyId));
  const toggle = useKartStore((s) => s.toggle);
  const btnRef = useRef<HTMLButtonElement>(null);
  const removeTimersRef = useRef<number[]>([]);
  const [charging, setCharging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { fire, portal, bursting } = useConfettiBurst();

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

  useEffect(() => () => clearRemoveTimers(), []);

  const handlePointerDown = () => {
    if (!inKart && !removing) setCharging(true);
  };

  const clearCharge = () => setCharging(false);

  const handleClick = () => {
    if (removing) return;

    if (inKart) {
      setRemoving(true);
      clearRemoveTimers();
      scheduleRemoveTimer(() => {
        toggle(toyId);
        scheduleRemoveTimer(() => {
          setRemoving(false);
        }, 100);
      }, 720);
      return;
    }

    const wasIn = inKart;
    toggle(toyId);
    clearCharge();
    if (!wasIn) fire(btnRef.current?.getBoundingClientRect(), GOLD_CONFETTI);
  };

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
          inKart && !removing
            ? "add-kart-btn--in text-white"
            : "bg-[var(--blue)] text-white hover:bg-[var(--blue-deep)]"
        } ${charging ? "add-kart-btn--charging" : ""} ${bursting ? "add-kart-btn--burst" : ""} ${
          removing ? "add-kart-btn--removing" : ""
        }`}
        aria-pressed={inKart && !removing}
        aria-label={inKart ? "Remove from Kart" : "Add to Kart"}
        aria-busy={removing}
      >
        <span className="add-kart-btn__fill" aria-hidden />
        <span className="add-kart-btn__label relative z-[1] inline-flex items-center justify-center">
          {inKart ? (
            "In Kart — tap to remove"
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
