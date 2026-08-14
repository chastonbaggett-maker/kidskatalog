/** Fun, energetic read-aloud for labeled button taps (Web Speech API). */

const SPEAK_RATE = 1.2;
const SPEAK_PITCH = 1.35;

let preferredVoice: SpeechSynthesisVoice | null | undefined;
let warmed = false;

function refreshPreferredVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  preferredVoice = undefined;
  pickEnergeticVoice(window.speechSynthesis.getVoices());
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
  // Prime the engine — some browsers keep TTS paused until resumed.
  try {
    synth.resume();
  } catch {
    /* ignore */
  }
}

/** Prefer upbeat English voices when the browser exposes them. */
function pickEnergeticVoice(voices: SpeechSynthesisVoice[]) {
  if (preferredVoice !== undefined) return preferredVoice;

  const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  const pool = en.length > 0 ? en : voices;

  const ranked = [
    /google us english/i,
    /samantha/i,
    /karen/i,
    /moira/i,
    /tessa/i,
    /fiona/i,
    /veena/i,
    /zira/i,
    /aria/i,
    /jenny/i,
    /female/i,
  ];

  for (const re of ranked) {
    const hit = pool.find((v) => re.test(v.name));
    if (hit) {
      preferredVoice = hit;
      return hit;
    }
  }

  preferredVoice = pool[0] ?? null;
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

  const synth = window.speechSynthesis;
  warmButtonVoiceover();

  const voices = synth.getVoices();
  const voice = pickEnergeticVoice(voices);

  // Cancel any in-flight line, then speak in the same turn as the gesture.
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

  // Chrome occasionally parks the queue in a paused state.
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
