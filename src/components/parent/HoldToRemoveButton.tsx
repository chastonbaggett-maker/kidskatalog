"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** Keep in sync with `--hold-duration` in globals.css */
const HOLD_MS = 2000;

type Props = {
  label: string;
  ariaLabel: string;
  onComplete: () => void;
  className?: string;
};

/**
 * Hold exactly 2s to confirm. Lavender fills with purple-deep; release cancels.
 * Wall-clock timeout starts with the CSS fill so both finish together at 2s.
 */
export function HoldToRemoveButton({
  label,
  ariaLabel,
  onComplete,
  className = "",
}: Props) {
  const [progress, setProgress] = useState(0);
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stopHold = useCallback(
    (completed: boolean) => {
      clearTimer();
      setArmed(false);
      if (!completed) {
        setProgress(0);
        doneRef.current = false;
      }
    },
    [clearTimer],
  );

  const startHold = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button != null && event.button !== 0) return;
      if (doneRef.current) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      clearTimer();
      doneRef.current = false;
      setArmed(true);
      setProgress(0);

      // Two frames: paint progress=0 with is-holding, then animate to 1 over 2s.
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setProgress(1);
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            if (doneRef.current) return;
            doneRef.current = true;
            setArmed(false);
            onCompleteRef.current();
          }, HOLD_MS);
        });
      });
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  return (
    <button
      type="button"
      className={`hold-to-remove ${armed ? "is-holding" : ""} ${className}`.trim()}
      aria-label={ariaLabel}
      title="Hold for 2s to remove"
      onPointerDown={startHold}
      onPointerUp={() => stopHold(doneRef.current)}
      onPointerCancel={() => stopHold(false)}
      onLostPointerCapture={() => {
        if (!doneRef.current) stopHold(false);
      }}
      onContextMenu={(e) => e.preventDefault()}
      style={
        {
          "--hold-progress": String(progress),
          "--hold-duration": `${HOLD_MS}ms`,
        } as CSSProperties
      }
      data-testid="hold-to-remove"
      data-hold-ms={HOLD_MS}
      data-hold-progress={progress.toFixed(2)}
    >
      <span className="hold-to-remove__fill" aria-hidden />
      <span className="hold-to-remove__copy">
        <span className="hold-to-remove__label">{label}</span>
        <span className="hold-to-remove__hint">hold for 2s</span>
      </span>
      <span className="hold-to-remove__copy hold-to-remove__copy--on-fill" aria-hidden>
        <span className="hold-to-remove__label">{label}</span>
        <span className="hold-to-remove__hint">hold for 2s</span>
      </span>
    </button>
  );
}
