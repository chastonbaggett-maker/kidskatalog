"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

const HOLD_MS = 2000;

type Props = {
  label: string;
  ariaLabel: string;
  onComplete: () => void;
  className?: string;
};

/**
 * Hold 2s to confirm. Lavender base fills with purple-deep; release cancels.
 */
export function HoldToRemoveButton({
  label,
  ariaLabel,
  onComplete,
  className = "",
}: Props) {
  const [progress, setProgress] = useState(0);
  const [armed, setArmed] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stopHold = useCallback((completed: boolean) => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startRef.current = null;
    setArmed(false);
    if (!completed) {
      setProgress(0);
      doneRef.current = false;
    }
  }, []);

  const tick = useCallback((now: number) => {
    if (startRef.current == null) return;
    const elapsed = now - startRef.current;
    const next = Math.min(1, elapsed / HOLD_MS);
    setProgress(next);
    if (next >= 1) {
      if (!doneRef.current) {
        doneRef.current = true;
        setArmed(false);
        onCompleteRef.current();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startHold = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button != null && event.button !== 0) return;
      if (doneRef.current) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      startRef.current = performance.now();
      setArmed(true);
      setProgress(0);
      rafRef.current = requestAnimationFrame(tick);
    },
    [tick],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={`hold-to-remove ${armed ? "is-holding" : ""} ${className}`.trim()}
      aria-label={ariaLabel}
      title="Hold to remove"
      onPointerDown={startHold}
      onPointerUp={() => stopHold(doneRef.current)}
      onPointerCancel={() => stopHold(false)}
      onLostPointerCapture={() => {
        if (!doneRef.current) stopHold(false);
      }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ "--hold-progress": String(progress) } as CSSProperties}
      data-testid="hold-to-remove"
      data-hold-progress={progress.toFixed(2)}
    >
      <span className="hold-to-remove__fill" aria-hidden />
      <span className="hold-to-remove__label">{label}</span>
    </button>
  );
}
