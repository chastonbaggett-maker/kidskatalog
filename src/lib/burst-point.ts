export type BurstPoint = { x: number; y: number };

export function resolveBurstPoint(
  origin: BurstPoint | DOMRect | null | undefined,
): BurstPoint | null {
  if (!origin) return null;
  if ("width" in origin) {
    return {
      x: origin.left + origin.width / 2,
      y: origin.top + origin.height / 2,
    };
  }
  return origin;
}
