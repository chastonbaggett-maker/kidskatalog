"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useKartStore } from "@/lib/kart-store";

/** Cancel in-flight kart effects when route changes (e.g. opening a toy from a card). */
export function KartNavEffectGuard() {
  const pathname = usePathname();
  const bumpKartEffectGeneration = useKartStore(
    (s) => s.bumpKartEffectGeneration,
  );
  const cancelKartAddEffects = useKartStore((s) => s.cancelKartAddEffects);

  useEffect(() => {
    cancelKartAddEffects();
    bumpKartEffectGeneration();
  }, [pathname, bumpKartEffectGeneration, cancelKartAddEffects]);

  return null;
}
