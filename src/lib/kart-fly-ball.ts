import { getKartNavRect } from "@/lib/kart-nav-target";
import { resolveBurstPoint, type BurstPoint } from "@/lib/burst-point";

/** Screen-space gravity (px/s²). */
const GRAVITY = 1050;
const POP_MS = 110;
const APEX_LIFT_PX = 76;

let ballEl: HTMLSpanElement | null = null;
let rafId = 0;
let finishTimer: number | undefined;

export function registerKartFlyBallEl(el: HTMLSpanElement | null) {
  ballEl = el;
  if (el) {
    el.style.opacity = "0";
    el.style.visibility = "hidden";
  }
}

export function cancelKartFlyBall() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  if (finishTimer !== undefined) {
    window.clearTimeout(finishTimer);
    finishTimer = undefined;
  }
  if (ballEl) {
    ballEl.style.opacity = "0";
    ballEl.style.visibility = "hidden";
  }
}

function computeFlight(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  const vy0 = -Math.sqrt(2 * GRAVITY * APEX_LIFT_PX);
  const c = fromY - toY;
  const discriminant = vy0 * vy0 - 2 * GRAVITY * c;
  if (discriminant <= 0) return null;

  const duration = (-vy0 + Math.sqrt(discriminant)) / GRAVITY;
  const vx = (toX - fromX) / duration;
  return { fromX, fromY, vx, vy: vy0, toX, toY, duration };
}

/** Pure visual toss — no React/store updates. */
export function fireKartFlyBall(
  origin: BurstPoint | DOMRect | null | undefined,
): boolean {
  const el = ballEl;
  const point = resolveBurstPoint(origin);
  const toRect = getKartNavRect();
  if (!el || !point || !toRect) return false;

  const path = computeFlight(
    point.x,
    point.y,
    toRect.left + toRect.width / 2,
    toRect.top + toRect.height * 0.36,
  );
  if (!path) return false;

  cancelKartFlyBall();

  const { fromX, fromY, vx, vy, toX, toY, duration } = path;
  const durationMs = duration * 1000;

  el.style.left = `${fromX}px`;
  el.style.top = `${fromY}px`;
  el.style.transform = "translate(-50%, -50%) scale(0.65)";
  el.style.visibility = "visible";
  el.style.opacity = "1";

  const start = performance.now();

  const tick = (now: number) => {
    const elapsedMs = now - start;
    const elapsed = elapsedMs / 1000;

    if (elapsedMs >= durationMs) {
      el.style.left = `${toX}px`;
      el.style.top = `${toY}px`;
      el.style.transform = "translate(-50%, -50%) scale(0.7)";
      el.style.opacity = "0";
      finishTimer = window.setTimeout(() => {
        el.style.visibility = "hidden";
        finishTimer = undefined;
      }, 90);
      rafId = 0;
      return;
    }

    const x = fromX + vx * elapsed;
    const y = fromY + vy * elapsed + 0.5 * GRAVITY * elapsed * elapsed;
    const vyNow = vy + GRAVITY * elapsed;
    const tilt = Math.max(-62, Math.min(62, (vyNow / 380) * 32));
    const popT = Math.min(elapsedMs / POP_MS, 1);
    const popBoost = popT < 1 ? Math.sin(popT * Math.PI) * 0.14 : 0;
    const fallT = elapsedMs / durationMs;
    const scale = 0.82 + popBoost - fallT * 0.14;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${tilt}deg)`;
    el.style.opacity =
      elapsedMs > durationMs - 50 ? `${(durationMs - elapsedMs) / 50}` : "1";

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return true;
}
