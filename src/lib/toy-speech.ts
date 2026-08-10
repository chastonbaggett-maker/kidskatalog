import { duckSiteMusic } from "@/lib/site-music-bridge";
import { useSiteMusicStore } from "@/lib/site-music-store";

type SpeakableToy = {
  id: string;
  name: string;
  blurb: string;
};

let activeToyId: string | null = null;
let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en(-|_)/i.test(v.lang));
  const pool = en.length ? en : voices;
  // Prefer softer / kid-friendlier sounding voices when the browser labels them.
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
    voicesReady = true;
  };
  load();
  if (!voicesReady || !preferredVoice) {
    window.speechSynthesis.addEventListener("voiceschanged", load, { once: true });
  }
}

function clearDuckSoon() {
  window.setTimeout(() => {
    if (!window.speechSynthesis?.speaking) duckSiteMusic(false);
  }, 120);
}

/** Stop any in-progress toy read-aloud. Pass toyId to only cancel that toy. */
export function cancelToySpeech(toyId?: string) {
  if (toyId && activeToyId && activeToyId !== toyId) return;
  activeToyId = null;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  duckSiteMusic(false);
}

/** Read the toy name + blurb when site audio is enabled. */
export function speakToyDescription(toy: SpeakableToy): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  if (!useSiteMusicStore.getState().enabled) return false;

  const text = `${toy.name}. ${toy.blurb}`.replace(/\s+/g, " ").trim();
  if (!text) return false;

  // Same toy already speaking (card click + detail mount) — keep one utterance.
  if (
    activeToyId === toy.id &&
    (window.speechSynthesis.speaking || window.speechSynthesis.pending)
  ) {
    return true;
  }

  ensureVoices();
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.96;
  utter.pitch = 1.08;
  utter.volume = 1;
  if (preferredVoice) utter.voice = preferredVoice;

  activeToyId = toy.id;
  duckSiteMusic(true);

  utter.onend = () => {
    if (activeToyId === toy.id) activeToyId = null;
    clearDuckSoon();
  };
  utter.onerror = () => {
    if (activeToyId === toy.id) activeToyId = null;
    duckSiteMusic(false);
  };

  window.speechSynthesis.speak(utter);
  return true;
}

export function isSpeakingToy(toyId: string) {
  return (
    activeToyId === toyId &&
    typeof window !== "undefined" &&
    !!window.speechSynthesis &&
    (window.speechSynthesis.speaking || window.speechSynthesis.pending)
  );
}
