import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string;
  variant?: "mark" | "wordmark";
  light?: boolean;
  className?: string;
  size?: number;
};

export function Logo({
  href = "/shop",
  variant = "mark",
  light = true,
  className = "",
  size = 56,
}: LogoProps) {
  const src = light ? "/logo.svg" : "/logo-color.svg";

  const mark = (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label="Kids Katalog"
    >
      <Image
        src={src}
        alt="Kids Katalog"
        width={size}
        height={Math.round(size * 0.875)}
        unoptimized
        priority
        className="h-auto w-auto"
        style={{ width: size, height: "auto" }}
      />
      {variant === "wordmark" && (
        <span
          className={`font-[family-name:var(--font-body)] text-xl font-semibold lowercase tracking-wide ${
            light ? "text-white" : "text-[var(--blue)]"
          }`}
        >
          katalog
        </span>
      )}
    </span>
  );

  if (href === undefined) return mark;
  return (
    <Link
      href={href}
      className="inline-flex transition-transform active:scale-[0.97]"
    >
      {mark}
    </Link>
  );
}
