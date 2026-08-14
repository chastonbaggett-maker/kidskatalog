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
};

/**
 * HTML5 video that also plays Amazon HLS (.m3u8) via hls.js when needed.
 */
export const PlayableVideo = forwardRef<HTMLVideoElement, Props>(
  function PlayableVideo({ src, onReady, ...props }, ref) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
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

        // Safari / iOS can play HLS natively.
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

    return <video ref={videoRef} {...props} />;
  },
);
