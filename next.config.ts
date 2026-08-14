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
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  // next-pwa uses webpack; keep an empty turbopack config for Next 16
  turbopack: {},
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
