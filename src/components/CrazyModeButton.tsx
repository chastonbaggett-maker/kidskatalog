"use client";

import { forwardRef } from "react";

type Props = {
  crazyMode: boolean;
  crazyFlash?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "filter" | "shelf";
  className?: string;
};

export const CrazyModeButton = forwardRef<HTMLButtonElement, Props>(
  function CrazyModeButton(
    { crazyMode, crazyFlash = false, onClick, variant = "filter", className = "" },
    ref,
  ) {
    const isShelf = variant === "shelf";

    return (
      <div
        className={`filter-crazy-btn-wrap shrink-0 ${
          crazyMode ? "filter-crazy-btn-wrap--active" : ""
        } ${crazyFlash ? "filter-crazy-btn-wrap--striking" : ""} ${className}`.trim()}
      >
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          aria-pressed={crazyMode}
          aria-label="Crazy Mode"
          className={`filter-crazy-btn flex items-center justify-center font-bold shadow-sm transition active:scale-95 ${
            isShelf
              ? "h-11 w-11 rounded-full"
              : "gap-1.5 rounded-full px-4 py-2.5 text-sm"
          } ${crazyMode ? "filter-crazy-btn--active" : ""}`}
        >
          {!isShelf ? (
            <>
              Crazy Mode
              <CrazyIcon />
            </>
          ) : (
            <CrazyIcon size={18} />
          )}
        </button>
      </div>
    );
  },
);

function CrazyIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}
