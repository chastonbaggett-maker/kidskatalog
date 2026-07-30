import Link from "next/link";
import { Logo } from "./Logo";

type ShelfHeaderProps = {
  /** Optional page title under the icon */
  title?: string;
  /** Optional subtitle under the title */
  subtitle?: string;
  /** Show back chevron */
  backHref?: string;
  /** Taller product-style bar with soft bottom corners */
  rounded?: boolean;
  /** Use alternate gradient (profile) */
  altGradient?: boolean;
  className?: string;
};

export function ShelfHeader({
  title,
  subtitle,
  backHref,
  rounded = true,
  altGradient = false,
  className = "",
}: ShelfHeaderProps) {
  return (
    <header
      className={`${
        altGradient
          ? "bg-[image:var(--header-grad-alt)]"
          : "bg-[image:var(--header-grad)]"
      } px-3 pb-5 pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-[0_8px_20px_-12px_rgba(80,100,180,0.55)] ${
        rounded ? "rounded-b-[2rem]" : ""
      } ${className}`}
    >
      <div className="relative flex min-h-11 items-center justify-center">
        {backHref ? (
          <Link
            href={backHref}
            className="absolute left-0 flex h-10 w-10 items-center justify-center"
            aria-label="Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 5 8 12l7 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : null}

        <Logo variant="icon" light href="/shop" size={44} />
      </div>

      {title ? (
        <h1 className="mt-2 text-center font-[family-name:var(--font-display)] text-2xl font-bold leading-tight sm:text-3xl">
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <p className="mt-0.5 text-center text-white/85">{subtitle}</p>
      ) : null}
    </header>
  );
}
