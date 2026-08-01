"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { CRAZY_SCREEN_FLASH_MS } from "@/lib/crazy-mode-timing";

type ScreenFlash = {
  id: string;
  flashX: number;
  flashY: number;
};

const FLASH_MS = CRAZY_SCREEN_FLASH_MS;

/** Minimum visible overlap before a card counts as on-screen. */
const MIN_VISIBLE_PX = 8;

function isElementVisible(el: HTMLElement, viewport: DOMRect) {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (!rectsIntersect(rect, viewport)) return false;
  return (
    rect.bottom > viewport.top &&
    rect.top < viewport.bottom &&
    rect.right > viewport.left &&
    rect.left < viewport.right
  );
}

function rectsIntersect(a: DOMRect, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function intersectionRect(a: DOMRect, b: DOMRect): DOMRect {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  return {
    x: left,
    y: top,
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
    toJSON: () => ({}),
  };
}

/** Full window — used for header/shelf controls outside the scroller. */
function getWindowViewport(): DOMRect {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
    width: window.innerWidth,
    height: window.innerHeight,
    toJSON: () => ({}),
  };
}

/** Visible feed area — scroller pane clipped to the window. */
export function getStrikeViewport(scroller: HTMLElement): DOMRect {
  const scrollerRect = scroller.getBoundingClientRect();
  return intersectionRect(scrollerRect, {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
    width: window.innerWidth,
    height: window.innerHeight,
    toJSON: () => ({}),
  });
}

function getCardSurfaceRect(card: HTMLElement): DOMRect {
  const surface = card.querySelector<HTMLElement>(":scope > div:first-child");
  return (surface ?? card).getBoundingClientRect();
}

function isCardVisibleInViewport(surfaceRect: DOMRect, viewport: DOMRect) {
  if (!rectsIntersect(surfaceRect, viewport)) return false;
  const overlap = intersectionRect(surfaceRect, viewport);
  return overlap.width >= MIN_VISIBLE_PX && overlap.height >= MIN_VISIBLE_PX;
}

function pickVisibleCrazyButton(
  filterRef: RefObject<HTMLButtonElement | null>,
  shelfRef: RefObject<HTMLButtonElement | null>,
  viewport: DOMRect,
) {
  if (filterRef.current && isElementVisible(filterRef.current, viewport)) {
    return filterRef.current;
  }
  if (shelfRef.current && isElementVisible(shelfRef.current, viewport)) {
    return shelfRef.current;
  }
  return null;
}

function getStrikeCandidates(scroller: HTMLElement, viewport: DOMRect) {
  const seen = new Set<number>();
  const candidates: { slotIndex: number }[] = [];

  scroller.querySelectorAll<HTMLElement>("[data-feed-slot]").forEach((card) => {
    const slot = Number(card.dataset.feedSlot);
    if (Number.isNaN(slot) || seen.has(slot)) return;

    const surfaceRect = getCardSurfaceRect(card);
    if (surfaceRect.width <= 0 || surfaceRect.height <= 0) return;
    if (!isCardVisibleInViewport(surfaceRect, viewport)) return;

    seen.add(slot);
    candidates.push({ slotIndex: slot });
  });

  return candidates;
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandomHalf(slots: number[], seed: number): number[] {
  if (slots.length === 0) return [];
  const pickCount = Math.max(1, Math.floor(slots.length / 2));
  return shuffleWithSeed(slots, seed).slice(0, pickCount);
}

export function planCrazyFlash(
  scroller: HTMLElement,
  filterRef: RefObject<HTMLButtonElement | null>,
  shelfRef: RefObject<HTMLButtonElement | null>,
  seed: number,
): {
  slotIndices: number[];
  visibleSlots: number[];
  flashX: number;
  flashY: number;
} | null {
  const viewport = getStrikeViewport(scroller);
  if (viewport.width <= 0 || viewport.height <= 0) return null;

  const button = pickVisibleCrazyButton(filterRef, shelfRef, getWindowViewport());
  if (!button) return null;

  const candidates = getStrikeCandidates(scroller, viewport);
  if (candidates.length === 0) return null;

  const visibleSlots = candidates.map((c) => c.slotIndex);
  const slotIndices = pickRandomHalf(visibleSlots, seed);
  const btnRect = button.getBoundingClientRect();

  return {
    slotIndices,
    visibleSlots,
    flashX: btnRect.left + btnRect.width / 2,
    flashY: btnRect.top + btnRect.height / 2,
  };
}

export function swapCardsAt(
  ids: string[],
  slotIndices: number[],
  visibleSlots: number[],
  seed: number,
) {
  const next = [...ids];
  let s = seed;

  for (const slotIndex of slotIndices) {
    const otherSlots = visibleSlots.filter((i) => i !== slotIndex);
    if (otherSlots.length === 0) continue;

    s = (s * 1664525 + 1013904223) >>> 0;
    const swapSlot = otherSlots[s % otherSlots.length]!;
    [next[slotIndex], next[swapSlot]] = [next[swapSlot]!, next[slotIndex]!];
  }

  return next;
}

export function useCrazyLightning() {
  const uid = useId();
  const [mounted, setMounted] = useState(false);
  const [flashes, setFlashes] = useState<ScreenFlash[]>([]);

  useEffect(() => setMounted(true), []);

  const flash = useCallback(
    (flashX: number, flashY: number) => {
      const stamp = Date.now();
      const entry: ScreenFlash = {
        id: `${uid}-${stamp}`,
        flashX,
        flashY,
      };

      setFlashes((prev) => [...prev, entry]);

      window.setTimeout(() => {
        setFlashes((prev) => prev.filter((f) => f.id !== entry.id));
      }, FLASH_MS + 80);
    },
    [uid],
  );

  const portal =
    mounted && flashes.length > 0
      ? createPortal(
          <div className="crazy-flash-layer" aria-hidden>
            {flashes.map((entry) => (
              <div
                key={entry.id}
                className="crazy-screen-flash"
                style={{
                  ["--flash-x" as string]: `${entry.flashX}px`,
                  ["--flash-y" as string]: `${entry.flashY}px`,
                }}
              />
            ))}
          </div>,
          document.body,
        )
      : null;

  return { flash, portal };
}
