"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Feature 2 — Voice-to-Voice mic input.
 *
 * Thin wrapper around the browser's native SpeechRecognition (Chrome/Edge) /
 * webkitSpeechRecognition (Safari) API — no server round trip, so it works
 * offline and costs nothing. `continuous + interimResults` streams words into
 * the caller as the student talks; a self-managed silence timer (the browser
 * API's own end-of-speech detection is inconsistent across engines) stops
 * listening ~1.2s after the last new word, which is what triggers auto-send.
 * Clicking the mic again stops it immediately, going through the same path.
 *
 * Chrome's `continuous: true` reduces but does NOT eliminate the engine's own
 * voice-activity detector ending a session early on a brief natural pause
 * between words (observed: cuts off after 2-3 words) — that's a premature
 * `onend`, distinct from OUR silence timer genuinely firing after 1.2s of
 * real silence. We distinguish the two with `intentionalStopRef`: only a
 * manual mic click or our own silence timer sets it before calling `.stop()`.
 * Any `onend` that fires WITHOUT that flag set is the engine's false stop —
 * we commit the transcript so far and silently start a fresh session,
 * carrying the accumulated text forward, so the listening indicator never
 * flickers and no words are lost.
 */

// Minimal ambient types — the Web Speech recognition API isn't in TS's DOM lib
// (only the speechSynthesis side is), and nothing else in the project declares
// these, so this is a safe (non-conflicting) global augmentation.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

interface UseVoiceInputOptions {
  /** Called with the running transcript on every result (final + interim). */
  onTranscript: (text: string) => void;
  /** Called when listening stops — either the student paused, or they clicked
   *  the mic again. Either way this is the "auto-send" trigger. */
  onStop: () => void;
  silenceMs?: number;
}

export function useVoiceInput({ onTranscript, onStop, silenceMs = 1200 }: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const supported = typeof window !== "undefined" && !!getRecognitionCtor();

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Text finalized across any PRIOR (auto-restarted) sessions this "listening"
  // run — the current session's own results are appended on top of this.
  const committedTextRef = useRef("");
  // The last combined (committed + current session) transcript reported —
  // becomes the new committedTextRef when a session restarts.
  const lastCombinedRef = useRef("");
  // True only when WE decided to stop (silence timer or manual click) — lets
  // onend tell a deliberate stop apart from the engine's own premature one.
  const intentionalStopRef = useRef(false);

  // Keep the latest callbacks in refs so the recognition handlers (set up
  // once per session, in `startSession`) always call the current closure.
  const onTranscriptRef = useRef(onTranscript);
  const onStopRef = useRef(onStop);
  onTranscriptRef.current = onTranscript;
  onStopRef.current = onStop;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      intentionalStopRef.current = true;
      recognitionRef.current?.stop();
    }, silenceMs);
  }, [clearSilenceTimer, silenceMs]);

  const startSession = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let sessionText = "";
      for (let i = 0; i < event.results.length; i++) sessionText += event.results[i][0].transcript;
      const combined = `${committedTextRef.current} ${sessionText}`.trim();
      lastCombinedRef.current = combined;
      onTranscriptRef.current(combined);
      armSilenceTimer();
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setPermissionDenied(true);
      }
      // no-speech / aborted etc. still fire onend right after — let that path
      // decide whether to restart or finish, so we don't double-handle here.
    };
    recognition.onend = () => {
      if (intentionalStopRef.current) {
        clearSilenceTimer();
        setListening(false);
        onStopRef.current();
        return;
      }
      // The engine stopped on its own (premature VAD cutoff, not real
      // silence) — carry the transcript forward into a brand-new session so
      // listening continues seamlessly with no words lost and no UI flicker.
      committedTextRef.current = lastCombinedRef.current;
      startSession();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [armSilenceTimer, clearSilenceTimer]);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setPermissionDenied(false);
    committedTextRef.current = "";
    lastCombinedRef.current = "";
    intentionalStopRef.current = false;
    setListening(true);
    startSession();
    armSilenceTimer();
  }, [armSilenceTimer, startSession]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    clearSilenceTimer();
    recognitionRef.current?.stop();
  }, [clearSilenceTimer]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // Stop listening (and don't leak a pending timer) if the component unmounts mid-turn.
  useEffect(
    () => () => {
      intentionalStopRef.current = true;
      clearSilenceTimer();
      recognitionRef.current?.stop();
    },
    [clearSilenceTimer],
  );

  return { listening, supported, permissionDenied, toggle };
}
