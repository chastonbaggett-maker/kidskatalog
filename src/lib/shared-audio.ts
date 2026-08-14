/** Shared Web Audio context — one unlock covers melody + confetti SFX. */

let ctx: AudioContext | null = null;

function AudioCtxCtor(): (typeof AudioContext) | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ||
    null
  );
}

export function getSharedAudioContext(): AudioContext | null {
  const AC = AudioCtxCtor();
  if (!AC) return null;
  if (!ctx || ctx.state === "closed") {
    ctx = new AC();
  }
  return ctx;
}

/**
 * Unlock audio inside a user gesture (critical on iOS Safari).
 * Plays a tiny silent buffer and kicks resume without awaiting.
 */
export function unlockSharedAudio(): AudioContext | null {
  const audio = getSharedAudioContext();
  if (!audio) return null;

  try {
    if (audio.state === "suspended") {
      void audio.resume();
    }
    // iOS often needs an audible graph kick during the gesture.
    const buffer = audio.createBuffer(1, 1, audio.sampleRate);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.start(0);
  } catch {
    /* ignore */
  }

  return audio;
}

export function resumeSharedAudio(): Promise<void> {
  const audio = getSharedAudioContext();
  if (!audio) return Promise.resolve();
  if (audio.state === "suspended") return audio.resume().then(() => undefined);
  return Promise.resolve();
}
