"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useKartStore } from "@/lib/kart-store";

/** Cancel pending kart nav pulses when route changes (e.g. opening a toy from a card). */
export function KartNavEffectGuard() {
  const pathname = usePathname();
  const bumpKartEffectGeneration = useKartStore(
    (s) => s.bumpKartEffectGeneration,
  );

  useEffect(() => {
    bumpKartEffectGeneration();
  }, [pathname, bumpKartEffectGeneration]);

  return null;
}
