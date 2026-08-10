"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClickMelodyEngine } from "@/lib/click-melody-engine";
import { useClickMelodyStore } from "@/lib/click-melody-store";

function isMusicalTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-click-melody-toggle]")) return false;
  return Boolean(
    target.closest(
      'button, a, [role="button"], input[type="button"], input[type="submit"], summary, label',
    ),
  );
}

/** Compact RG displacement patch — bends pixels toward a photon-ring. */
function buildGravLensPatch(size: number): string {
  const s = Math.max(32, Math.round(size));
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const img = ctx.createImageData(s, s);
  const data = img.data;
  const cx = (s - 1) / 2;
  const cy = (s - 1) / 2;
  const maxR = s * 0.5;

  for (let y = 0; y < s; y += 1) {
    for (let x = 0; x < s; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const r = dist / maxR;
      const i = (y * s + x) * 4;

      let rx = 128;
      let gy = 128;

      if (r < 1 && r > 0.05) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        const ring = Math.exp(-(((r - 0.6) / 0.15) ** 2));
        const well = Math.exp(-(((r - 0.25) / 0.18) ** 2)) * 0.6;
        const strength = (ring * 1.2 + well) * 95;
        const swirl = ring * 0.55;
        rx = Math.max(
          0,
          Math.min(255, 128 - nx * strength + -ny * strength * swirl),
        );
        gy = Math.max(
          0,
          Math.min(255, 128 - ny * strength + nx * strength * swirl),
        );
      }

      data[i] = rx;
      data[i + 1] = gy;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

type LensState = {
  map: string;
  x: number;
  y: number;
  size: number;
};

/**
 * Tap-melody mute control + gravitational lens that bends real app pixels
 * around the button (no color overlays).
 */
export function ClickMelody() {
  const enabled = useClickMelodyStore((s) => s.enabled);
  const setEnabled = useClickMelodyStore((s) => s.setEnabled);
  const engineRef = useRef<ClickMelodyEngine | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const patchRef = useRef<string>("");
  const [mounted, setMounted] = useState(false);
  const [lens, setLens] = useState<LensState | null>(null);
  const reactId = useId().replace(/:/g, "");
  const filterId = `grav-lens-${reactId}`;

  useEffect(() => {
    setMounted(true);
    patchRef.current = buildGravLensPatch(256);

    const engine = new ClickMelodyEngine();
    engineRef.current = engine;
    engine.setMuted(!useClickMelodyStore.getState().enabled);

    const onUnlock = () => {
      if (!useClickMelodyStore.getState().enabled) return;
      void engine.unlock();
    };

    const onClick = (event: MouseEvent) => {
      if (!useClickMelodyStore.getState().enabled) return;
      if (event.button !== 0) return;
      if (!isMusicalTarget(event.target)) return;
      void engine.note();
    };

    const unsub = useClickMelodyStore.subscribe((state, prev) => {
      if (state.enabled === prev.enabled) return;
      engine.setMuted(!state.enabled);
      if (!state.enabled) engine.clearLoop();
    });

    document.addEventListener("pointerdown", onUnlock, true);
    document.addEventListener("click", onClick, true);

    return () => {
      unsub();
      document.removeEventListener("pointerdown", onUnlock, true);
      document.removeEventListener("click", onClick, true);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let raf = 0;
    let lastKey = "";

    const clearRootFilter = () => {
      const el = document.querySelector<HTMLElement>("[data-grav-lens-root]");
      if (!el) return;
      el.style.removeProperty("filter");
      el.style.removeProperty("-webkit-filter");
    };

    const applyRootFilter = () => {
      const el = document.querySelector<HTMLElement>("[data-grav-lens-root]");
      if (!el) return;
      if (!useClickMelodyStore.getState().enabled) {
        clearRootFilter();
        return;
      }
      el.style.setProperty("filter", `url(#${filterId})`);
      el.style.setProperty("-webkit-filter", `url(#${filterId})`);
    };

    const sync = () => {
      const root = document.querySelector<HTMLElement>("[data-grav-lens-root]");
      const btn = buttonRef.current;
      const map = patchRef.current;
      if (!root || !btn || !map) return;

      if (!useClickMelodyStore.getState().enabled) {
        if (lastKey !== "off") {
          lastKey = "off";
          setLens(null);
          clearRootFilter();
        }
        return;
      }

      const rootRect = root.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const cx = btnRect.left + btnRect.width / 2 - rootRect.left;
      const cy = btnRect.top + btnRect.height / 2 - rootRect.top;
      // Reach up into feed content + across nearby nav chrome.
      const size = Math.round(
        Math.max(220, Math.min(rootRect.width, rootRect.height) * 0.42),
      );
      const x = Math.round(cx - size / 2);
      const y = Math.round(cy - size / 2);
      const key = `${x}:${y}:${size}`;
      if (key === lastKey) {
        applyRootFilter();
        return;
      }
      lastKey = key;
      setLens({ map, x, y, size });
      requestAnimationFrame(applyRootFilter);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };

    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const unsub = useClickMelodyStore.subscribe(schedule);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    const root = document.querySelector("[data-grav-lens-root]");
    if (root && ro) ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      unsub();
      ro?.disconnect();
      clearRootFilter();
    };
  }, [mounted, filterId]);

  const playing = mounted ? enabled : true;
  const label = playing ? "Mute tap music" : "Play tap music";

  const ui = (
    <>
      {lens ? (
        <svg
          className="site-music-toggle__svgdefs"
          aria-hidden
          width={0}
          height={0}
        >
          <defs>
            <filter
              id={filterId}
              x="-8%"
              y="-8%"
              width="116%"
              height="116%"
              filterUnits="userSpaceOnUse"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={lens.map}
                result="map"
                x={lens.x}
                y={lens.y}
                width={lens.size}
                height={lens.size}
                preserveAspectRatio="none"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale={64}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      ) : null}

      <div
        className={`site-music-toggle-wrap${playing ? " is-singing" : " is-muted"}`}
        data-click-melody-toggle
      >
        <button
          ref={buttonRef}
          type="button"
          className="site-music-toggle"
          aria-label={label}
          aria-pressed={playing}
          title={label}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const engine = engineRef.current;
            const next = !useClickMelodyStore.getState().enabled;
            setEnabled(next);
            if (!engine) return;
            engine.setMuted(!next);
            if (!next) engine.clearLoop();
            else void engine.unlock();
          }}
        >
          <span className="site-music-toggle__icon" aria-hidden>
            <MusicIcon muted={!playing} />
          </span>
        </button>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(ui, document.body);
}

function MusicIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M9 18V6.4l10-2.2V16"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={muted ? 0.45 : 1}
      />
      <circle cx="7" cy="18" r="2.4" fill="currentColor" opacity={muted ? 0.45 : 1} />
      <circle cx="17" cy="16" r="2.4" fill="currentColor" opacity={muted ? 0.45 : 1} />
      <path
        d="M4.5 5.5l15 14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={muted ? 1 : 0}
      />
    </svg>
  );
}
