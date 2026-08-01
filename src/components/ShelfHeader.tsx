import type { ReactNode } from "react";
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
  /** Right-side action, e.g. crazy mode toggle in browse shelf */
  trailing?: ReactNode;
};

export function ShelfHeader({
  title,
  subtitle,
  backHref,
  rounded = true,
  altGradient = false,
  className = "",
  trailing,
}: ShelfHeaderProps) {
  const surfaceClass = [
    "shelf-header__surface",
    altGradient ? "shelf-header__surface--alt" : "",
    rounded ? "shelf-header__surface--rounded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className="shelf-header shrink-0">
      <div className={`${surfaceClass} ${className}`.trim()}>
        <div className="relative flex min-h-11 items-center justify-center px-3">
          {backHref ? (
            <Link
              href={backHref}
              className="shelf-back-btn back-fun flex h-11 w-11 items-center justify-center rounded-full bg-white/25 text-white shadow-[0_6px_16px_-8px_rgba(40,40,80,0.55)] ring-2 ring-white/40 backdrop-blur-[2px] transition active:scale-90"
              aria-label="Back"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 12h9"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          ) : null}

          <Logo variant="icon" light glow href="/shop" size={44} />
          {trailing}
        </div>

        {title ? (
          <h1 className="mt-2 px-3 text-center font-[family-name:var(--font-display)] text-2xl font-bold leading-tight sm:text-3xl">
            {title}
          </h1>
        ) : null}
        {subtitle ? (
          <p className="mt-0.5 px-3 text-center text-white/85">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}
