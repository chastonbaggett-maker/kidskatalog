import type { PileAnchor, PileAnchorRect } from "@/lib/toy-pile-store";

function intersectionArea(a: DOMRect, b: DOMRect) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

export function snapshotRect(rect: DOMRect): PileAnchorRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function findMostVisibleFeedCard(
  scroller: HTMLElement,
): PileAnchor | null {
  const viewportRect = scroller.getBoundingClientRect();
  const cards = scroller.querySelectorAll(".feed-card[data-feed-slot]");
  let bestEl: Element | null = null;
  let bestArea = 0;

  for (const card of cards) {
    const area = intersectionArea(card.getBoundingClientRect(), viewportRect);
    if (area <= 0) continue;
    if (area > bestArea) {
      bestArea = area;
      bestEl = card;
    }
  }

  if (!bestEl) return null;

  const slotIndex = Number(bestEl.getAttribute("data-feed-slot") ?? "-1");
  const toyId = bestEl.getAttribute("data-toy-id") ?? "";
  if (slotIndex < 0 || !toyId) return null;

  return {
    slotIndex,
    toyId,
    rect: snapshotRect(bestEl.getBoundingClientRect()),
  };
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
