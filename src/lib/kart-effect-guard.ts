"use client";

import { useKartStore } from "@/lib/kart-store";

/** Block feed/crazy mutations briefly after kart add completes. */
export const KART_EFFECT_QUIET_MS = 900;

/** Cover fly-ball + nav pulse from the moment add starts (beginKartAdd). */
export const KART_EFFECT_ARM_MS = 1800;

/** Kart tab bounce — keep guards up through the full pulse. */
export const KART_NAV_PULSE_MS = 560;

export function isKartEffectBlocked(
  state = useKartStore.getState(),
  now = Date.now(),
) {
  if (state.flyBall != null || state.kartAddActive > 0) return true;
  if (state.kartQuietUntil > now) return true;
  return false;
}
