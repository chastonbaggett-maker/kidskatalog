"use client";

import { useEffect, useRef, useState } from "react";
import { unlockSharedAudio } from "@/lib/shared-audio";
import {
  SPLASH_PART1_END,
  SPLASH_PART1_POSTER,
} from "@/lib/splash-boot";

/** Cache-busted filenames so stale clips cannot stick in the browser cache. */
const PART1_SRC = "/splash/intro-part-1-mint.mp4?v=4";
const PART2_SRC = "/splash/intro-part-2-white.mp4?v=4";
const PART1_POSTER = SPLASH_PART1_POSTER;
const PART1_END = SPLASH_PART1_END;
/** Soft fade after part 2 so the already-warmed page is underneath. */
const FADE_OUT_MS = 420;
/** Pause this far before `ended` so we never seek-back on the last frame. */
const HOLD_BEFORE_END_S = 0.05;
/** If the user doesn't tap during hold, continue automatically. */
const HOLD_AUTO_CONTINUE_MS = 5000;

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
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
  try {
    await fetch("/api/catalog?offset=0&limit=8", { credentials: "same-origin" });
  } catch {
    /* offline / slow — still proceed */
  }
}

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
    window.setTimeout(done, 1200);
  });
}

/**
 * Cold-open splash: play intro part 1, freeze the true last frame until tap,
 * play intro part 2, then reveal the already-loaded page underneath.
 */
export function AppSplash() {
  const part1Ref = useRef<HTMLVideoElement>(null);
  const part2Ref = useRef<HTMLVideoElement>(null);
  const phaseRef = useRef<SplashPhase>("part1");
  const heldRef = useRef(false);
  const [phase, setPhase] = useState<SplashPhase>("part1");
  const [pageReady, setPageReady] = useState(false);
  const [videoPainted, setVideoPainted] = useState(false);
  const pageReadyRef = useRef(false);
  const startedPart2Ref = useRef(false);
  const outTimerRef = useRef<number | null>(null);
  const holdAutoTimerRef = useRef<number | null>(null);

  const setPhaseSafe = (next: SplashPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const clearHoldAutoTimer = () => {
    if (holdAutoTimerRef.current != null) {
      window.clearTimeout(holdAutoTimerRef.current);
      holdAutoTimerRef.current = null;
    }
  };

  const freezePart1Hold = () => {
    if (heldRef.current) return;
    heldRef.current = true;
    const video = part1Ref.current;
    if (video) {
      try {
        // Pause in place — never seek backwards (that jumps to a prior keyframe).
        video.pause();
      } catch {
        /* ignore */
      }
    }
    setVideoPainted(true);
    setPhaseSafe("hold");
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
      clearHoldAutoTimer();
      if (outTimerRef.current != null) {
        window.clearTimeout(outTimerRef.current);
        outTimerRef.current = null;
      }
    };
  }, []);

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
    const markPainted = () => {
      if (!cancelled) setVideoPainted(true);
    };

    const onTimeUpdate = () => {
      if (cancelled || heldRef.current) return;
      if (phaseRef.current !== "part1") return;
      const duration = video.duration;
      if (!duration || !Number.isFinite(duration)) return;
      if (video.currentTime >= duration - HOLD_BEFORE_END_S) {
        freezePart1Hold();
      }
    };

    const playPart1 = async () => {
      video.muted = true;
      await waitForFirstFrame(video);
      if (cancelled) return;
      try {
        // Only seek to 0 before playback starts — never after.
        if (video.currentTime > 0.001) video.currentTime = 0;
        video.addEventListener("playing", markPainted, { once: true });
        video.addEventListener("timeupdate", onTimeUpdate);
        await video.play();
        window.setTimeout(markPainted, 80);
      } catch {
        markPainted();
        freezePart1Hold();
      }
    };

    void playPart1();
    return () => {
      cancelled = true;
      video.removeEventListener("playing", markPainted);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, []);

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
    void waitForPageReady().then(() => {
      pageReadyRef.current = true;
      setPageReady(true);
      go();
    });
  };

  const onPart1Ended = () => {
    // Backup if timeupdate missed the pre-end pause.
    freezePart1Hold();
  };

  const onPart2Ended = () => {
    if (!startedPart2Ref.current) return;
    beginExit();
  };

  const startPart2 = () => {
    if (startedPart2Ref.current) return;
    if (phaseRef.current !== "hold") return;

    clearHoldAutoTimer();
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
        // Visual-only — site bed music starts after splash clears (avoids stacked audio).
        part2.muted = true;
        await part2.play();
      } catch {
        beginExit();
      }
    })();
  };

  // Hold beat: wait for tap, or auto-continue after 5s.
  useEffect(() => {
    if (phase !== "hold") {
      clearHoldAutoTimer();
      return;
    }
    clearHoldAutoTimer();
    holdAutoTimerRef.current = window.setTimeout(() => {
      holdAutoTimerRef.current = null;
      startPart2();
    }, HOLD_AUTO_CONTINUE_MS);
    return () => clearHoldAutoTimer();
  }, [phase]);

  const onSplashPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "hold") return;
    if (e.button !== 0) return;
    startPart2();
  };

  if (phase === "done") return null;

  const posterVisible = phase === "part1" && !videoPainted;
  const endFrameVisible = phase === "hold";

  return (
    <div
      className={`app-splash app-splash--video app-splash--${phase}${
        videoPainted ? " is-video-painted" : ""
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
      <div className="app-splash__stage">
        <img
          className={`app-splash__poster${posterVisible ? " is-visible" : ""}`}
          src={PART1_POSTER}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <video
          ref={part1Ref}
          className={`app-splash__video app-splash__video--part1${
            phase === "part1" ? " is-active" : ""
          }`}
          src={PART1_SRC}
          poster={PART1_POSTER}
          playsInline
          muted
          preload="auto"
          onEnded={onPart1Ended}
          aria-hidden={phase !== "part1"}
        />
        <img
          className={`app-splash__end-frame${endFrameVisible ? " is-visible" : ""}`}
          src={PART1_END}
          alt=""
          aria-hidden={!endFrameVisible}
          draggable={false}
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
      </div>
      {phase === "hold" ? (
        <p className="app-splash__hint">Tap to continue</p>
      ) : null}
    </div>
  );
}
