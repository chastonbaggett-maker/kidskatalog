"use client";

import Image from "next/image";
import Link from "next/link";
import { useAccentStore } from "@/lib/accent-store";

type LogoProps = {
  href?: string | null;
  variant?: "wordmark" | "icon";
  light?: boolean;
  glow?: boolean;
  className?: string;
  /** Rendered width in px (wordmark) or height in px (icon) */
  size?: number;
};

const WORDMARK_RATIO = 566 / 1299;
const ICON_RATIO = 386 / 566;

const COLOR_ICON: Record<"all" | "boys" | "girls", string> = {
  all: "/logo-icon-teal.png",
  boys: "/logo-icon-boys.png",
  girls: "/logo-icon-girls.png",
};

const COLOR_WORDMARK: Record<"all" | "boys" | "girls", string> = {
  all: "/logo-color-teal.png",
  boys: "/logo-color-boys.png",
  girls: "/logo-color-girls.png",
};

export function Logo({
  href = "/shop",
  variant = "wordmark",
  light = true,
  glow = false,
  className = "",
  size = 110,
}: LogoProps) {
  const audience = useAccentStore((s) => s.audience);
  const isIcon = variant === "icon";
  const src = isIcon
    ? light
      ? "/logo-icon.png"
      : COLOR_ICON[audience]
    : light
      ? "/logo.png"
      : COLOR_WORDMARK[audience];

  const width = isIcon ? Math.round(size * ICON_RATIO) : size;
  const height = isIcon ? size : Math.round(size * WORDMARK_RATIO);

  const mark = (
    <Image
      src={src}
      alt="kids katalog"
      width={width}
      height={height}
      priority
      className={`h-auto ${glow ? "logo-glow" : ""} ${className}`.trim()}
      unoptimized={glow}
      style={
        isIcon
          ? { height: size, width: "auto" }
          : { width: size, height: "auto" }
      }
    />
  );

  if (href === null || href === undefined) return mark;
  return (
    <Link
      href={href}
      className="inline-flex transition-transform active:scale-[0.97]"
      aria-label="kids katalog"
    >
      {mark}
    </Link>
  );
}
