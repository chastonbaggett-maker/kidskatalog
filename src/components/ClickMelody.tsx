"use client";

import { useEffect, useId, useRef, useState } from "react";
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

/** Radial RG displacement map — bends sampled backdrop toward a lens ring. */
function buildLensDisplacementMap(size = 192): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const img = ctx.createImageData(size, size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const maxR = size * 0.5;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const r = dist / maxR;
      const i = (y * size + x) * 4;

      let rx = 128;
      let gy = 128;

      if (r > 0.12 && r < 1) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        // Strongest bend on a ring around the button (photon sphere).
        const ring = Math.exp(-(((r - 0.55) / 0.2) ** 2));
        const inner = Math.exp(-(((r - 0.32) / 0.16) ** 2)) * 0.45;
        const strength = (ring + inner) * 70;
        const swirl = ring * 0.4;
        rx = Math.max(
          0,
          Math.min(255, 128 - nx * strength + -ny * strength * swirl),
        );
        gy = Math.max(
          0,
          Math.min(255, 128 - ny * strength + nx * strength * swirl),
        );
      }

      img.data[i] = rx;
      img.data[i + 1] = gy;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Every button/link tap plays a melody note and stamps it into a soft
 * decaying loop. Mute stops new notes and silences the loop.
 */
export function ClickMelody() {
  const enabled = useClickMelodyStore((s) => s.enabled);
  const setEnabled = useClickMelodyStore((s) => s.setEnabled);
  const engineRef = useRef<ClickMelodyEngine | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lensMap, setLensMap] = useState<string>("");
  const reactId = useId().replace(/:/g, "");
  const filterId = `melody-lens-${reactId}`;

  useEffect(() => {
    setMounted(true);
    setLensMap(buildLensDisplacementMap(224));

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

  const playing = mounted ? enabled : true;
  const label = playing ? "Mute tap music" : "Play tap music";

  return (
    <div
      className={`site-music-toggle-wrap${playing ? " is-singing" : " is-muted"}`}
      data-click-melody-toggle
    >
      {/* Sample backdrop, then displace it — no tint overlays */}
      <span
        className="site-music-toggle__warp"
        aria-hidden
        style={
          lensMap
            ? ({ filter: `url(#${filterId})` } as React.CSSProperties)
            : undefined
        }
      >
        <span className="site-music-toggle__warp-sample" />
        <span className="site-music-toggle__warp-sample site-music-toggle__warp-sample--mag" />
      </span>

      {lensMap ? (
        <svg className="site-music-toggle__svgdefs" aria-hidden width="0" height="0">
          <defs>
            <filter
              id={filterId}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={lensMap}
                result="map"
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale="58"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      ) : null}

      <button
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
  );
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
