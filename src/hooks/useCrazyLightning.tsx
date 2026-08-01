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
  height: number;
};

const BOLT_MS = 950;

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
    const originY = rect.bottom - 4;
    const height = Math.max(window.innerHeight - originY, 120);
    const stamp = Date.now();
    const bolt: LightningBolt = {
      id: `${uid}-${stamp}`,
      left: rect.left + rect.width * 0.5,
      top: originY,
      height,
    };

    setBolts((prev) => [...prev, bolt]);

    window.setTimeout(() => {
      setBolts((prev) => prev.filter((b) => b.id !== bolt.id));
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
                  ["--bolt-height" as string]: `${bolt.height}px`,
                }}
              />
            ))}
          </div>,
          document.body,
        )
      : null;

  return { strike, portal };
}
