import { duckSiteMusic } from "@/lib/site-music-bridge";
import { useSiteMusicStore } from "@/lib/site-music-store";

type SpeakableToy = {
  id: string;
  name: string;
  blurb: string;
};

let activeToyId: string | null = null;
let preferredVoice: SpeechSynthesisVoice | null = null;
let speakTimer: number | null = null;

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en(-|_)/i.test(v.lang));
  const pool = en.length ? en : voices;
  const ranked = [...pool].sort((a, b) => {
    const score = (v: SpeechSynthesisVoice) => {
      const n = v.name.toLowerCase();
      if (/child|kids|kid|jenny|samantha|karen|moira|fiona/.test(n)) return 0;
      if (/female|woman|girl/.test(n)) return 1;
      if (/natural|premium|enhanced|neural/.test(n)) return 2;
      return 3;
    };
    return score(a) - score(b);
  });
  return ranked[0] ?? null;
}

function ensureVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const load = () => {
    preferredVoice = pickVoice(window.speechSynthesis.getVoices());
  };
  load();
  window.speechSynthesis.addEventListener("voiceschanged", load, { once: true });
}

function clearSpeakTimer() {
  if (speakTimer != null) {
    window.clearTimeout(speakTimer);
    speakTimer = null;
  }
}

function clearDuckSoon() {
  window.setTimeout(() => {
    if (!window.speechSynthesis?.speaking && !window.speechSynthesis?.pending) {
      duckSiteMusic(false);
    }
  }, 150);
}

/** Stop any in-progress toy read-aloud. Pass toyId to only cancel that toy. */
export function cancelToySpeech(toyId?: string) {
  if (toyId && activeToyId && activeToyId !== toyId) return;
  clearSpeakTimer();
  activeToyId = null;
  if (typeof window === "undefined" || !window.speechSynthesis) {
    duckSiteMusic(false);
    return;
  }
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  duckSiteMusic(false);
}

/**
 * Read the toy name + blurb when site audio is enabled.
 * Call from a click/tap handler when possible (autoplay / speech policies).
 */
export function speakToyDescription(toy: SpeakableToy): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  if (!useSiteMusicStore.getState().enabled) return false;

  const text = `${toy.name}. ${toy.blurb}`.replace(/\s+/g, " ").trim();
  if (!text) return false;

  // Same toy already queued/speaking (card click + detail mount).
  if (
    activeToyId === toy.id &&
    (window.speechSynthesis.speaking ||
      window.speechSynthesis.pending ||
      speakTimer != null)
  ) {
    return true;
  }

  ensureVoices();
  clearSpeakTimer();

  const synth = window.speechSynthesis;
  const wasBusy = synth.speaking || synth.pending;
  try {
    synth.resume();
  } catch {
    /* ignore */
  }
  if (wasBusy) {
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
  }

  activeToyId = toy.id;
  duckSiteMusic(true);

  const run = () => {
    speakTimer = null;
    if (activeToyId !== toy.id) return;
    if (!useSiteMusicStore.getState().enabled) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.98;
    utter.pitch = 1.06;
    utter.volume = 1;
    if (preferredVoice) utter.voice = preferredVoice;
    else utter.lang = "en-US";

    utter.onend = () => {
      if (activeToyId === toy.id) activeToyId = null;
      clearDuckSoon();
    };
    utter.onerror = () => {
      if (activeToyId === toy.id) activeToyId = null;
      duckSiteMusic(false);
    };

    try {
      synth.speak(utter);
      if (synth.paused) synth.resume();
    } catch {
      activeToyId = null;
      duckSiteMusic(false);
    }
  };

  // Speak inside the tap when possible. Only delay after cancel (Chrome drop bug).
  if (wasBusy) {
    speakTimer = window.setTimeout(run, 60);
  } else {
    run();
  }
  return true;
}
