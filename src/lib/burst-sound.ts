import { useClickMelodyStore } from "@/lib/click-melody-store";
import { unlockSharedAudio } from "@/lib/shared-audio";

function noiseBuffer(audio: AudioContext, seconds: number) {
  const len = Math.floor(audio.sampleRate * seconds);
  const buffer = audio.createBuffer(1, len, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    const env = 1 - i / len;
    data[i] = (Math.random() * 2 - 1) * env;
  }
  return buffer;
}

/**
 * Short celebratory pop for confetti bursts.
 * Call directly from a click/tap handler (not after await/rAF) on iOS.
 */
export function playConfettiBurstSound() {
  if (typeof window === "undefined") return;
  if (!useClickMelodyStore.getState().enabled) return;

  const audio = unlockSharedAudio();
  if (!audio) return;

  const schedule = () => {
    const now = audio.currentTime;
    const master = audio.createGain();
    master.gain.value = 0.55;
    master.connect(audio.destination);

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
  };

  // Schedule immediately in the gesture; also after resume settles.
  try {
    schedule();
  } catch {
    void audio.resume().then(schedule).catch(() => undefined);
  }
}
