let context: AudioContext | null = null;
let unlocked = false;

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const browserWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? browserWindow.webkitAudioContext ?? null;
}

export function unlockAudio(): boolean {
  const AudioCtor = getAudioContextConstructor();
  if (!AudioCtor) return false;
  try {
    if (!context) context = new AudioCtor();
    if (context.state === 'suspended') {
      void context.resume();
    }
    unlocked = true;
    return true;
  } catch {
    return false;
  }
}

export function isAudioUnlocked(): boolean {
  return unlocked && context !== null;
}

export type ChimeTone = 'notice' | 'critical' | 'done';

const TONES: Record<ChimeTone, { frequencies: number[]; duration: number; gap: number }> = {
  notice: { frequencies: [880], duration: 0.16, gap: 0 },
  critical: { frequencies: [880, 1174.66], duration: 0.12, gap: 0.08 },
  done: { frequencies: [659.25, 880, 1046.5], duration: 0.14, gap: 0.06 },
};

export function playChime(tone: ChimeTone): void {
  if (!context || !unlocked) return;
  const spec = TONES[tone];
  try {
    const start = context.currentTime;
    spec.frequencies.forEach((frequency, index) => {
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const offset = index * (spec.duration + spec.gap);
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start + offset);
      gain.gain.linearRampToValueAtTime(0.16, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + spec.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + spec.duration + 0.02);
    });
  } catch {
    // Audio is best-effort; ignore failures (e.g. autoplay restrictions).
  }
}

export function resetAudioForTests(): void {
  context = null;
  unlocked = false;
}
