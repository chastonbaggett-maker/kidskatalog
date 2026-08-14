"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type VideoHTMLAttributes,
} from "react";

function isHlsUrl(src: string): boolean {
  return /\.m3u8(\?|$)/i.test(src.trim());
}

type Props = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  src: string;
  /** Fires once the progressive/HLS source is attached and ready to play. */
  onReady?: () => void;
  /** Optional poster used as blurred fill before/while video frames mirror. */
  poster?: string;
};

/**
 * HTML5 video that also plays Amazon HLS (.m3u8) via hls.js when needed.
 * Letterboxing is filled with a blurred copy of the playing video.
 */
export const PlayableVideo = forwardRef<HTMLVideoElement, Props>(
  function PlayableVideo({ src, onReady, className, poster, style, ...props }, ref) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const blurRef = useRef<HTMLVideoElement | null>(null);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;

    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;

      let cancelled = false;
      let hls: { destroy: () => void } | null = null;
      let readyFired = false;

      const fireReady = () => {
        if (cancelled || readyFired) return;
        readyFired = true;
        onReadyRef.current?.();
      };

      const attach = async () => {
        const notifyWhenCanPlay = () => {
          if (video.readyState >= 2) {
            fireReady();
            return;
          }
          const onCanPlay = () => {
            video.removeEventListener("canplay", onCanPlay);
            fireReady();
          };
          video.addEventListener("canplay", onCanPlay);
        };

        if (!isHlsUrl(src)) {
          video.src = src;
          notifyWhenCanPlay();
          return;
        }

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
          notifyWhenCanPlay();
          return;
        }

        try {
          const mod = await import("hls.js");
          const Hls = mod.default;
          if (cancelled || !Hls.isSupported()) return;
          const instance = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });
          instance.on(Hls.Events.MANIFEST_PARSED, () => {
            fireReady();
          });
          instance.loadSource(src);
          instance.attachMedia(video);
          hls = instance;
        } catch {
          if (!cancelled) {
            video.src = src;
            notifyWhenCanPlay();
          }
        }
      };

      void attach();

      return () => {
        cancelled = true;
        try {
          hls?.destroy();
        } catch {
          /* ignore */
        }
        video.removeAttribute("src");
        video.load();
      };
    }, [src]);

    // Mirror the foreground into a blurred cover layer (fills letterbox bars).
    useEffect(() => {
      const main = videoRef.current;
      const blur = blurRef.current;
      if (!main || !blur) return;

      let mirrored = false;

      const clearMirror = () => {
        mirrored = false;
        try {
          blur.pause();
        } catch {
          /* ignore */
        }
        blur.removeAttribute("src");
        blur.srcObject = null;
        blur.load();
      };

      const mirrorFromMain = () => {
        if (mirrored) return;
        const capture = (
          main as HTMLVideoElement & {
            captureStream?: () => MediaStream;
            mozCaptureStream?: () => MediaStream;
          }
        ).captureStream?.bind(main) ||
          (
            main as HTMLVideoElement & {
              mozCaptureStream?: () => MediaStream;
            }
          ).mozCaptureStream?.bind(main);

        if (capture) {
          try {
            const stream = capture();
            blur.srcObject = stream;
            blur.muted = true;
            void blur.play().catch(() => undefined);
            mirrored = true;
            return;
          } catch {
            /* fall through */
          }
        }

        // Progressive fallback: same URL, cover+blur (may share HTTP cache).
        if (!isHlsUrl(src)) {
          blur.srcObject = null;
          blur.src = src;
          blur.muted = true;
          void blur.play().catch(() => undefined);
          mirrored = true;
        }
      };

      const syncTime = () => {
        if (!blur.src && !blur.srcObject) return;
        try {
          if (Math.abs((blur.currentTime || 0) - main.currentTime) > 0.35) {
            blur.currentTime = main.currentTime;
          }
        } catch {
          /* ignore seek errors */
        }
        if (!main.paused && blur.paused) {
          void blur.play().catch(() => undefined);
        }
        if (main.paused && !blur.paused) {
          blur.pause();
        }
      };

      const onPlaying = () => {
        mirrorFromMain();
        syncTime();
      };

      main.addEventListener("playing", onPlaying);
      main.addEventListener("timeupdate", syncTime);
      main.addEventListener("pause", syncTime);
      main.addEventListener("seeked", syncTime);

      if (!main.paused) onPlaying();

      return () => {
        main.removeEventListener("playing", onPlaying);
        main.removeEventListener("timeupdate", syncTime);
        main.removeEventListener("pause", syncTime);
        main.removeEventListener("seeked", syncTime);
        clearMirror();
      };
    }, [src]);

    const blurPosterStyle = poster
      ? {
          backgroundImage: `url(${poster})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : undefined;

    return (
      <div className={["playable-video", className].filter(Boolean).join(" ")} style={style}>
        <div
          className="playable-video__blur-plate"
          style={blurPosterStyle}
          aria-hidden
        >
          <video
            ref={blurRef}
            className="playable-video__blur"
            muted
            playsInline
            loop={props.loop}
            preload="metadata"
            aria-hidden
            tabIndex={-1}
          />
        </div>
        <video
          ref={videoRef}
          className="playable-video__main"
          poster={poster}
          {...props}
        />
      </div>
    );
  },
);
