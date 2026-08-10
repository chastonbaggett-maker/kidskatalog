import { useClickMelodyStore } from "@/lib/click-melody-store";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!ctx || ctx.state === "closed") ctx = new AC();
  return ctx;
}

function noiseBuffer(audio: AudioContext, seconds: number) {
  const len = Math.floor(audio.sampleRate * seconds);
  const buffer = audio.createBuffer(1, len, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    // Soften the tail so the burst doesn't rasp.
    const env = 1 - i / len;
    data[i] = (Math.random() * 2 - 1) * env;
  }
  return buffer;
}

/** Short celebratory pop for confetti bursts. Respects tap-music mute. */
export function playConfettiBurstSound() {
  if (typeof window === "undefined") return;
  if (!useClickMelodyStore.getState().enabled) return;

  const audio = getCtx();
  if (!audio) return;

  void audio.resume().then(() => {
    const now = audio.currentTime;
    const master = audio.createGain();
    master.gain.value = 0.55;
    master.connect(audio.destination);

    // Airy noise bloom
    const noise = audio.createBufferSource();
    noise.buffer = noiseBuffer(audio, 0.28);
    const band = audio.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.9;
    band.frequency.setValueAtTime(420, now);
    band.frequency.exponentialRampToValueAtTime(2400, now + 0.16);
    const noiseGain = audio.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.55, now + 0.012);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(now);
    noise.stop(now + 0.3);

    // Sparkly tone sprinkles
    const tones = [523.25, 659.25, 783.99, 1046.5];
    tones.forEach((freq, i) => {
      const t = now + i * 0.028;
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.04, t + 0.08);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22 - i * 0.03, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  });
}
