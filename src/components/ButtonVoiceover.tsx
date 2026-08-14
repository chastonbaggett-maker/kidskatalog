"use client";

import { useEffect } from "react";
import { speakLabeledButtonFromEvent } from "@/lib/button-voiceover";

/**
 * Reads visible button labels aloud on click with a fun energetic voice.
 * Icon-only controls (no text label) stay silent.
 */
export function ButtonVoiceover() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Only primary clicks — ignore modified / non-left.
      if (event.button !== 0) return;
      speakLabeledButtonFromEvent(event);
    };

    // Capture so we hear the label even if a handler stops bubbling.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
