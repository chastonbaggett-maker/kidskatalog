"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CrazyLightningBolt } from "@/components/CrazyLightningBolt";

export type LightningTarget = {
  left: number;
  top: number;
  height: number;
};

type LightningStrike = LightningTarget & {
  id: string;
};

const BOLT_MS = 1050;

/** Minimum share of the card that must be visible inside the scroller. */
const MIN_VISIBLE_RATIO = 0.35;

export function getVisibleFeedSlots(scroller: HTMLElement): number[] {
  const scrollerRect = scroller.getBoundingClientRect();
  const cards = scroller.querySelectorAll<HTMLElement>("[data-feed-slot]");
  const visible: number[] = [];

  cards.forEach((card) => {
    const slot = Number(card.dataset.feedSlot);
    if (Number.isNaN(slot)) return;

    const rect = card.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const overlapTop = Math.max(rect.top, scrollerRect.top);
    const overlapBottom = Math.min(rect.bottom, scrollerRect.bottom);
    const visibleHeight = overlapBottom - overlapTop;

    if (visibleHeight <= 0) return;
    if (visibleHeight / rect.height < MIN_VISIBLE_RATIO) return;

    visible.push(slot);
  });

  return visible;
}

export function getCardLightningTarget(card: HTMLElement): LightningTarget {
  const rect = card.getBoundingClientRect();
  const height = Math.min(Math.max(rect.height * 0.62, 130), 220);

  return {
    left: rect.left + rect.width * 0.5,
    top: rect.top - height * 0.12,
    height,
  };
}

export function pickVisibleSlot(slots: number[], seed: number) {
  if (slots.length === 0) return null;
  const sorted = [...slots].sort((a, b) => a - b);
  const index = ((seed * 7919 + 104729) >>> 0) % sorted.length;
  return sorted[index]!;
}

export function swapCardAt(ids: string[], slotIndex: number, seed: number) {
  const next = [...ids];
  const otherSlots = ids.map((_, i) => i).filter((i) => i !== slotIndex);
  if (otherSlots.length === 0) return ids;

  const swapSlot = otherSlots[seed % otherSlots.length]!;
  [next[slotIndex], next[swapSlot]] = [next[swapSlot]!, next[slotIndex]!];
  return next;
}

export function useCrazyLightning() {
  const uid = useId();
  const [mounted, setMounted] = useState(false);
  const [strikes, setStrikes] = useState<LightningStrike[]>([]);

  useEffect(() => setMounted(true), []);

  const strikeAt = useCallback(
    (target: LightningTarget) => {
      const stamp = Date.now();
      const bolt: LightningStrike = {
        id: `${uid}-${stamp}`,
        ...target,
      };

      setStrikes((prev) => [...prev, bolt]);

      window.setTimeout(() => {
        setStrikes((prev) => prev.filter((b) => b.id !== bolt.id));
      }, BOLT_MS + 120);
    },
    [uid],
  );

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

  return { strikeAt, portal };
}
