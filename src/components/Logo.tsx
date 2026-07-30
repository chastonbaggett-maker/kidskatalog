import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string;
  /** Kept for compatibility; wordmark is baked into the logo file */
  variant?: "mark" | "wordmark";
  light?: boolean;
  className?: string;
  /** Rendered width in px */
  size?: number;
};

export function Logo({
  href = "/shop",
  light = true,
  className = "",
  size = 180,
}: LogoProps) {
  const src = light ? "/logo.svg" : "/logo-color.svg";
  const height = Math.round(size * (200 / 520));

  const mark = (
    <Image
      src={src}
      alt="Kids katalog"
      width={size}
      height={height}
      unoptimized
      priority
      className={`h-auto ${className}`}
      style={{ width: size, height: "auto" }}
    />
  );

  if (href === undefined) return mark;
  return (
    <Link
      href={href}
      className="inline-flex transition-transform active:scale-[0.97]"
      aria-label="Kids katalog"
    >
      {mark}
    </Link>
  );
}
