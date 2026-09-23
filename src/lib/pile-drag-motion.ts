/** Pile pan follows the finger with a short ease-in, then coasts to a stop. */

export const DRAG_EASE_IN_MS = 180;
export const DRAG_TAU_START_MS = 96;
export const DRAG_TAU_TRACK_MS = 28;
export const RELEASE_EASE_MIN_MS = 280;
export const RELEASE_EASE_MAX_MS = 480;
export const RELEASE_FLING_TAU_MS = 150;
export const RELEASE_MAX_FLING_PX = 220;
/** Below this, a release with no leftover lag just stops. */
export const RELEASE_MIN_SPEED = 0.04;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Smoothstep — slow at both ends so follow stiffness eases in. */
export function smoothstep(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Position ease-out used when the finger lifts. */
export function easeOutCubic(t: number) {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

/** Time constant for the finger follow. Larger = softer start. */
export function dragFollowTau(elapsedMs: number) {
  const ramp = smoothstep(elapsedMs / DRAG_EASE_IN_MS);
  return DRAG_TAU_START_MS + (DRAG_TAU_TRACK_MS - DRAG_TAU_START_MS) * ramp;
}

/** Move `current` part of the way to `target` for this frame. */
export function smoothToward(
  current: number,
  target: number,
  dtMs: number,
  tauMs: number,
) {
  const dt = Math.max(0, Math.min(34, dtMs));
  const tau = Math.max(8, tauMs);
  const alpha = 1 - Math.exp(-dt / tau);
  return current + (target - current) * alpha;
}

export function releaseDestination(
  x: number,
  y: number,
  residualX: number,
  residualY: number,
  vx: number,
  vy: number,
) {
  const speed = Math.hypot(vx, vy);
  const residual = Math.hypot(residualX, residualY);
  if (speed < RELEASE_MIN_SPEED && residual < 0.5) {
    return { x, y, duration: 0 };
  }

  let fling = speed * RELEASE_FLING_TAU_MS;
  if (fling > RELEASE_MAX_FLING_PX) fling = RELEASE_MAX_FLING_PX;
  const nx = speed > 0 ? vx / speed : 0;
  const ny = speed > 0 ? vy / speed : 0;
  const toX = x + residualX + nx * fling;
  const toY = y + residualY + ny * fling;
  const distance = Math.hypot(toX - x, toY - y);
  const duration = Math.min(
    RELEASE_EASE_MAX_MS,
    Math.max(RELEASE_EASE_MIN_MS, 240 + distance * 0.55),
  );
  return { x: toX, y: toY, duration };
}
