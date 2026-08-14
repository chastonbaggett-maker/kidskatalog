"use client";

/** Kept as a no-op guard API for feed/crazy code paths. */
export const KART_EFFECT_QUIET_MS = 900;
export const KART_EFFECT_ARM_MS = 1800;
export const KART_NAV_PULSE_MS = 560;

/** Kart add no longer arms global effect locks — always allow feed work. */
export function isKartEffectBlocked() {
  return false;
}
