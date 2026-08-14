"use client";

import { useCallback } from "react";
import { fireKartFlyBall } from "@/lib/kart-fly-ball";
import type { BurstPoint } from "@/lib/burst-point";

/** Decorative toss toward the kart tab — no React/store side effects. */
export function useKartFlyBallTrigger() {
  const fire = useCallback(
    (origin: BurstPoint | DOMRect | null | undefined): boolean =>
      fireKartFlyBall(origin),
    [],
  );

  return { fire };
}
