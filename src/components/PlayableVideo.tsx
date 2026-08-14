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

/**
 * HTML5 video that also plays Amazon HLS (.m3u8) via hls.js when needed.
 */
export const PlayableVideo = forwardRef<
  HTMLVideoElement,
  Omit<VideoHTMLAttributes<HTMLVideoElement>, "src"> & { src: string }
>(function PlayableVideo({ src, ...props }, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let cancelled = false;
    let hls: { destroy: () => void } | null = null;

    const attach = async () => {
      if (!isHlsUrl(src)) {
        video.src = src;
        return;
      }

      // Safari / iOS can play HLS natively.
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
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
        instance.loadSource(src);
        instance.attachMedia(video);
        hls = instance;
      } catch {
        // Fall back to native src — may still fail on non-Safari.
        if (!cancelled) video.src = src;
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
});
