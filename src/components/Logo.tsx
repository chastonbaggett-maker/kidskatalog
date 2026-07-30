import Image from "next/image";
import Link from "next/link";

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

export function Logo({
  href = "/shop",
  variant = "wordmark",
  light = true,
  glow = false,
  className = "",
  size = 110,
}: LogoProps) {
  const isIcon = variant === "icon";
  const src = isIcon
    ? light
      ? "/logo-icon.png"
      : "/logo-icon-color.png"
    : light
      ? "/logo.png"
      : "/logo-color.png";

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
