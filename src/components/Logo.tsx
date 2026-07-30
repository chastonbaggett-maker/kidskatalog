import Link from "next/link";

type LogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  light?: boolean;
};

export function Logo({ href = "/", size = "md", light = false }: LogoProps) {
  const sizes = {
    sm: { k: "text-3xl", rest: "text-xl", star: 6 },
    md: { k: "text-4xl", rest: "text-2xl", star: 8 },
    lg: { k: "text-7xl sm:text-8xl", rest: "text-4xl sm:text-5xl", star: 14 },
  }[size];

  const color = light ? "text-white" : "text-[var(--forest)]";

  const mark = (
    <span
      className={`relative inline-flex items-baseline gap-0.5 font-[family-name:var(--font-display)] ${color}`}
      aria-label="Kids Katalog"
    >
      <span className="relative">
        <span
          className="pointer-events-none absolute -top-2 left-1 flex gap-0.5"
          aria-hidden
        >
          <Star size={sizes.star} />
          <Star size={sizes.star * 0.7} className="-mt-1" />
        </span>
        <span className={`${sizes.k} font-bold leading-none tracking-tight`}>
          K
        </span>
      </span>
      <span
        className={`${sizes.rest} font-[family-name:var(--font-script)] font-normal leading-none tracking-wide`}
      >
        ids Katalog
      </span>
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex transition-transform hover:scale-[1.02] active:scale-[0.98]">
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
