"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useConfettiBurst } from "@/hooks/useConfettiBurst";
import type { Audience } from "@/types/toy";

const AGES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

const BOYS_CONFETTI = ["#4e89ff", "#3a6fe0", "#7aa8ff", "#2f6ae8", "#ffffff", "#5b93ff"];
const GIRLS_CONFETTI = ["#f5a9c5", "#ef8fb3", "#ffc2d6", "#e078a8", "#ffffff", "#f0a0c0"];

type Props = {
  audience: Audience;
  onAudienceChange: (value: Audience) => void;
  showText: boolean;
  onShowTextChange: (value: boolean) => void;
  age: number | null;
  onAgeChange: (value: number | null) => void;
};

export function FilterRow({
  audience,
  onAudienceChange,
  showText,
  onShowTextChange,
  age,
  onAgeChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const { fire: fireConfetti, portal: confettiPortal } = useConfettiBurst();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const ageModal =
    open && mounted
      ? createPortal(
          <div
            className="age-pop-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              ref={popRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="age-pop w-[min(18.5rem,calc(100vw-2rem))] rounded-[1.75rem] bg-white p-4 shadow-[0_18px_50px_-18px_rgba(80,60,140,0.55)] ring-1 ring-black/5"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p
                    id={titleId}
                    className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]"
                  >
                    How old are you?
                  </p>
                  <p className="text-xs font-semibold text-[var(--ink-soft)]">
                    Pick an age · 3 to 13
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f8] text-[var(--ink-soft)]"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {AGES.map((n) => {
                  const selected = age === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        onAgeChange(selected ? null : n);
                        setOpen(false);
                      }}
                      className={`age-pop-chip flex aspect-square items-center justify-center rounded-2xl text-lg font-extrabold transition active:scale-95 ${
                        selected
                          ? "bg-[var(--mint)] text-white shadow-md"
                          : "bg-[#e7faf7] text-[#1a8f82] hover:bg-[#c8f2eb]"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  onAgeChange(null);
                  setOpen(false);
                }}
                className="mt-3 w-full rounded-full bg-[#f3f4f8] py-2.5 text-sm font-bold text-[var(--ink-soft)] transition active:scale-[0.98]"
              >
                Show all ages
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="filter-row-scroll relative overflow-x-auto overscroll-x-contain">
      <div className="flex w-max min-w-full items-center gap-2.5 px-4 py-3.5">
        <button
          type="button"
          onClick={() => onShowTextChange(!showText)}
          className="flex shrink-0 items-center gap-2 rounded-full bg-[#f3f4f8] px-3.5 py-2.5 text-sm font-bold text-[var(--blue)] shadow-sm"
        >
          Text
          <span
            className={`relative h-6 w-10 rounded-full transition ${
              showText ? "bg-[var(--blue)]" : "bg-[#d0d4de]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                showText ? "left-[18px]" : "left-0.5"
              }`}
            />
          </span>
        </button>

        <div className="relative shrink-0">
          <button
            ref={btnRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95 ${
              age != null ? "bg-[var(--mint)]" : "bg-[var(--mint)]/70"
            }`}
          >
            Age{age != null ? ` ${age}` : ""}
            <CakeIcon />
          </button>
          {ageModal}
        </div>

        <div className="min-w-2 flex-1" aria-hidden />

        <button
          type="button"
          onClick={(e) => {
            const next = audience === "boys" ? "all" : "boys";
            onAudienceChange(next);
            if (next === "boys") {
              fireConfetti(
                (e.currentTarget as HTMLButtonElement).getBoundingClientRect(),
                BOYS_CONFETTI,
              );
            }
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4.5 py-2.5 text-sm font-bold text-white shadow-sm transition ${
            audience === "boys" || audience === "all"
              ? "bg-[var(--boys-chip)]"
              : "bg-[var(--boys-chip)]/45"
          } ${audience === "girls" ? "opacity-55" : ""}`}
        >
          Boys
          <RocketIcon />
        </button>

        <button
          type="button"
          onClick={(e) => {
            const next = audience === "girls" ? "all" : "girls";
            onAudienceChange(next);
            if (next === "girls") {
              fireConfetti(
                (e.currentTarget as HTMLButtonElement).getBoundingClientRect(),
                GIRLS_CONFETTI,
              );
            }
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4.5 py-2.5 text-sm font-bold text-white shadow-sm transition ${
            audience === "girls" || audience === "all"
              ? "bg-[var(--girls-chip)]"
              : "bg-[var(--girls-chip)]/45"
          } ${audience === "boys" ? "opacity-55" : ""}`}
        >
          Girls
          <HeartIcon />
        </button>
      </div>
      {confettiPortal}
    </div>
  );
}

function CakeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 8.5V7c0-1.1.9-2 2-2 .6 0 1 .4 1 1s-.4 1-1 1-1 .4-1 1 .4 1 1 1 1-.4 1-1c0-1.7 1.3-3 3-3s3 1.3 3 3v1.5c1.2.2 2 1.2 2 2.4V11H6v-.1c0-1.2.8-2.2 2-2.4z" />
      <path d="M6 12h12v2l-1.2 1.5c-.2.3-.3.6-.3 1V20H7.5v-3.5c0-.4-.1-.7-.3-1L6 14v-2z" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2c2.8 2.1 4.6 5.4 4.9 9.1.2 2.1-.3 4.1-1.3 5.8l2.9 2.9-1.4 1.4-2.8-2.8c-.5.3-1.1.5-1.7.6V22h-1.2v-3.1c-.7-.1-1.3-.3-1.9-.7l-2.7 2.7-1.4-1.4 2.8-2.8C7.4 15.2 6.9 13.2 7.1 11.1 7.4 7.4 9.2 4.1 12 2zm0 5.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6z" />
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
