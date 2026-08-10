/**
 * Click-driven melody: every UI tap plays a note and writes it into a soft
 * looping phrase. Loop voices decay each cycle so the bed never piles up.
 */

import {
  getSharedAudioContext,
  unlockSharedAudio,
} from "@/lib/shared-audio";

const STEPS = 16;
const BPM = 92;
const STEP_S = 60 / BPM / 2; // eighth notes
const LIVE_LEVEL = 0.2;
const LOOP_LEVEL = 0.11;
const DECAY_PER_LOOP = 0.68;
const MIN_AMP = 0.012;
const MASTER_LEVEL = 0.55;

/** Soft C major pentatonic walk — playful, not dissonant. */
const SCALE = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99,
] as const;

/** Melodic contour indices into SCALE (up, skip, down). */
const PHRASE = [0, 2, 4, 5, 7, 5, 4, 2, 1, 3, 5, 6, 8, 6, 4, 3, 2, 0] as const;

type LoopCell = {
  freq: number;
  amp: number;
};

export class ClickMelodyEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private steps: Array<LoopCell | null> = Array.from({ length: STEPS }, () => null);
  private writeHead = 0;
  private tickHead = 0;
  private phrasePos = 0;
  private timer: number | null = null;
  private nextTickAt = 0;
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
    if (ctx.state === "running") this.ensureClock();
    // If still suspended, resume is in flight from unlockSharedAudio.
    void ctx.resume().then(() => {
      if (ctx.state === "running") {
        this.unlocked = true;
        this.ensureClock();
      }
    });
    return true;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, now, 0.04);
  }

  /** Play the next melody note and stamp it into the decaying loop. */
  note() {
    if (this.muted) return false;
    // Sync unlock + schedule in the same gesture (iOS Safari).
    if (!this.unlock() || !this.ctx || !this.master) return false;

    const degree = PHRASE[this.phrasePos % PHRASE.length]!;
    this.phrasePos += 1;
    const freq = SCALE[degree]!;

    this.pluck(this.ctx.currentTime, freq, LIVE_LEVEL);
    this.onNote?.({ live: true, freq });

    this.steps[this.writeHead] = { freq, amp: LOOP_LEVEL };
    this.writeHead = (this.writeHead + 1) % STEPS;
    this.ensureClock();
    return true;
  }

  clearLoop() {
    this.steps = Array.from({ length: STEPS }, () => null);
  }

  dispose() {
    if (this.timer != null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
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
      this.nextTickAt = 0;
    }
  }

  private ensureClock() {
    if (this.timer != null || !this.ctx) return;
    this.nextTickAt = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.pump(), 40);
  }

  private pump() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;

    while (this.nextTickAt < ctx.currentTime + 0.12) {
      this.scheduleTick(this.nextTickAt);
      this.nextTickAt += STEP_S;
    }
  }

  private scheduleTick(when: number) {
    const cell = this.steps[this.tickHead];
    if (cell && cell.amp >= MIN_AMP) {
      this.pluck(when, cell.freq, cell.amp);
      this.onNote?.({ live: false, freq: cell.freq });
    }

    this.tickHead = (this.tickHead + 1) % STEPS;
    if (this.tickHead === 0) {
      this.decayLoop();
    }
  }

  private decayLoop() {
    for (let i = 0; i < this.steps.length; i += 1) {
      const cell = this.steps[i];
      if (!cell) continue;
      cell.amp *= DECAY_PER_LOOP;
      if (cell.amp < MIN_AMP) this.steps[i] = null;
    }
  }

  private pluck(when: number, freq: number, amp: number) {
    if (!this.ctx || !this.master || amp < MIN_AMP) return;
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
