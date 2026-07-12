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

/**
 * Pick the most natural-sounding English voice the platform offers. Modern OSes
 * ship neural/"Natural" voices (Windows: Aria/Jenny Online Natural; macOS/iOS:
 * Samantha; Chrome: Google US English) that are far less robotic than the default.
 * We rank by known-good names, then fall back to any en-US, then any English.
 */
const VOICE_PREFERENCES = [
  "natural", // Windows "Microsoft Aria Online (Natural)" etc.
  "aria",
  "jenny",
  "google us english",
  "samantha",
  "google uk english female",
];

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null; // not loaded yet
  if (cachedVoice && voices.includes(cachedVoice)) return cachedVoice;

  const byName = (needle: string) =>
    voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes(needle));

  cachedVoice =
    VOICE_PREFERENCES.map(byName).find(Boolean) ||
    voices.find((v) => v.lang === "en-US") ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0] ||
    null;
  return cachedVoice;
}

// Voices populate asynchronously in Chrome; refresh the cache when they
// arrive, and call getVoices() once eagerly — that first call is what kicks
// off Chrome's async load, so doing it at module load (not first speak())
// means voices are usually ready before Lumi's first reply.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
  pickVoice();
}

/** Native Web Speech API TTS with natural-voice selection (PRD Doc 2 §3.3). */
export function speak(text: string, { onStart, onEnd }: SpeakCallbacks = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  // Strip markdown/anchor noise and stray escaped newlines so narration flows.
  const spoken = text
    .replace(/\\n/g, " ")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const utterance = new SpeechSynthesisUtterance(spoken);
  // Natural cadence: default pitch, a touch slower than 1.0 reads as calmer.
  utterance.rate = 0.98;
  utterance.pitch = 1.0;
  if (onStart) utterance.onstart = onStart;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
    return;
  }

  // Chrome populates getVoices() asynchronously. When speak() fires before
  // that (instant replies — demo mode's mock tutor, cached reviewers), the
  // utterance would go out with the robotic platform-default voice, which is
  // why demo mode "sounded different." Wait briefly for voiceschanged and
  // speak with the natural voice; fall back to default only if voices truly
  // never arrive (some browsers never fire the event).
  let spoke = false;
  const speakNow = () => {
    if (spoke) return;
    spoke = true;
    const late = pickVoice();
    if (late) utterance.voice = late;
    window.speechSynthesis.speak(utterance);
  };
  window.speechSynthesis.addEventListener("voiceschanged", speakNow, { once: true });
  setTimeout(speakNow, 750);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
