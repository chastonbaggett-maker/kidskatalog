"use client";

import { useEffect, useRef, useState } from "react";
import { unlockSharedAudio } from "@/lib/shared-audio";

const PART1_SRC = "/splash/intro-part-1.mp4";
const PART2_SRC = "/splash/intro-part-2.mp4";
/** First frame of part 1 — shown immediately while the clip buffers. */
const PART1_POSTER = "/splash/intro-part-1-start.jpg";
/** Soft fade after part 2 so the already-warmed page is underneath. */
const FADE_OUT_MS = 420;

type SplashPhase = "part1" | "hold" | "part2" | "out" | "done";

function setSplashState(state: "active" | "holding" | "exiting" | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (state) root.dataset.splash = state;
  else delete root.dataset.splash;
}

async function waitForPageReady() {
  if (typeof document === "undefined") return;
  if (document.readyState !== "complete") {
    await new Promise<void>((resolve) => {
      window.addEventListener("load", () => resolve(), { once: true });
    });
  }
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch {
    /* fonts API unavailable */
  }
  // Two frames after load so the browse shell can paint under the overlay.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
  // Nudge the catalog warm so the feed is ready when we cut.
  try {
    await fetch("/api/catalog?offset=0&limit=8", { credentials: "same-origin" });
  } catch {
    /* offline / slow — still proceed */
  }
}

/** Seek to t=0 and resolve once the first frame is painted / ready. */
function waitForFirstFrame(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("seeked", onReady);
      video.removeEventListener("canplay", onReady);
      resolve();
    };
    const onReady = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) done();
    };

    try {
      video.pause();
      if (video.currentTime !== 0) video.currentTime = 0;
    } catch {
      /* ignore */
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime === 0) {
      done();
      return;
    }

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("seeked", onReady);
    video.addEventListener("canplay", onReady);
    // Fallback so a stalled decode never blocks forever.
    window.setTimeout(done, 1200);
  });
}

/**
 * Cold-open splash: play intro part 1, hold the end frame until tap,
 * play intro part 2, then reveal the already-loaded page underneath.
 */
