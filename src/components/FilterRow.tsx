"use client";

import type { Audience } from "@/types/toy";

type Props = {
  audience: Audience;
  onAudienceChange: (value: Audience) => void;
  showText: boolean;
  onShowTextChange: (value: boolean) => void;
};

export function FilterRow({
  audience,
  onAudienceChange,
  showText,
  onShowTextChange,
}: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2.5 scrollbar-none">
      <button
        type="button"
        onClick={() => onShowTextChange(!showText)}
        className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[var(--blue)] shadow-sm"
      >
        Text
        <span
          className={`relative h-5 w-9 rounded-full transition ${
            showText ? "bg-[var(--blue)]" : "bg-[#d0d4de]"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              showText ? "left-[18px]" : "left-0.5"
            }`}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={() =>
          onAudienceChange(audience === "boys" ? "all" : "boys")
        }
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold text-white shadow-sm transition ${
          audience === "boys" || audience === "all"
            ? "bg-[var(--blue)]"
            : "bg-[var(--blue)]/45"
        } ${audience === "girls" ? "opacity-55" : ""}`}
      >
        Boys
        <PlayIcon />
      </button>

      <button
        type="button"
        onClick={() =>
          onAudienceChange(audience === "girls" ? "all" : "girls")
        }
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold text-white shadow-sm transition ${
          audience === "girls" || audience === "all"
            ? "bg-[var(--pink)]"
            : "bg-[var(--pink)]/45"
        } ${audience === "boys" ? "opacity-55" : ""}`}
      >
        Girls
        <HeartIcon />
      </button>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21s-7-4.4-9.5-8.2C.5 9.5 2.2 6 5.8 6c1.9 0 3.2 1 4.2 2.3C11 7 12.3 6 14.2 6c3.6 0 5.3 3.5 3.3 6.8C19 16.6 12 21 12 21z" />
    </svg>
  );
}
