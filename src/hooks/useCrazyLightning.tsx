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

export type LightningTarget = {
  originX: number;
  originY: number;
  endX: number;
  endY: number;
};

type LightningStrike = LightningTarget & {
  id: string;
};

type Point = { x: number; y: number };

const BOLT_MS = 1050;

/** Minimum share of the card surface visible inside the strike viewport. */
const MIN_VISIBLE_RATIO = 0.4;

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

function visibleSurfaceRatio(surfaceRect: DOMRect, viewport: DOMRect) {
  const overlap = intersectionRect(surfaceRect, viewport);
  const surfaceArea = surfaceRect.width * surfaceRect.height;
  if (surfaceArea <= 0) return 0;
  return (overlap.width * overlap.height) / surfaceArea;
}

function clampPointToViewport(point: Point, viewport: DOMRect): Point {
  return {
    x: Math.max(viewport.left, Math.min(point.x, viewport.right)),
    y: Math.max(viewport.top, Math.min(point.y, viewport.bottom)),
  };
}

function closestPointOnRect(rect: DOMRect, point: Point): Point {
  return {
    x: Math.max(rect.left, Math.min(point.x, rect.right)),
    y: Math.max(rect.top, Math.min(point.y, rect.bottom)),
  };
}

function closestCornerInViewport(
  rect: DOMRect,
  origin: Point,
  viewport: DOMRect,
): Point | null {
  const corners: Point[] = [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.left, y: rect.bottom },
    { x: rect.right, y: rect.bottom },
  ];

  const inViewport = corners.filter(
    (corner) =>
      corner.x >= viewport.left &&
      corner.x <= viewport.right &&
      corner.y >= viewport.top &&
      corner.y <= viewport.bottom,
  );

  const candidates = inViewport.length > 0 ? inViewport : [closestPointOnRect(rect, origin)];

  let closest = candidates[0]!;
  let minDist = Infinity;

  for (const corner of candidates) {
    const clamped = clampPointToViewport(corner, viewport);
    const dist = (clamped.x - origin.x) ** 2 + (clamped.y - origin.y) ** 2;
    if (dist < minDist) {
      minDist = dist;
      closest = clamped;
    }
  }

  return closest;
}

export function pickVisibleCrazyButton(
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

export type StrikeCandidate = {
  slotIndex: number;
  card: HTMLElement;
  surfaceRect: DOMRect;
};

export function getStrikeCandidates(
  scroller: HTMLElement,
  viewport: DOMRect,
): StrikeCandidate[] {
  const candidates: StrikeCandidate[] = [];

  scroller.querySelectorAll<HTMLElement>("[data-feed-slot]").forEach((card) => {
    const slot = Number(card.dataset.feedSlot);
    if (Number.isNaN(slot)) return;

    const surfaceRect = getCardSurfaceRect(card);
    if (surfaceRect.width <= 0 || surfaceRect.height <= 0) return;
    if (visibleSurfaceRatio(surfaceRect, viewport) < MIN_VISIBLE_RATIO) return;

    candidates.push({ slotIndex: slot, card, surfaceRect });
  });

  return candidates;
}

export function getLightningStrikeTarget(
  button: HTMLElement,
  surfaceRect: DOMRect,
  viewport: DOMRect,
): LightningTarget | null {
  const btnRect = button.getBoundingClientRect();
  const originX = btnRect.left + btnRect.width / 2;
  const originY = btnRect.top + btnRect.height * 0.58;

  if (
    originX < viewport.left ||
    originX > viewport.right ||
    originY < viewport.top ||
    originY > viewport.bottom
  ) {
    return null;
  }

  const end = closestCornerInViewport(surfaceRect, { x: originX, y: originY }, viewport);
  if (!end) return null;

  const length = Math.hypot(end.x - originX, end.y - originY);
  if (length < 32) return null;

  return { originX, originY, endX: end.x, endY: end.y };
}

export function planLightningStrike(
  scroller: HTMLElement,
  filterRef: RefObject<HTMLButtonElement | null>,
  shelfRef: RefObject<HTMLButtonElement | null>,
  seed: number,
): { target: LightningTarget; slotIndex: number } | null {
  const viewport = getStrikeViewport(scroller);
  if (viewport.width <= 0 || viewport.height <= 0) return null;

  const button = pickVisibleCrazyButton(filterRef, shelfRef, viewport);
  if (!button) return null;

  const candidates = getStrikeCandidates(scroller, viewport);
  if (candidates.length === 0) return null;

  const index = ((seed * 7919 + 104729) >>> 0) % candidates.length;
  const picked = candidates[index]!;
  const target = getLightningStrikeTarget(
    button,
    picked.surfaceRect,
    viewport,
  );

  if (!target) return null;

  return { target, slotIndex: picked.slotIndex };
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
