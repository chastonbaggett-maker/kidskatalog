"use client";

import { useEffect } from "react";
import {
  speakLabeledButtonFromEvent,
  warmButtonVoiceover,
} from "@/lib/button-voiceover";

/**
 * Reads visible button labels aloud on click with a fun energetic voice.
 * Icon-only controls (no text label) stay silent.
 */
export function ButtonVoiceover() {
  useEffect(() => {
    warmButtonVoiceover();

    const onPointerDown = () => {
      // Unlock TTS on the first real gesture (needed on some mobile browsers).
      warmButtonVoiceover();
      try {
        window.speechSynthesis?.resume();
      } catch {
        /* ignore */
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      speakLabeledButtonFromEvent(event);
    };

    document.addEventListener("pointerdown", onPointerDown, {
      capture: true,
      passive: true,
    });
    // Capture so we hear the label even if a handler stops bubbling.
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
