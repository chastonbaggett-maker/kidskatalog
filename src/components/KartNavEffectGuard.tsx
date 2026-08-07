"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cancelKartFlyBall } from "@/lib/kart-fly-ball";

/** Cancel decorative fly-ball when navigating away. */
export function KartNavEffectGuard() {
  const pathname = usePathname();

  useEffect(() => {
    cancelKartFlyBall();
  }, [pathname]);

  return null;
}
