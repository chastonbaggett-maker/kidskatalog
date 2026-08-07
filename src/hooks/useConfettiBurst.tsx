"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { resolveBurstPoint, type BurstPoint } from "@/lib/burst-point";

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
  "#3ecfc0",
  "#8f8bff",
  "#ffffff",
  "#3a6fe0",
  "#b85eef",
];

export const GOLD_CONFETTI = [
  "#ffd700",
  "#ffb800",
  "#ffe566",
  "#f5c842",
  "#fff4c2",
  "#e6a800",
  "#ffdf00",
  "#ffffff",
];

export function useConfettiBurst() {
  const uid = useId();
  const [bursting, setBursting] = useState(false);
  const [bits, setBits] = useState<ConfettiBit[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (bits.length === 0) return;
    const t = window.setTimeout(() => setBits([]), 1100);
    return () => window.clearTimeout(t);
  }, [bits]);

  const clear = useCallback(() => {
    setBursting(false);
    setBits([]);
  }, []);

  const fire = useCallback(
    (
      origin: BurstPoint | DOMRect | null | undefined,
      colors: string[] = CONFETTI_COLORS,
    ) => {
      const point = resolveBurstPoint(origin);
      if (!point) return;
      const palette = colors.length > 0 ? colors : CONFETTI_COLORS;

      const { x: cx, y: cy } = point;
      const count = 56;
      const next: ConfettiBit[] = Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.55;
        const speed = 90 + Math.random() * 160;
        const upwardBias = -40 - Math.random() * 80;
        return {
          id: `${uid}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          left: cx,
          top: cy,
          color: palette[i % palette.length],
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
      window.setTimeout(() => setBursting(false), 760);
    },
    [uid],
  );

  const fxRoot =
    typeof document !== "undefined"
      ? document.getElementById("kart-fx-root") ?? document.body
      : null;

  const portal =
    mounted && bits.length > 0 && fxRoot
      ? createPortal(
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
          fxRoot,
        )
      : null;

  return { fire, clear, portal, bursting };
}
