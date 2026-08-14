/**
 * Click tones + ambient pad: each UI tap plays a one-shot note.
 * A soft background pad runs under the taps — no looping phrase of click notes.
 */

import {
  getSharedAudioContext,
  unlockSharedAudio,
} from "@/lib/shared-audio";

const LIVE_LEVEL = 0.2;
const MASTER_LEVEL = 0.55;
const PAD_LEVEL = 0.052;

/** Soft C major pentatonic walk — playful, not dissonant. */
const SCALE = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99,
] as const;

/** Melodic contour indices into SCALE (up, skip, down). */
const PHRASE = [0, 2, 4, 5, 7, 5, 4, 2, 1, 3, 5, 6, 8, 6, 4, 3, 2, 0] as const;

/** Warm C-major pad voicing under the tap tones. */
const PAD_PARTIALS = [
  { freq: 130.81, type: "sine" as const, amp: 0.55 },
  { freq: 196.0, type: "sine" as const, amp: 0.38 },
  { freq: 261.63, type: "triangle" as const, amp: 0.26 },
  { freq: 329.63, type: "sine" as const, amp: 0.2 },
  { freq: 392.0, type: "sine" as const, amp: 0.12 },
] as const;

type PadVoice = {
  osc: OscillatorNode;
  gain: GainNode;
};

export class ClickMelodyEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padGain: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private padLfo: OscillatorNode | null = null;
  private padLfoGain: GainNode | null = null;
  private padVoices: PadVoice[] = [];
  private phrasePos = 0;
  private muted = false;
  private unlocked = false;
  private onNote: ((info: { live: boolean; freq: number }) => void) | null =
    null;

  setOnNote(handler: ((info: { live: boolean; freq: number }) => void) | null) {
    this.onNote = handler;
  }

  get isUnlocked() {
    return this.unlocked;
  }

  /** Must run inside a user gesture on iOS — do not await before scheduling. */
  unlock(): boolean {
    const ctx = unlockSharedAudio();
    if (!ctx) return false;
    this.ctx = ctx;
    this.ensureMaster();
    this.unlocked = ctx.state === "running" || ctx.state === "suspended";
    if (ctx.state === "running" && !this.muted) this.ensurePad();
    // If still suspended, resume is in flight from unlockSharedAudio.
    void ctx.resume().then(() => {
      if (ctx.state === "running") {
        this.unlocked = true;
        if (!this.muted) this.ensurePad();
      }
    });
    return true;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, now, 0.05);
    if (muted) {
      this.fadePad(0, 0.18);
    } else {
      this.ensurePad();
      this.fadePad(PAD_LEVEL, 0.35);
    }
  }

  /** Play the next one-shot melody note (never echoed into a loop). */
  note() {
    if (this.muted) return false;
    // Sync unlock + schedule in the same gesture (iOS Safari).
    if (!this.unlock() || !this.ctx || !this.master) return false;

    const degree = PHRASE[this.phrasePos % PHRASE.length]!;
    this.phrasePos += 1;
    const freq = SCALE[degree]!;

    this.pluck(this.ctx.currentTime, freq, LIVE_LEVEL);
    this.onNote?.({ live: true, freq });
    return true;
  }

  dispose() {
    this.stopPad();
    if (this.master) {
      try {
        this.master.disconnect();
      } catch {
        /* ignore */
      }
    }
    // Keep the shared AudioContext alive for confetti SFX.
    this.master = null;
    this.ctx = null;
    this.unlocked = false;
  }

  private ensureMaster() {
    const ctx = this.ctx ?? getSharedAudioContext();
    if (!ctx) return;
    this.ctx = ctx;
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_LEVEL;
      this.master.connect(ctx.destination);
    }
  }

  private ensurePad() {
    if (!this.ctx || !this.master || this.muted) return;
    if (this.padVoices.length > 0 && this.padGain) {
      this.fadePad(PAD_LEVEL, 0.25);
      return;
    }

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.exponentialRampToValueAtTime(PAD_LEVEL, now + 0.9);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(720, now);
    filter.Q.value = 0.55;

    // Slow breath on the filter so the pad feels alive without sounding looped.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.07, now);
    lfoGain.gain.setValueAtTime(180, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);

    const voices: PadVoice[] = PAD_PARTIALS.map((partial, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = partial.type;
      // Tiny detune spreads the bed without beating harshly.
      osc.frequency.setValueAtTime(partial.freq, now);
      osc.detune.setValueAtTime((i % 2 === 0 ? -1 : 1) * (4 + i), now);
      gain.gain.setValueAtTime(partial.amp, now);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      return { osc, gain };
    });

    filter.connect(padGain);
    padGain.connect(this.master);

    this.padGain = padGain;
    this.padFilter = filter;
    this.padLfo = lfo;
    this.padLfoGain = lfoGain;
    this.padVoices = voices;
  }

  private fadePad(level: number, seconds: number) {
    if (!this.padGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const target = Math.max(0.0001, level);
    this.padGain.gain.cancelScheduledValues(now);
    this.padGain.gain.setValueAtTime(
      Math.max(0.0001, this.padGain.gain.value),
      now,
    );
    this.padGain.gain.exponentialRampToValueAtTime(target, now + seconds);
    if (level <= 0) {
      window.setTimeout(() => {
        if (this.muted) this.stopPad();
      }, seconds * 1000 + 40);
    }
  }

  private stopPad() {
    const now = this.ctx?.currentTime ?? 0;
    for (const voice of this.padVoices) {
      try {
        voice.osc.stop(now + 0.02);
        voice.osc.disconnect();
        voice.gain.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.padVoices = [];

    if (this.padLfo) {
      try {
        this.padLfo.stop(now + 0.02);
        this.padLfo.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.padLfo = null;

    if (this.padLfoGain) {
      try {
        this.padLfoGain.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.padLfoGain = null;

    if (this.padFilter) {
      try {
        this.padFilter.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.padFilter = null;

    if (this.padGain) {
      try {
        this.padGain.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.padGain = null;
  }

  private pluck(when: number, freq: number, amp: number) {
    if (!this.ctx || !this.master || amp < 0.01) return;
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime + 0.005);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.985, t + 0.28);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800 + freq * 0.8, t);
    filter.Q.value = 0.8;

    const peak = Math.min(0.4, amp);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start(t);
    osc.stop(t + 0.65);
    osc.onended = () => {
      try {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        /* ignore */
      }
    };
  }
}
