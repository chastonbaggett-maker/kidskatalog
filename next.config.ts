import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Avoid sticky stale CSS/JS on installed iPhone PWAs
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  // `/` is Parent or Kid depending on the cookie. Do not precache or
  // NetworkFirst-cache that document in the service worker.
  cacheStartUrl: false,
  dynamicStartUrl: false,
  extendDefaultRuntimeCaching: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: ({ url }: { url: URL }) => url.pathname === "/",
        handler: "NetworkOnly",
      },
    ],
  },
});

const REFERRER_POLICY = "strict-origin-when-cross-origin";

const nextConfig: NextConfig = {
  // next-pwa uses webpack; keep an empty turbopack config for Next 16
  turbopack: {},
  async headers() {
    const referrer = [
      { key: "Referrer-Policy", value: REFERRER_POLICY },
    ];
    return [
      {
        source: "/",
        headers: [
          ...referrer,
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
          {
            key: "Vary",
            value:
              "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Cookie",
          },
        ],
      },
      { source: "/:path*", headers: referrer },
    ];
  },
  serverExternalPackages: ["@libsql/client", "libsql"],
  // Allow Cursor browser / VM chrome / tunnel hosts in dev HMR
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.trycloudflare.com",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
      },
      {
        protocol: "https",
        hostname: "images-na.ssl-images-amazon.com",
      },
      {
        protocol: "https",
        hostname: "images-eu.ssl-images-amazon.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  // metrics.json / test artifacts live in-repo; watching them causes CSS HMR FOUC on kart add
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules|\.git|data\/.*\.json|test-results/,
      };
    }
    return config;
  },
};

export default withPWA(nextConfig);
