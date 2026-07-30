import Link from "next/link";

type LogoProps = {
  href?: string;
  variant?: "mark" | "wordmark";
  light?: boolean;
  className?: string;
};

export function Logo({
  href = "/shop",
  variant = "mark",
  light = true,
  className = "",
}: LogoProps) {
  const color = light ? "text-white" : "text-[var(--blue)]";

  const mark =
    variant === "mark" ? (
      <span className={`relative inline-flex ${color} ${className}`} aria-label="Kids Katalog">
        <span className="pointer-events-none absolute -right-1 -top-2 flex gap-0.5" aria-hidden>
          <Star size={8} />
          <Star size={6} className="-mt-1" />
          <Star size={5} className="mt-1" />
        </span>
        <span className="font-[family-name:var(--font-display)] text-4xl font-bold leading-none tracking-tight">
          k
        </span>
      </span>
    ) : (
      <span
        className={`relative inline-flex items-baseline gap-1 ${color} ${className}`}
        aria-label="Kids Katalog"
      >
        <span className="relative">
          <span className="pointer-events-none absolute -top-2 left-0 flex gap-0.5" aria-hidden>
            <Star size={9} />
            <Star size={7} className="-mt-0.5" />
            <Star size={6} />
          </span>
          <span className="font-[family-name:var(--font-display)] text-3xl font-bold leading-none">
            Kids
          </span>
        </span>
        <span className="font-[family-name:var(--font-body)] text-xl font-semibold lowercase tracking-wide opacity-95">
          katalog
        </span>
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

function Star({ size, className = "" }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9L12 2.5z" />
    </svg>
  );
}
