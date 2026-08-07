"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cancelKartFlyBall } from "@/lib/kart-fly-ball";
import { cancelKartBounceBalls } from "@/lib/kart-bounce-balls";

/** Cancel decorative kart balls when navigating away. */
export function KartNavEffectGuard() {
  const pathname = usePathname();

  useEffect(() => {
    cancelKartFlyBall();
    cancelKartBounceBalls();
  }, [pathname]);

  return null;
}
