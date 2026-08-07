/** Easter-egg bouncing balls — imperative, no React/store coupling. */

const GRAVITY = 1650;
const RESTITUTION = 0.78;
const AIR_DRAG = 0.995;
const BALL_RADIUS = 9;
const MAX_BALLS = 24;
const MAX_LIFE_MS = 12000;

type BounceBall = {
  el: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
};

let balls: BounceBall[] = [];
let rafId = 0;
let hostEl: HTMLElement | null = null;

function getHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById("kart-fx-root") ?? document.body;
}

function getNavKillTop(): number {
  const nav = document.querySelector(".bottom-nav") as HTMLElement | null;
  if (!nav) return window.innerHeight - 72;
  return nav.getBoundingClientRect().top;
}

function removeBall(ball: BounceBall) {
  ball.el.remove();
  balls = balls.filter((b) => b !== ball);
}

function stopLoopIfEmpty() {
  if (balls.length === 0 && rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
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
      removeBall(ball);
      continue;
    }

    ball.vy += GRAVITY * dt;
    ball.vx *= AIR_DRAG;
    ball.vy *= AIR_DRAG;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x < r) {
      ball.x = r;
      ball.vx = Math.abs(ball.vx) * RESTITUTION;
    } else if (ball.x > vw - r) {
      ball.x = vw - r;
      ball.vx = -Math.abs(ball.vx) * RESTITUTION;
    }

    if (ball.y < r) {
      ball.y = r;
      ball.vy = Math.abs(ball.vy) * RESTITUTION;
    }

    // Kill when the ball reaches the bottom nav band.
    if (ball.y + r >= killTop) {
      ball.el.style.opacity = "0";
      removeBall(ball);
      continue;
    }

    // Soft floor near viewport bottom if nav is missing / offscreen.
    if (ball.y > vh + r * 2) {
      removeBall(ball);
      continue;
    }

    ball.el.style.left = `${ball.x}px`;
    ball.el.style.top = `${ball.y}px`;
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

/** Launch `count` mint balls from the kart icon; they bounce until they hit the nav. */
export function launchKartBounceBalls(count: number, origin?: DOMRect | null) {
  if (typeof window === "undefined" || count <= 0) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  hostEl = getHost();
  if (!hostEl) return;

  const kart =
    origin ??
    (document.querySelector(".bottom-nav a[href='/kart']") as HTMLElement | null)
      ?.getBoundingClientRect() ??
    null;

  const startX = kart ? kart.left + kart.width / 2 : window.innerWidth / 2;
  const startY = kart ? kart.top + kart.height * 0.35 : window.innerHeight * 0.85;

  const n = Math.min(MAX_BALLS, Math.floor(count));
  for (let i = 0; i < n; i += 1) {
    const el = document.createElement("span");
    el.className = "kart-bounce-ball";
    el.setAttribute("aria-hidden", "true");
    hostEl.appendChild(el);

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.35;
    const speed = 520 + Math.random() * 420;
    const ball: BounceBall = {
      el,
      x: startX + (Math.random() - 0.5) * 18,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      born: performance.now(),
    };

    el.style.left = `${ball.x}px`;
    el.style.top = `${ball.y}px`;
    el.style.opacity = "1";
    el.style.visibility = "visible";

    balls.push(ball);
  }

  ensureLoop();
}

export function isKartBounceBallsActive() {
  return balls.length > 0;
}
