"use client";

import { forwardRef } from "react";

type Props = {
  active: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export const ToyPileModeButton = forwardRef<HTMLButtonElement, Props>(
  function ToyPileModeButton({ active, onClick, className = "" }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`filter-pile-btn flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold shadow-sm transition active:scale-95 ${
          active ? "filter-pile-btn--active" : ""
        } ${className}`.trim()}
      >
        Toy Pile
        <PileIcon />
      </button>
    );
  },
);

function PileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="10" width="9" height="9" rx="1.5" opacity="0.55" transform="rotate(-12 7.5 14.5)" />
      <rect x="8" y="4" width="9" height="9" rx="1.5" opacity="0.75" transform="rotate(8 12.5 8.5)" />
      <rect x="12" y="11" width="9" height="9" rx="1.5" transform="rotate(22 16.5 15.5)" />
    </svg>
  );
}
