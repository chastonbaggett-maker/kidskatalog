"use client";

import { forwardRef, useCallback, useState } from "react";

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
    const [tapFlash, setTapFlash] = useState(false);
    const striking = crazyFlash || tapFlash;

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        setTapFlash(true);
        window.setTimeout(() => setTapFlash(false), 320);
        onClick(e);
      },
      [onClick],
    );

    return (
      <div
        className={`filter-crazy-btn-wrap shrink-0 ${
          crazyMode ? "filter-crazy-btn-wrap--active" : ""
        } ${striking ? "filter-crazy-btn-wrap--striking" : ""} ${className}`.trim()}
      >
        <button
          ref={ref}
          type="button"
          onClick={handleClick}
          aria-pressed={crazyMode}
          className={`filter-crazy-btn flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold shadow-sm transition active:scale-95 ${
            crazyMode ? "filter-crazy-btn--active" : ""
          }`}
        >
          Crazy Mode
          <span className="filter-crazy-btn__bolt" aria-hidden>
            <CrazyIcon />
            <span className="filter-crazy-btn__flash">
              <span className="filter-crazy-btn__flash-core" />
              <span className="filter-crazy-btn__flash-bolt filter-crazy-btn__flash-bolt--a" />
              <span className="filter-crazy-btn__flash-bolt filter-crazy-btn__flash-bolt--b" />
              <span className="filter-crazy-btn__flash-bolt filter-crazy-btn__flash-bolt--c" />
            </span>
          </span>
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
