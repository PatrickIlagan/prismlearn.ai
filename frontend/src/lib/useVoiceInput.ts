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
  // Keep the latest callbacks in refs so the recognition handlers (set up
  // once, in `start`) always call the current closure, not a stale one.
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
    silenceTimerRef.current = setTimeout(() => recognitionRef.current?.stop(), silenceMs);
  }, [clearSilenceTimer, silenceMs]);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setPermissionDenied(false);

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      onTranscriptRef.current(text.trim());
      armSilenceTimer();
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setPermissionDenied(true);
      }
      clearSilenceTimer();
      setListening(false);
    };
    recognition.onend = () => {
      clearSilenceTimer();
      setListening(false);
      onStopRef.current();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    armSilenceTimer();
  }, [armSilenceTimer, clearSilenceTimer]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // Stop listening (and don't leak a pending timer) if the component unmounts mid-turn.
  useEffect(
    () => () => {
      clearSilenceTimer();
      recognitionRef.current?.stop();
    },
    [clearSilenceTimer],
  );

  return { listening, supported, permissionDenied, toggle };
}
