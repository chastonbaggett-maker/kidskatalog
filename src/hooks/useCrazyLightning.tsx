"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type LightningBolt = {
  id: string;
  left: number;
  top: number;
  rot: number;
  drift: number;
  delay: number;
  travel: number;
};

const BOLT_MS = 1150;

export function useCrazyLightning() {
  const uid = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [bolts, setBolts] = useState<LightningBolt[]>([]);

  useEffect(() => setMounted(true), []);

  const strike = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const originY = rect.bottom - 6;
    const travel = window.innerHeight - originY + 140;
    const stamp = Date.now();

    const batch: LightningBolt[] = [
      {
        id: `${uid}-a-${stamp}`,
        left: rect.left + rect.width * 0.24,
        top: originY,
        rot: -18,
        drift: -36,
        delay: 0,
        travel,
      },
      {
        id: `${uid}-b-${stamp}`,
        left: rect.left + rect.width * 0.5,
        top: originY,
        rot: 4,
        drift: 0,
        delay: 50,
        travel,
      },
      {
        id: `${uid}-c-${stamp}`,
        left: rect.left + rect.width * 0.76,
        top: originY,
        rot: 17,
        drift: 38,
        delay: 90,
        travel,
      },
    ];

    setBolts((prev) => [...prev, ...batch]);

    window.setTimeout(() => {
      setBolts((prev) => prev.filter((b) => !batch.some((n) => n.id === b.id)));
    }, BOLT_MS + 120);
  }, [uid]);

  const portal =
    mounted && bolts.length > 0
      ? createPortal(
          <div className="crazy-lightning-layer" aria-hidden>
            {bolts.map((bolt) => (
              <span
                key={bolt.id}
                className="crazy-lightning-bolt"
                style={{
                  left: bolt.left,
                  top: bolt.top,
                  animationDelay: `${bolt.delay}ms`,
                  ["--rot" as string]: `${bolt.rot}deg`,
                  ["--drift" as string]: `${bolt.drift}px`,
                  ["--travel" as string]: `${bolt.travel}px`,
                }}
              />
            ))}
          </div>,
          document.body,
        )
      : null;

  return { btnRef, strike, portal };
}
