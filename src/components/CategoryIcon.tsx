import type { CategoryId } from "@/types/toy";

export function CategoryIcon({
  id,
  className = "h-10 w-10",
}: {
  id: CategoryId;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 64 64",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (id) {
    case "dinos":
      return (
        <svg {...common}>
          <path d="M12 42c4-12 10-18 20-18 6 0 10 2 14 6 3 3 8 4 10 2" />
          <path d="M20 42h28" />
          <circle cx="42" cy="26" r="2" fill="currentColor" stroke="none" />
          <path d="M18 42v8M28 42v8M38 42v8" />
        </svg>
      );
    case "plush":
      return (
        <svg {...common}>
          <circle cx="22" cy="20" r="7" />
          <circle cx="42" cy="20" r="7" />
          <ellipse cx="32" cy="36" rx="14" ry="12" />
          <circle cx="27" cy="34" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="37" cy="34" r="1.5" fill="currentColor" stroke="none" />
          <path d="M30 39c1 1.5 3 1.5 4 0" />
        </svg>
      );
    case "cars":
      return (
        <svg {...common}>
          <path d="M10 36h44l-4-12H18L10 36z" />
          <path d="M16 36v6h8M40 36v6h8" />
          <circle cx="20" cy="46" r="4" />
          <circle cx="44" cy="46" r="4" />
          <path d="M22 24h16l4 8H18l4-8z" />
        </svg>
      );
    case "blocks":
      return (
        <svg {...common}>
          <rect x="10" y="30" width="18" height="18" rx="2" />
          <rect x="28" y="18" width="18" height="18" rx="2" />
          <rect x="36" y="36" width="16" height="16" rx="2" />
        </svg>
      );
    case "outside":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="16" />
          <path d="M32 16v32M16 32h32M20 20l24 24M44 20L20 44" />
        </svg>
      );
    case "games":
      return (
        <svg {...common}>
          <rect x="12" y="12" width="40" height="40" rx="8" />
          <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none" />
          <circle cx="40" cy="40" r="3" fill="currentColor" stroke="none" />
          <circle cx="40" cy="24" r="3" fill="currentColor" stroke="none" />
          <circle cx="24" cy="40" r="3" fill="currentColor" stroke="none" />
          <circle cx="32" cy="32" r="3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "stem":
      return (
        <svg {...common}>
          <rect x="20" y="18" width="24" height="20" rx="4" />
          <circle cx="28" cy="28" r="2" fill="currentColor" stroke="none" />
          <circle cx="36" cy="28" r="2" fill="currentColor" stroke="none" />
          <path d="M26 38v8M38 38v8M18 24h-6M52 24h-6M32 12v6" />
          <circle cx="32" cy="10" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "pretend":
      return (
        <svg {...common}>
          <path d="M12 44V28l10-10 10 8 10-12 10 14v16H12z" />
          <path d="M28 44V34h8v10" />
        </svg>
      );
    default:
      return null;
  }
}
