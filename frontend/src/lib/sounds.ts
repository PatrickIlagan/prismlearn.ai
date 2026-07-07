/** Dopamine feedback + TTS helpers. All no-ops during SSR. */

let audioCtx: AudioContext | null = null;

/** Soft two-tone "ding" played when the student passes a step. */
export function playDing() {
  if (typeof window === "undefined") return;
  try {
    audioCtx ??= new AudioContext();
    const now = audioCtx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      const t = now + i * 0.09;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {
    // Audio is a nice-to-have; never let it break the chat flow.
  }
}

interface SpeakCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
}

/** Native Web Speech API TTS (PRD Doc 2 §3.3). */
export function speak(text: string, { onStart, onEnd }: SpeakCallbacks = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 1.15;
  if (onStart) utterance.onstart = onStart;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
