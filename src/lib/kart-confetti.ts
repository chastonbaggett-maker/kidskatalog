import { playConfettiBurstSound } from "@/lib/burst-sound";

const GOLD_CONFETTI = [
  "#ffd700",
  "#ffb800",
  "#ffe566",
  "#f5c842",
  "#fff4c2",
  "#e6a800",
  "#ffdf00",
  "#ffffff",
];

const BIT_COUNT = 36;
const CLEAR_MS = 1100;

/** Imperative gold confetti burst at a screen point (no React). */
export function fireGoldConfettiAt(x: number, y: number) {
  if (typeof document === "undefined") return;

  playConfettiBurstSound();

  const host =
    document.getElementById("kart-fx-root") ?? document.body;
  const root = document.createElement("div");
  root.className = "add-kart-confetti";
  root.setAttribute("aria-hidden", "true");
  host.appendChild(root);

  for (let i = 0; i < BIT_COUNT; i += 1) {
    const angle = (Math.PI * 2 * i) / BIT_COUNT + (Math.random() - 0.5) * 0.55;
    const speed = 90 + Math.random() * 160;
    const upwardBias = -40 - Math.random() * 80;
    const bit = document.createElement("span");
    bit.className = "add-kart-confetti__bit";
    bit.style.left = `${x}px`;
    bit.style.top = `${y}px`;
    bit.style.width = `${6 + Math.random() * 6}px`;
    bit.style.height = `${8 + Math.random() * 10}px`;
    bit.style.background = GOLD_CONFETTI[i % GOLD_CONFETTI.length]!;
    bit.style.animationDelay = `${Math.random() * 40}ms`;
    bit.style.setProperty("--dx", `${Math.cos(angle) * speed}px`);
    bit.style.setProperty(
      "--dy",
      `${Math.sin(angle) * speed * 0.85 + upwardBias}px`,
    );
    bit.style.setProperty(
      "--rot",
      `${(Math.random() > 0.5 ? 1 : -1) * (220 + Math.random() * 520)}deg`,
    );
    root.appendChild(bit);
  }

  window.setTimeout(() => {
    root.remove();
  }, CLEAR_MS);
}
