"use client";

import { useRef, useState } from "react";
import { useKartStore } from "@/lib/kart-store";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";

type PlayfulState = {
  in: boolean;
  out: boolean;
};

type LetterSpan = {
  key: string;
  char: string;
  move: number;
  rotate: number;
  part: number;
};

function splitPlayfulLetters(text: string): LetterSpan[] {
  const letters = text.split("");
  const half = letters.length / 2;

  return letters.map((char, index) => {
    const part = index >= half ? -1 : 1;
    const position =
      index >= half ? half - index + (half - 1) : index;
    const move = half === 0 ? 0 : position / half;
    const rotate = 1 - move;

    return {
      key: `${index}-${char}`,
      char: char === " " ? "\u00a0" : char,
      move,
      rotate,
      part,
    };
  });
}

function PlayfulLabel({ text }: { text: string }) {
  return (
    <>
      {splitPlayfulLetters(text).map((letter) => (
        <span
          key={letter.key}
          className="add-kart-btn__letter"
          style={
            {
              "--move": letter.move,
              "--rotate": letter.rotate,
              "--part": letter.part,
            } as React.CSSProperties
          }
        >
          {letter.char}
        </span>
      ))}
    </>
  );
}

export function AddToKartButton({ toyId }: { toyId: string }) {
  const inKart = useKartStore((s) => s.ids.includes(toyId));
  const toggle = useKartStore((s) => s.toggle);
  const btnRef = useRef<HTMLButtonElement>(null);
  const outTimerRef = useRef<number | null>(null);
  const [charging, setCharging] = useState(false);
  const [playful, setPlayful] = useState<PlayfulState>({ in: false, out: false });
  const { fire, portal, bursting } = useConfettiBurst();

  const label = inKart ? "In Kart — tap to remove" : "+ Add to Kart";
  const playfulActive =
    !charging && !bursting && (playful.in || playful.out);

  const clearOutTimer = () => {
    if (outTimerRef.current != null) {
      window.clearTimeout(outTimerRef.current);
      outTimerRef.current = null;
    }
  };

  const handlePointerEnter = () => {
    if (charging || bursting) return;
    clearOutTimer();
    setPlayful({ in: true, out: false });
  };

  const handlePointerLeave = () => {
    if (charging || bursting || !playful.in) return;
    setPlayful({ in: true, out: true });
    clearOutTimer();
    outTimerRef.current = window.setTimeout(() => {
      setPlayful({ in: false, out: false });
      outTimerRef.current = null;
    }, 950);
  };

  const handlePointerDown = () => {
    if (!inKart) setCharging(true);
  };

  const clearCharge = () => setCharging(false);

  const handleClick = () => {
    const wasIn = inKart;
    toggle(toyId);
    clearCharge();
    clearOutTimer();
    setPlayful({ in: false, out: false });
    if (!wasIn) fire(btnRef.current?.getBoundingClientRect(), GOLD_CONFETTI);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={clearCharge}
        onPointerCancel={clearCharge}
        className={`add-kart-btn add-kart-btn--pill add-kart-btn--playful h-[3.9rem] min-w-0 flex-1 rounded-full px-5 text-base font-bold shadow-md transition active:scale-[0.98] ${
          inKart
            ? "add-kart-btn--in text-white"
            : "bg-[var(--blue)] text-white hover:bg-[var(--blue-deep)]"
        } ${charging ? "add-kart-btn--charging" : ""} ${bursting ? "add-kart-btn--burst" : ""} ${
          playful.in ? "is-playful-in" : ""
        } ${playful.out ? "is-playful-out" : ""}`}
        aria-pressed={inKart}
        aria-label={inKart ? "Remove from Kart" : "Add to Kart"}
      >
        <span
          className={`add-kart-btn__label relative z-[1] inline-flex items-center justify-center ${
            playfulActive ? "is-animating" : ""
          }`}
        >
          <PlayfulLabel text={label} />
        </span>
        <span className="add-kart-btn__glow" aria-hidden />
      </button>
      {portal}
    </>
  );
}
