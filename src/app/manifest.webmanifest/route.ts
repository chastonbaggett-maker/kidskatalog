import { NextResponse } from "next/server";
import { hostnameOnly, resolveDeploymentMode } from "@/lib/deployment";

export const dynamic = "force-dynamic";

const ICONS = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
  { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

export function GET(request: Request) {
  const host = process.env.VERCEL
    ? request.headers.get("x-forwarded-host") || request.headers.get("host")
    : request.headers.get("host");
  const kids = resolveDeploymentMode({ host: hostnameOnly(host) }) === "kids";
  const body = {
    name: kids ? "KidsKatalog Kids" : "KidsKatalog",
    short_name: kids ? "KidsKatalog Kids" : "KidsKatalog",
    description: kids
      ? "Browse toys and build a Kart."
      : "Parent catalog of KidsKatalog toys.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f5f5f7",
    theme_color: "#2bb8a8",
    lang: "en",
    icons: ICONS,
  };
  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "private, no-store",
      ...(kids ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    },
  });
}
