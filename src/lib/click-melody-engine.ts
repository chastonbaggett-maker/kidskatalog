/**
 * Click tones over looping background music from the track catalog.
 * Each UI tap plays a one-shot note; the selected bed track loops underneath.
 */

import {
  getSharedAudioContext,
  unlockSharedAudio,
} from "@/lib/shared-audio";
import {
  DEFAULT_MUSIC_TRACK_ID,
  getMusicTrack,
  type MusicTrack,
} from "@/lib/music-tracks";

const LIVE_LEVEL = 0.2;
const MASTER_LEVEL = 0.55;
/** Bed sits under tap plucks — audible but not overpowering. */
const BED_LEVEL = 0.28;

/** Soft C major pentatonic walk — playful, not dissonant. */
const SCALE = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99,
] as const;

/** Melodic contour indices into SCALE (up, skip, down). */
const PHRASE = [0, 2, 4, 5, 7, 5, 4, 2, 1, 3, 5, 6, 8, 6, 4, 3, 2, 0] as const;

export class ClickMelodyEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bedGain: GainNode | null = null;
  private bedSource: AudioBufferSourceNode | null = null;
  private bedBuffers = new Map<string, AudioBuffer>();
  private bedLoads = new Map<string, Promise<AudioBuffer | null>>();
  private trackId = DEFAULT_MUSIC_TRACK_ID;
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

  get currentTrack(): MusicTrack {
    return getMusicTrack(this.trackId);
  }

  /** Must run inside a user gesture on iOS — do not await before scheduling. */
  unlock(): boolean {
    const ctx = unlockSharedAudio();
    if (!ctx) return false;
    this.ctx = ctx;
    this.ensureMaster();
    this.unlocked = ctx.state === "running" || ctx.state === "suspended";
    if (ctx.state === "running" && !this.muted) this.ensureBed();
    void ctx.resume().then(() => {
      if (ctx.state === "running") {
        this.unlocked = true;
        if (!this.muted) this.ensureBed();
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
      this.fadeBed(0, 0.2);
    } else {
      this.ensureBed();
      this.fadeBed(BED_LEVEL, 0.4);
    }
  }

  /** Switch looping bed track (crossfades by stop + soft fade-in). */
  setTrack(trackId: string) {
    const next = getMusicTrack(trackId).id;
    if (next === this.trackId && this.bedSource) return;
    this.trackId = next;
    this.stopBedSourceOnly();
    if (!this.muted) this.ensureBed();
  }

  /** Play the next one-shot melody note (never echoed into a click loop). */
  note() {
    if (this.muted) return false;
    if (!this.unlock() || !this.ctx || !this.master) return false;

    const degree = PHRASE[this.phrasePos % PHRASE.length]!;
    this.phrasePos += 1;
    const freq = SCALE[degree]!;

    this.pluck(this.ctx.currentTime, freq, LIVE_LEVEL);
    this.onNote?.({ live: true, freq });
    return true;
  }

  dispose() {
    this.stopBed();
    if (this.master) {
      try {
        this.master.disconnect();
      } catch {
        /* ignore */
      }
    }
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

  private ensureBed() {
    if (!this.ctx || !this.master || this.muted) return;
    if (this.bedSource && this.bedGain) {
      this.fadeBed(BED_LEVEL, 0.3);
      return;
    }
    void this.startBedWhenReady(this.trackId);
  }

  private async startBedWhenReady(trackId: string) {
    if (!this.ctx || !this.master || this.muted) return;
    if (this.bedSource) return;

    const track = getMusicTrack(trackId);
    const buffer = await this.loadBedBuffer(track);
    // Track may have changed while decoding.
    if (this.trackId !== track.id) return;
    if (!buffer || !this.ctx || !this.master || this.muted || this.bedSource) {
      return;
    }

    const now = this.ctx.currentTime;
    const bedGain = this.bedGain ?? this.ctx.createGain();
    if (!this.bedGain) {
      bedGain.gain.setValueAtTime(0.0001, now);
      bedGain.connect(this.master);
      this.bedGain = bedGain;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(bedGain);
    source.start(now);
    this.bedSource = source;
    source.onended = () => {
      if (this.bedSource === source) this.bedSource = null;
    };

    this.fadeBed(BED_LEVEL, 0.7);
  }

  private loadBedBuffer(track: MusicTrack): Promise<AudioBuffer | null> {
    const cached = this.bedBuffers.get(track.id);
    if (cached) return Promise.resolve(cached);

    const inflight = this.bedLoads.get(track.id);
    if (inflight) return inflight;

    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);

    const load = (async () => {
      try {
        const res = await fetch(track.url, { cache: "force-cache" });
        if (!res.ok) return null;
        const raw = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(raw.slice(0));
        this.bedBuffers.set(track.id, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.bedLoads.delete(track.id);
      }
    })();

    this.bedLoads.set(track.id, load);
    return load;
  }

  private fadeBed(level: number, seconds: number) {
    if (!this.bedGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const target = Math.max(0.0001, level);
    this.bedGain.gain.cancelScheduledValues(now);
    this.bedGain.gain.setValueAtTime(
      Math.max(0.0001, this.bedGain.gain.value),
      now,
    );
    this.bedGain.gain.exponentialRampToValueAtTime(target, now + seconds);
  }

  private stopBedSourceOnly() {
    if (this.bedSource) {
      try {
        this.bedSource.onended = null;
        this.bedSource.stop();
        this.bedSource.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.bedSource = null;
  }

  private stopBed() {
    this.stopBedSourceOnly();
    if (this.bedGain) {
      try {
        this.bedGain.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.bedGain = null;
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
