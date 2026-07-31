"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type RefObject,
} from "react";
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

function pickStrikeOrigin(...candidates: (HTMLElement | null | undefined)[]) {
  for (const el of candidates) {
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < window.innerHeight
    ) {
      return el;
    }
  }
  return candidates.find(Boolean) ?? null;
}

export function useCrazyLightning(
  primaryRef: RefObject<HTMLElement | null>,
  altRef?: RefObject<HTMLElement | null>,
) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);
  const [bolts, setBolts] = useState<LightningBolt[]>([]);

  useEffect(() => setMounted(true), []);

  const strike = useCallback(() => {
    const el = pickStrikeOrigin(primaryRef.current, altRef?.current ?? null);
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
  }, [uid, primaryRef, altRef]);

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

  return { strike, portal };
}
