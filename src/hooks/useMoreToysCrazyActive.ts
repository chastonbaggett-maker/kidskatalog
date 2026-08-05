"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useKartStore } from "@/lib/kart-store";
import { isKartEffectBlocked } from "@/lib/kart-effect-guard";

const SCROLL_ARM_PX = 48;
const ACTIVATE_DELAY_MS = 520;
const DEACTIVATE_DELAY_MS = 320;

/**
 * Arm crazy effects on toy pages only after the user scrolls into "More toys"
 * (scroll-based, with hysteresis — avoids IO flicker from layout shifts).
 */
export function useMoreToysCrazyActive(
  crazyMode: boolean,
  scrollerRef: RefObject<HTMLElement | null>,
  moreToysRef: RefObject<HTMLElement | null>,
) {
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!crazyMode) {
      activeRef.current = false;
      setActive(false);
      return;
    }

    const scroller = scrollerRef.current;
    const moreToys = moreToysRef.current;
    if (!scroller || !moreToys) return;

    let activateTimer: number | undefined;
    let deactivateTimer: number | undefined;
    let userScrolled = scroller.scrollTop > SCROLL_ARM_PX;

    const clearTimers = () => {
      if (activateTimer) window.clearTimeout(activateTimer);
      if (deactivateTimer) window.clearTimeout(deactivateTimer);
      activateTimer = deactivateTimer = undefined;
    };

    const setArmed = (next: boolean) => {
      if (activeRef.current === next) return;
      activeRef.current = next;
      setActive(next);
    };

    const evaluate = () => {
      if (isKartEffectBlocked()) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const moreRect = moreToys.getBoundingClientRect();
      const moreTopVisible = moreRect.top < scrollerRect.bottom - 56;
      const productMostlyClear =
        moreRect.top < scrollerRect.top + scrollerRect.height * 0.4;

      const shouldArm =
        userScrolled && moreTopVisible && productMostlyClear;

      if (shouldArm) {
        if (deactivateTimer) {
          window.clearTimeout(deactivateTimer);
          deactivateTimer = undefined;
        }
        if (activeRef.current || activateTimer) return;
        activateTimer = window.setTimeout(() => {
          activateTimer = undefined;
          setArmed(true);
        }, ACTIVATE_DELAY_MS);
        return;
      }

      if (activateTimer) {
        window.clearTimeout(activateTimer);
        activateTimer = undefined;
      }
      if (!activeRef.current || deactivateTimer) return;
      deactivateTimer = window.setTimeout(() => {
        deactivateTimer = undefined;
        setArmed(false);
      }, DEACTIVATE_DELAY_MS);
    };

    const onScroll = () => {
      if (scroller.scrollTop > SCROLL_ARM_PX) {
        userScrolled = true;
      }
      evaluate();
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    evaluate();

    return () => {
      clearTimers();
      scroller.removeEventListener("scroll", onScroll);
    };
  }, [crazyMode, scrollerRef, moreToysRef]);

  return active;
}
