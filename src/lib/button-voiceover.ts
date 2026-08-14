/** Natural read-aloud for labeled button taps (Web Speech API). */

import { useClickMelodyStore } from "@/lib/click-melody-store";

/** Near-normal cadence — slight lift without sounding rushed or cartoonish. */
const SPEAK_RATE = 1.02;
const SPEAK_PITCH = 1.02;

let preferredVoice: SpeechSynthesisVoice | null | undefined;
let warmed = false;

function audioIsMuted(): boolean {
  return !useClickMelodyStore.getState().enabled;
}

function refreshPreferredVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  preferredVoice = undefined;
  pickNaturalVoice(window.speechSynthesis.getVoices());
}

/**
 * Preload voices so click handlers can speak synchronously
 * (awaiting before speak() drops the user-gesture unlock in browsers).
 */
export function warmButtonVoiceover() {
  if (typeof window === "undefined" || !window.speechSynthesis || warmed) {
    return;
  }
  warmed = true;
  const synth = window.speechSynthesis;
  refreshPreferredVoice();
  synth.addEventListener("voiceschanged", refreshPreferredVoice);
  try {
    synth.resume();
  } catch {
    /* ignore */
  }
}

/** Stop any in-flight utterance (used when audio is muted). */
export function silenceButtonVoiceover() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

/**
 * Prefer smooth, natural English voices when the browser exposes them.
 * Neural / Natural / Premium engines first; avoid novelty or robotic picks.
 */
function pickNaturalVoice(voices: SpeechSynthesisVoice[]) {
  if (preferredVoice !== undefined) return preferredVoice;

  const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  const pool = en.length > 0 ? en : voices;

  const avoid =
    /robot|novelty|bahh|albert|bad news|good news|bells|boing|bubbles|cellos|organ|trinoids|whisper|zarvox|pipe organ/i;

  const ranked = [
    /neural/i,
    /natural/i,
    /premium/i,
    /enhanced/i,
    /google us english/i,
    /google uk english female/i,
    /microsoft (aria|jenny|guy|sara|sonia)/i,
    /samantha/i,
    /karen/i,
    /moira/i,
    /tessa/i,
    /fiona/i,
    /victoria/i,
    /daniel/i,
    /zira/i,
  ];

  for (const re of ranked) {
    const hit = pool.find((v) => re.test(v.name) && !avoid.test(v.name));
    if (hit) {
      preferredVoice = hit;
      return hit;
    }
  }

  const localNatural = pool.find(
    (v) =>
      !avoid.test(v.name) &&
      (v.localService || /english/i.test(v.name) || /^en/i.test(v.lang)),
  );
  preferredVoice = localNatural ?? pool.find((v) => !avoid.test(v.name)) ?? null;
  return preferredVoice;
}

/**
 * Visible text only — strips icons / aria-hidden nodes.
 * Empty string means "no text label" → caller should stay silent.
 */
export function getVisibleButtonLabel(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) {
    const fromValue = (el.value || el.getAttribute("value") || "").trim();
    if (fromValue) return fromValue.replace(/\s+/g, " ");
  }

  const clone = el.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(
      '[aria-hidden="true"], svg, img, picture, video, canvas, .sr-only, [data-voiceover-ignore]',
    )
    .forEach((node) => node.remove());

  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

export function findLabeledButton(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const btn = target.closest(
    'button, [role="button"], input[type="button"], input[type="submit"]',
  );
  if (!(btn instanceof HTMLElement)) return null;
  if (btn.hasAttribute("data-no-voiceover")) return null;
  if (btn instanceof HTMLButtonElement && btn.disabled) return null;
  if (btn.getAttribute("aria-disabled") === "true") return null;
  return btn;
}

/** Speak immediately — must stay synchronous with the click gesture. */
export function speakButtonLabel(label: string) {
  const text = label.trim();
  if (!text) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  // Match site music mute: when audio is off, voice-over stays silent too.
  if (audioIsMuted()) {
    silenceButtonVoiceover();
    return;
  }

  const synth = window.speechSynthesis;
  warmButtonVoiceover();

  const voices = synth.getVoices();
  const voice = pickNaturalVoice(voices);

  synth.cancel();
  try {
    synth.resume();
  } catch {
    /* ignore */
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = SPEAK_RATE;
  utter.pitch = SPEAK_PITCH;
  utter.volume = 1;
  utter.lang = "en-US";

  if (voice) {
    try {
      utter.voice = voice;
      if (voice.lang) utter.lang = voice.lang;
    } catch {
      preferredVoice = null;
    }
  }

  synth.speak(utter);

  if (synth.paused) {
    try {
      synth.resume();
    } catch {
      /* ignore */
    }
  }
}

export function speakLabeledButtonFromEvent(event: Event) {
  const btn = findLabeledButton(event.target);
  if (!btn) return;
  const label = getVisibleButtonLabel(btn);
  if (!label) return;
  speakButtonLabel(label);
}
