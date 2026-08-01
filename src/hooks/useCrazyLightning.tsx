"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { CrazyLightningBolt } from "@/components/CrazyLightningBolt";

type LightningStrike = {
  id: string;
  left: number;
  top: number;
  height: number;
};

const BOLT_MS = 1050;

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
  const [strikes, setStrikes] = useState<LightningStrike[]>([]);

  useEffect(() => setMounted(true), []);

  const strike = useCallback(() => {
    const el = pickStrikeOrigin(primaryRef.current, altRef?.current ?? null);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const originY = rect.top + rect.height * 0.55;
    const height = Math.max(window.innerHeight - originY + 8, 140);
    const stamp = Date.now();
    const bolt: LightningStrike = {
      id: `${uid}-${stamp}`,
      left: rect.left + rect.width * 0.5,
      top: originY,
      height,
    };

    setStrikes((prev) => [...prev, bolt]);

    window.setTimeout(() => {
      setStrikes((prev) => prev.filter((b) => b.id !== bolt.id));
    }, BOLT_MS + 120);
  }, [uid, primaryRef, altRef]);

  const portal =
    mounted && strikes.length > 0
      ? createPortal(
          <div className="crazy-lightning-layer" aria-hidden>
            {strikes.map((bolt) => (
              <CrazyLightningBolt key={bolt.id} {...bolt} />
            ))}
          </div>,
          document.body,
        )
      : null;

  return { strike, portal };
}
