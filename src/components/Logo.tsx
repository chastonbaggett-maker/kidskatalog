import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string;
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
  size = 200,
}: LogoProps) {
  const src = light ? "/logo.png" : "/logo-color.png";
  const height = Math.round(size * (566 / 1299));

  const mark = (
    <Image
      src={src}
      alt="kids katalog"
      width={size}
      height={height}
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
      aria-label="kids katalog"
    >
      {mark}
    </Link>
  );
}
