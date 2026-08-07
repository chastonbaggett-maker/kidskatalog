/** Easter-egg lofted balls — rise under gravity, burst gold confetti at apex. */

import { fireGoldConfettiAt } from "@/lib/kart-confetti";

const GRAVITY = 1700;
const AIR_DRAG = 0.998;
const BALL_RADIUS = 9;
const MAX_BALLS = 24;
const MAX_LIFE_MS = 4000;
const ARM_CLEARANCE_PX = 12;

type LoftBall = {
  el: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  rose: boolean;
};

let balls: LoftBall[] = [];
let rafId = 0;

function getHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.body;
}

function getNavKillTop(): number {
  const nav = document.querySelector(".bottom-nav") as HTMLElement | null;
  if (!nav) return window.innerHeight - 72;
  return nav.getBoundingClientRect().top;
}

function removeBall(ball: LoftBall) {
  ball.el.remove();
  balls = balls.filter((b) => b !== ball);
}

function burstBall(ball: LoftBall) {
  fireGoldConfettiAt(ball.x, ball.y);
  removeBall(ball);
}

export function cancelKartBounceBalls() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  for (const ball of balls) ball.el.remove();
  balls = [];
}

function tick(now: number) {
  const last = (tick as unknown as { _last?: number })._last ?? now;
  (tick as unknown as { _last?: number })._last = now;
  const dt = Math.min(0.032, (now - last) / 1000);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const killTop = getNavKillTop();
  const r = BALL_RADIUS;

  for (const ball of [...balls]) {
    if (now - ball.born > MAX_LIFE_MS) {
      burstBall(ball);
      continue;
    }

    const prevVy = ball.vy;
    ball.vy += GRAVITY * dt;
    ball.vx *= AIR_DRAG;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Soft side bounce so they stay on screen while rising.
    if (ball.x < r) {
      ball.x = r;
      ball.vx = Math.abs(ball.vx) * 0.7;
    } else if (ball.x > vw - r) {
      ball.x = vw - r;
      ball.vx = -Math.abs(ball.vx) * 0.7;
    }

    // Ceiling: treat as apex and burst.
    if (ball.y < r) {
      ball.y = r;
      burstBall(ball);
      continue;
    }

    if (ball.y + r < killTop - ARM_CLEARANCE_PX) {
      ball.rose = true;
    }

    // Apex: was rising, now starting to fall.
    if (ball.rose && prevVy < 0 && ball.vy >= 0) {
      burstBall(ball);
      continue;
    }

    // Fell back into nav without peaking (shouldn't happen often).
    if (ball.rose && ball.vy > 0 && ball.y + r >= killTop) {
      burstBall(ball);
      continue;
    }

    if (ball.y > vh + r * 2) {
      removeBall(ball);
      continue;
    }

    ball.el.style.transform = `translate(${ball.x}px, ${ball.y}px) translate(-50%, -50%)`;
  }

  if (balls.length > 0) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = 0;
    (tick as unknown as { _last?: number })._last = undefined;
  }
}

function ensureLoop() {
  if (!rafId) {
    (tick as unknown as { _last?: number })._last = undefined;
    rafId = requestAnimationFrame(tick);
  }
}

/** Launch `count` mint balls upward; each bursts into gold confetti at its apex. */
export function launchKartBounceBalls(count: number, origin?: DOMRect | null) {
  if (typeof window === "undefined" || count <= 0) return;

  const host = getHost();
  if (!host) return;

  const kart =
    origin ??
    (document.querySelector(".bottom-nav a[href='/kart']") as HTMLElement | null)
      ?.getBoundingClientRect() ??
    null;

  const killTop = getNavKillTop();
  const startX = kart ? kart.left + kart.width / 2 : window.innerWidth / 2;
  const rawStartY = kart ? kart.top + kart.height * 0.15 : killTop - 40;
  const startY = Math.min(rawStartY, killTop - 36);

  const n = Math.min(MAX_BALLS, Math.floor(count));
  for (let i = 0; i < n; i += 1) {
    const el = document.createElement("span");
    el.className = "kart-bounce-ball";
    el.setAttribute("aria-hidden", "true");
    host.appendChild(el);

    // Strong loft, mostly upward with a little spray.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.55;
    const speed = 980 + Math.random() * 420;
    const x = startX + (Math.random() - 0.5) * 16;
    const y = startY;
    const ball: LoftBall = {
      el,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      born: performance.now(),
      rose: false,
    };

    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    el.style.opacity = "1";
    el.style.visibility = "visible";

    balls.push(ball);
  }

  ensureLoop();
}

export function isKartBounceBallsActive() {
  return balls.length > 0;
}
