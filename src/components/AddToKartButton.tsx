"use client";

import { useRef, useState } from "react";
import { useKartStore } from "@/lib/kart-store";
import { useConfettiBurst } from "@/hooks/useConfettiBurst";

export function AddToKartButton({ toyId }: { toyId: string }) {
  const inKart = useKartStore((s) => s.ids.includes(toyId));
  const toggle = useKartStore((s) => s.toggle);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [charging, setCharging] = useState(false);
  const { fire, portal, bursting } = useConfettiBurst();

  const handlePointerDown = () => {
    if (!inKart) setCharging(true);
  };

  const clearCharge = () => setCharging(false);

  const handleClick = () => {
    const wasIn = inKart;
    toggle(toyId);
    clearCharge();
    if (!wasIn) fire(btnRef.current?.getBoundingClientRect());
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
        className={`add-kart-btn rounded-full px-6 py-3.5 text-base font-bold shadow-md transition active:scale-[0.98] ${
          inKart
            ? "add-kart-btn--in bg-[var(--purple-deep)] text-white"
            : "bg-[var(--blue)] text-white hover:bg-[var(--blue-deep)]"
        } ${charging ? "add-kart-btn--charging" : ""} ${bursting ? "add-kart-btn--burst" : ""}`}
        aria-pressed={inKart}
      >
        <span className="add-kart-btn__label relative z-[1] inline-flex items-center">
          {inKart ? (
            "In Kart — tap to remove"
          ) : (
            <>
              <span className="add-kart-btn__plus">+</span>
              <span> Add to Kart</span>
            </>
          )}
        </span>
        <span className="add-kart-btn__glow" aria-hidden />
      </button>
      {portal}
    </>
  );
}