export function AppSplash() {
  const part1Ref = useRef<HTMLVideoElement>(null);
  const part2Ref = useRef<HTMLVideoElement>(null);
  const phaseRef = useRef<SplashPhase>("part1");
  const [phase, setPhase] = useState<SplashPhase>("part1");
  const [pageReady, setPageReady] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const pageReadyRef = useRef(false);
  const startedPart2Ref = useRef(false);
  const outTimerRef = useRef<number | null>(null);

  const setPhaseSafe = (next: SplashPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  useEffect(() => {
    setSplashState("active");
    let cancelled = false;
    void waitForPageReady().then(() => {
      if (cancelled) return;
      pageReadyRef.current = true;
      setPageReady(true);
    });
    return () => {
      cancelled = true;
      if (outTimerRef.current != null) {
        window.clearTimeout(outTimerRef.current);
        outTimerRef.current = null;
      }
    };
  }, []);

  // Once the page is warm and we're past the opening clip, show the shell
  // under the splash so the cut lands on a loaded screen.
  useEffect(() => {
    if (!pageReady) return;
    if (phase === "hold" || phase === "part2") {
      setSplashState("holding");
    }
  }, [pageReady, phase]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setSplashState(null);
      setPhaseSafe("done");
      return;
    }

    const video = part1Ref.current;
    const part2 = part2Ref.current;
    // Hard-stop part 2 until an explicit tap while holding.
    if (part2) {
      try {
        part2.pause();
        part2.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    if (!video) return;

    let cancelled = false;
    const playPart1 = async () => {
      video.muted = true;
      await waitForFirstFrame(video);
      if (cancelled) return;
      setFrameReady(true);
      try {
        video.currentTime = 0;
        await video.play();
      } catch {
        // Autoplay blocked — stay on first/hold frame so a tap can continue.
        setPhaseSafe("hold");
      }
    };

    void playPart1();
    return () => {
      cancelled = true;
    };
  }, []);

  // If part 2 ever starts without the tap gate, pause it again.
  useEffect(() => {
    const part2 = part2Ref.current;
    if (!part2) return;

    const guard = () => {
      if (startedPart2Ref.current) return;
      if (phaseRef.current === "part2" || phaseRef.current === "out") return;
      try {
        part2.pause();
        part2.currentTime = 0;
      } catch {
        /* ignore */
      }
    };

    part2.addEventListener("play", guard);
    return () => part2.removeEventListener("play", guard);
  }, []);

  const finishSplash = () => {
    setSplashState(null);
    setPhaseSafe("done");
  };

  const beginExit = () => {
    const go = () => {
      setSplashState("exiting");
      setPhaseSafe("out");
      outTimerRef.current = window.setTimeout(() => {
        finishSplash();
      }, FADE_OUT_MS);
    };
    if (pageReadyRef.current) {
      go();
      return;
    }
    // Part 2 finished before the page warmed — wait, then cut.
    void waitForPageReady().then(() => {
      pageReadyRef.current = true;
      setPageReady(true);
      go();
    });
  };

  const onPart1Ended = () => {
    const video = part1Ref.current;
    if (video) {
      try {
        // Stick on the last frame until the user taps.
        video.pause();
        if (video.duration && Number.isFinite(video.duration)) {
          video.currentTime = Math.max(0, video.duration - 0.04);
        }
      } catch {
        /* ignore seek errors */
      }
    }
    // Never auto-advance into part 2 — only a user tap may start it.
    setPhaseSafe("hold");
  };

  const onPart2Ended = () => {
    if (!startedPart2Ref.current) return;
    beginExit();
  };

  const startPart2 = () => {
    if (startedPart2Ref.current) return;
    if (phaseRef.current !== "hold") return;

    startedPart2Ref.current = true;
    unlockSharedAudio();
    setPhaseSafe("part2");
    if (pageReadyRef.current) setSplashState("holding");

    const part1 = part1Ref.current;
    const part2 = part2Ref.current;
    part1?.pause();

    if (!part2) {
      beginExit();
      return;
    }

    void (async () => {
      try {
        part2.currentTime = 0;
        part2.muted = false;
        await part2.play();
      } catch {
        try {
          part2.muted = true;
          await part2.play();
        } catch {
          beginExit();
        }
      }
    })();
  };

  const onSplashPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "hold") return;
    if (e.button !== 0) return;
    startPart2();
  };

  if (phase === "done") return null;

  return (
    <div
      className={`app-splash app-splash--video app-splash--${phase}${
        frameReady ? " is-frame-ready" : ""
      }`}
      role="button"
      tabIndex={0}
      aria-label="Tap to start KidsKatalog"
      data-splash-phase={phase}
      onPointerDown={onSplashPointerDown}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (phaseRef.current === "hold") startPart2();
        }
      }}
    >
      {/* Poster paints first frame immediately; video fades in once decoded at t=0. */}
      <img
        className="app-splash__poster"
        src={PART1_POSTER}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <video
        ref={part1Ref}
        className={`app-splash__video app-splash__video--part1${
          phase === "part1" || phase === "hold" ? " is-active" : ""
        }${frameReady ? " is-frame-ready" : ""}`}
        src={PART1_SRC}
        poster={PART1_POSTER}
        playsInline
        muted
        preload="auto"
        onLoadedData={() => {
          const v = part1Ref.current;
          if (!v) return;
          try {
            if (v.currentTime !== 0) v.currentTime = 0;
          } catch {
            /* ignore */
          }
        }}
        onEnded={onPart1Ended}
        aria-hidden={phase !== "part1" && phase !== "hold"}
      />
      <video
        ref={part2Ref}
        className={`app-splash__video app-splash__video--part2${
          phase === "part2" || phase === "out" ? " is-active" : ""
        }`}
        src={PART2_SRC}
        playsInline
        preload="metadata"
        onEnded={onPart2Ended}
        aria-hidden={phase !== "part2" && phase !== "out"}
      />
      {phase === "hold" ? (
        <p className="app-splash__hint">Tap to continue</p>
      ) : null}
    </div>
  );
}
