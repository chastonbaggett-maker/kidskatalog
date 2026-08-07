"use client";

import { forwardRef } from "react";

type Props = {
  crazyMode: boolean;
  crazyFlash?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export const CrazyModeButton = forwardRef<HTMLButtonElement, Props>(
  function CrazyModeButton(
    { crazyMode, crazyFlash = false, onClick, className = "" },
    ref,
  ) {
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
          className={`filter-crazy-btn flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold shadow-sm transition active:scale-95 ${
            crazyMode ? "filter-crazy-btn--active" : ""
          }`}
        >
          Crazy Mode
          <CrazyIcon />
        </button>
      </div>
    );
  },
);

function CrazyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}
