/**
 * Gentle, playful looping bed music via Web Audio (no media files).
 * Soft xylophone-like plinks over a quiet pad — kid-friendly, low volume.
 */

const MASTER_LEVEL = 0.085;
const DUCKED_LEVEL = 0.018;
const FADE_IN_S = 2.2;
const FADE_OUT_S = 0.55;
const LOOP_S = 12;

/** C major pentatonic (Hz): C4 D4 E4 G4 A4 C5 */
const NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25] as const;

type Hit = { t: number; n: number; soft?: boolean };

/** Sparse, bouncy little phrases — not busy. */
const HITS: Hit[] = [
  { t: 0.0, n: 0 },
  { t: 0.85, n: 2 },
  { t: 1.55, n: 4 },
  { t: 2.4, n: 3, soft: true },
  { t: 3.5, n: 1 },
  { t: 4.2, n: 3 },
  { t: 5.1, n: 5, soft: true },
  { t: 6.0, n: 4 },
  { t: 6.9, n: 2 },
  { t: 7.8, n: 0, soft: true },
  { t: 9.0, n: 3 },
  { t: 9.7, n: 4 },
  { t: 10.5, n: 2, soft: true },
];

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export class SiteMusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padGain: GainNode | null = null;
  private padOscs: OscillatorNode[] = [];
  private scheduleTimer: number | null = null;
  private nextLoopAt = 0;
  private running = false;
  private muted = false;
  private ducked = false;
  private unlocked = false;

  get isRunning() {
    return this.running;
  }

  get isUnlocked() {
    return this.unlocked;
  }

  /** Call from a user gesture so browsers allow audio. */
  async unlock(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    try {
      if (ctx.state === "suspended") await ctx.resume();
      this.unlocked = ctx.state === "running";
      return this.unlocked;
    } catch {
      return false;
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyGain(muted || !this.running ? 0 : undefined, 0.04);
  }

  /** Soften bed music while a toy description is spoken. */
  setDucked(ducked: boolean) {
    this.ducked = ducked;
    if (this.muted || !this.running) return;
    this.applyGain(undefined, ducked ? 0.05 : 0.12);
  }

  private targetLevel() {
    if (this.muted || !this.running) return 0;
    return this.ducked ? DUCKED_LEVEL : MASTER_LEVEL;
  }

  private applyGain(explicit?: number, timeConstant = 0.08) {
    const master = this.master;
    const ctx = this.ctx;
    if (!master || !ctx) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(
      explicit ?? this.targetLevel(),
      now,
      timeConstant,
    );
  }

  async start() {
    if (this.running) {
      this.applyGain(undefined, 0.08);
      return;
    }
    const ok = await this.unlock();
    if (!ok) return;

    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;

    this.running = true;
    this.startPad(ctx);
    this.nextLoopAt = ctx.currentTime + 0.05;
    this.scheduleAhead();
    this.armScheduler();

    const now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(0.0001, now);
    if (!this.muted) {
      this.master.gain.exponentialRampToValueAtTime(
        this.targetLevel() || MASTER_LEVEL,
        now + FADE_IN_S,
      );
    }
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this.clearScheduler();

    const ctx = this.ctx;
    const master = this.master;
    if (ctx && master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0.0001, now, FADE_OUT_S / 3);
    }

    window.setTimeout(() => this.teardownPad(), FADE_OUT_S * 1000 + 50);
  }

  dispose() {
    this.stop();
    this.clearScheduler();
    this.teardownPad();
    try {
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.master = null;
    this.unlocked = false;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;

    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private armScheduler() {
    this.clearScheduler();
    this.scheduleTimer = window.setInterval(() => {
      if (this.running) this.scheduleAhead();
    }, 500);
  }

  private clearScheduler() {
    if (this.scheduleTimer != null) {
      window.clearInterval(this.scheduleTimer);
      this.scheduleTimer = null;
    }
  }

  private scheduleAhead() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;

    const horizon = ctx.currentTime + 1.6;
    while (this.nextLoopAt < horizon) {
      const base = this.nextLoopAt;
      for (const hit of HITS) {
        this.pluck(ctx, base + hit.t, NOTES[hit.n]!, hit.soft ? 0.55 : 1);
      }
      // Soft fifth under the phrase start
      this.pluck(ctx, base + 0.02, NOTES[0]! / 2, 0.35);
      this.pluck(ctx, base + 6.05, NOTES[3]! / 2, 0.28);
      this.nextLoopAt += LOOP_S;
    }
  }

  private pluck(ctx: AudioContext, when: number, freq: number, strength = 1) {
    if (!this.master) return;
    const t = Math.max(when, ctx.currentTime + 0.01);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    // Tiny pitch droop for toy-xylophone character
    osc.frequency.exponentialRampToValueAtTime(freq * 0.985, t + 0.35);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800 + freq * 0.6, t);
    filter.Q.value = 0.7;

    const peak = clamp01(0.22 * strength);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start(t);
    osc.stop(t + 1.0);
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

  private startPad(ctx: AudioContext) {
    this.teardownPad();
    if (!this.master) return;

    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.045;
    this.padGain.connect(this.master);

    const freqs = [NOTES[0]! / 2, NOTES[3]! / 2, NOTES[0]!];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = f > 200 ? 0.35 : 0.55;
      osc.connect(g);
      g.connect(this.padGain);
      osc.start();
      this.padOscs.push(osc);
    }
  }

  private teardownPad() {
    for (const osc of this.padOscs) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.padOscs = [];
    if (this.padGain) {
      try {
        this.padGain.disconnect();
      } catch {
        /* ignore */
      }
      this.padGain = null;
    }
  }
}
