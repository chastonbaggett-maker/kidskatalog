"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useKartStore } from "@/lib/kart-store";

/** Clear decorative fly-ball when navigating away. */
export function KartNavEffectGuard() {
  const pathname = usePathname();
  const clearFlyBall = useKartStore((s) => s.clearFlyBall);

  useEffect(() => {
    clearFlyBall();
  }, [pathname, clearFlyBall]);

  return null;
}
