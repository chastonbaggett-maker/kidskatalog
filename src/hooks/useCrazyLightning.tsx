"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  CRAZY_CARD_FLASH_MS,
  CRAZY_SCREEN_FLASH_MS,
  nextCrazyIntervalMs,
} from "@/lib/crazy-mode-timing";
import { isKartEffectBlocked } from "@/lib/kart-effect-guard";

type ScreenFlash = {
  id: string;
  flashX: number;
  flashY: number;
};

const FLASH_MS = CRAZY_SCREEN_FLASH_MS;

function isOnscreen(rect: DOMRect) {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

function pickVisibleCrazyButton(
  refs: Array<RefObject<HTMLButtonElement | null> | null | undefined>,
) {
  let fallback: HTMLButtonElement | null = null;
  for (const ref of refs) {
    const button = ref?.current;
    if (!button) continue;
    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (!fallback) fallback = button;
    if (isOnscreen(rect)) return button;
  }
  return fallback;
}

export function useCrazyLightning() {
  const uid = useId();
  const [mounted, setMounted] = useState(false);
  const [flashes, setFlashes] = useState<ScreenFlash[]>([]);

  useEffect(() => setMounted(true), []);

  const flash = useCallback(
    (flashX: number, flashY: number) => {
      if (isKartEffectBlocked()) return;

      const stamp = Date.now();
      const entry: ScreenFlash = {
        id: `${uid}-${stamp}`,
        flashX,
        flashY,
      };

      // One flash at a time — stacking made crazy mode look manic.
      setFlashes([entry]);

      window.setTimeout(() => {
        setFlashes((prev) => prev.filter((f) => f.id !== entry.id));
      }, FLASH_MS + 40);
    },
    [uid],
  );

  const portal =
    mounted && flashes.length > 0
      ? createPortal(
          <div className="crazy-flash-layer" aria-hidden>
            {flashes.map((entry) => (
              <div
                key={entry.id}
                className="crazy-screen-flash"
                style={{
                  ["--flash-x" as string]: `${entry.flashX}px`,
                  ["--flash-y" as string]: `${entry.flashY}px`,
                }}
              />
            ))}
          </div>,
          document.body,
        )
      : null;

  return { flash, portal };
}

/**
 * Crazy mode = Randomize on a random 3–7s timer, with a flash from the Crazy button.
 */
export function useCrazyRandomizeLoop({
  active,
  buttonRefs,
  onRandomize,
  onButtonFlash,
}: {
  active: boolean;
  buttonRefs: Array<RefObject<HTMLButtonElement | null> | null | undefined>;
  onRandomize: () => void;
  onButtonFlash?: (active: boolean) => void;
}) {
  const { flash, portal } = useCrazyLightning();
  const onRandomizeRef = useRef(onRandomize);
  const onButtonFlashRef = useRef(onButtonFlash);
  const buttonRefsRef = useRef(buttonRefs);

  useEffect(() => {
    onRandomizeRef.current = onRandomize;
  }, [onRandomize]);

  useEffect(() => {
    onButtonFlashRef.current = onButtonFlash;
  }, [onButtonFlash]);

  useEffect(() => {
    buttonRefsRef.current = buttonRefs;
  }, [buttonRefs]);

  useEffect(() => {
    if (!active) {
      onButtonFlashRef.current?.(false);
      return;
    }

    let cancelled = false;
    let flashClearTimer: number | undefined;
    let scheduleTimer: number | undefined;

    const scheduleNext = () => {
      if (cancelled) return;
      scheduleTimer = window.setTimeout(run, nextCrazyIntervalMs());
    };

    const run = () => {
      if (cancelled) return;

      if (isKartEffectBlocked()) {
        scheduleNext();
        return;
      }

      onRandomizeRef.current();

      const button = pickVisibleCrazyButton(buttonRefsRef.current);
      if (button) {
        const rect = button.getBoundingClientRect();
        flash(rect.left + rect.width / 2, rect.top + rect.height / 2);
        onButtonFlashRef.current?.(true);
        if (flashClearTimer) window.clearTimeout(flashClearTimer);
        flashClearTimer = window.setTimeout(() => {
          onButtonFlashRef.current?.(false);
        }, CRAZY_CARD_FLASH_MS);
      }

      scheduleNext();
    };

    scheduleNext();

    return () => {
      cancelled = true;
      if (scheduleTimer) window.clearTimeout(scheduleTimer);
      if (flashClearTimer) window.clearTimeout(flashClearTimer);
      onButtonFlashRef.current?.(false);
    };
  }, [active, flash]);

  return { portal };
}
