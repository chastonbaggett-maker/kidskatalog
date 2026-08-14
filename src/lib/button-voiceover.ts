/** Fun, energetic read-aloud for labeled button taps (Web Speech API). */

const SPEAK_RATE = 1.22;
const SPEAK_PITCH = 1.38;

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;
let preferredVoice: SpeechSynthesisVoice | null | undefined;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      const synth = window.speechSynthesis;
      const current = synth.getVoices();
      if (current.length > 0) {
        resolve(current);
        return;
      }
      const onVoices = () => {
        synth.removeEventListener("voiceschanged", onVoices);
        resolve(synth.getVoices());
      };
      synth.addEventListener("voiceschanged", onVoices);
      // Some browsers never fire voiceschanged if the list is already empty.
      window.setTimeout(() => resolve(synth.getVoices()), 600);
    });
  }

  return voicesReady;
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

export async function speakButtonLabel(label: string) {
  const text = label.trim();
  if (!text) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const synth = window.speechSynthesis;
  const voices = await loadVoices();
  const voice = pickEnergeticVoice(voices);

  synth.cancel();
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
      // Some environments expose voice list entries that aren't assignable.
      preferredVoice = null;
    }
  }

  synth.speak(utter);
}

export function speakLabeledButtonFromEvent(event: Event) {
  const btn = findLabeledButton(event.target);
  if (!btn) return;
  const label = getVisibleButtonLabel(btn);
  if (!label) return;
  void speakButtonLabel(label);
}
