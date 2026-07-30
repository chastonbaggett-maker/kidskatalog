"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useKartStore } from "@/lib/kart-store";

type ConfettiBit = {
  id: string;
  left: number;
  top: number;
  color: string;
  dx: number;
  dy: number;
  rot: number;
  w: number;
  h: number;
  delay: number;
};

const CONFETTI_COLORS = [
  "#4e89ff",
  "#d17cff",
  "#f5a9c5",
  "#ff9f43",
  "#8f8bff",
  "#ffffff",
  "#3a6fe0",
  "#b85eef",
];

export function AddToKartButton({ toyId }: { toyId: string }) {
  const inKart = useKartStore((s) => s.ids.includes(toyId));
  const toggle = useKartStore((s) => s.toggle);
  const btnRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const [charging, setCharging] = useState(false);
  const [bursting, setBursting] = useState(false);
  const [bits, setBits] = useState<ConfettiBit[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (bits.length === 0) return;
    const t = window.setTimeout(() => {
      setBits([]);
      setBursting(false);
    }, 1100);
    return () => window.clearTimeout(t);
  }, [bits]);

  const fireConfetti = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const count = 56;
    const next: ConfettiBit[] = Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.55;
      const speed = 90 + Math.random() * 160;
      const upwardBias = -40 - Math.random() * 80;
      return {
        id: `${uid}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        left: cx,
        top: cy,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed * 0.85 + upwardBias,
        rot: (Math.random() > 0.5 ? 1 : -1) * (220 + Math.random() * 520),
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        delay: Math.random() * 40,
      };
    });

    setBursting(true);
    setBits(next);
  }, [uid]);

  const handlePointerDown = () => {
    if (!inKart) setCharging(true);
  };

  const clearCharge = () => setCharging(false);

  const handleClick = () => {
    const wasIn = inKart;
    toggle(toyId);
    clearCharge();
    if (!wasIn) fireConfetti();
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
        <span className="add-kart-btn__label relative z-[1]">
          {inKart ? "In Kart — tap to remove" : "+ Add to Kart"}
        </span>
        <span className="add-kart-btn__glow" aria-hidden />
      </button>

      {mounted &&
        bits.length > 0 &&
        createPortal(
          <div className="add-kart-confetti" aria-hidden>
            {bits.map((bit) => (
              <span
                key={bit.id}
                className="add-kart-confetti__bit"
                style={{
                  left: bit.left,
                  top: bit.top,
                  width: bit.w,
                  height: bit.h,
                  background: bit.color,
                  animationDelay: `${bit.delay}ms`,
                  ["--dx" as string]: `${bit.dx}px`,
                  ["--dy" as string]: `${bit.dy}px`,
                  ["--rot" as string]: `${bit.rot}deg`,
                }}
              />
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
