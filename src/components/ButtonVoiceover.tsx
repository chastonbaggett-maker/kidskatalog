"use client";

import { useEffect } from "react";
import {
  silenceButtonVoiceover,
  speakLabeledButtonFromEvent,
  warmButtonVoiceover,
} from "@/lib/button-voiceover";
import { useClickMelodyStore } from "@/lib/click-melody-store";

/**
 * Reads visible button labels aloud on click with a natural voice.
 * Icon-only controls stay silent. Respects the site music mute toggle.
 */
export function ButtonVoiceover() {
  const audioEnabled = useClickMelodyStore((s) => s.enabled);

  useEffect(() => {
    if (!audioEnabled) {
      silenceButtonVoiceover();
    }
  }, [audioEnabled]);

  useEffect(() => {
    warmButtonVoiceover();

    const onPointerDown = () => {
      // Unlock TTS on the first real gesture (needed on some mobile browsers).
      warmButtonVoiceover();
      if (!useClickMelodyStore.getState().enabled) return;
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
