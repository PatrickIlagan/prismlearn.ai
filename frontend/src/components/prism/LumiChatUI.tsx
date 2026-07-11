"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gamepad2, Send, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { sendTutorMessage } from "@/lib/api";
import { speak, stopSpeaking } from "@/lib/sounds";
import { useVoiceInput } from "@/lib/useVoiceInput";
import { MascotLumi } from "./MascotLumi";
import { RichMarkdown } from "./RichMarkdown";
import { StepProgressStepper } from "./StepProgressStepper";
import { XpBadge } from "./XpBadge";
import { cn } from "@/lib/utils";

export function LumiChatUI({ workspaceId }: { workspaceId: string }) {
  const messages = useWorkspaceStore((s) => s.messages);
  const isThinking = useWorkspaceStore((s) => s.isTutorThinking);
  const ttsEnabled = useWorkspaceStore((s) => s.ttsEnabled);
  const toggleTts = useWorkspaceStore((s) => s.toggleTts);
  const pushStudentMessage = useWorkspaceStore((s) => s.pushStudentMessage);
  const setTutorThinking = useWorkspaceStore((s) => s.setTutorThinking);
  const applyTutorResponse = useWorkspaceStore((s) => s.applyTutorResponse);
  const chapters = useWorkspaceStore((s) => s.chapters);
  const unlockedAnchors = useWorkspaceStore((s) => s.unlockedAnchors);
  const completedChapters = useWorkspaceStore((s) => s.completedChapters);
  const mutateBlockToGame = useWorkspaceStore((s) => s.mutateBlockToGame);

  const [input, setInput] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string | null>(null);
  // The text of the last turn that failed to get a reply — lets Retry resend
  // without re-adding a duplicate student bubble to the chat.
  const lastFailedRef = useRef<string | null>(null);
  // The transcript as of the most recent onresult — read directly by the
  // voice auto-send path instead of the `input` state closure, since a
  // same-tick onend right after the final onresult could otherwise fire
  // before React has flushed that last setInput (a stale-closure race).
  const transcriptRef = useRef("");

  // Auto-scroll chat to newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  // Speak the latest Lumi message when TTS is on.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!ttsEnabled || !last || last.role !== "lumi" || last.id === lastSpokenRef.current) return;
    lastSpokenRef.current = last.id;
    speak(last.text, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
  }, [messages, ttsEnabled]);

  // Fires the actual tutor request; used both for a fresh message and for
  // retrying a failed one (retry must NOT re-push the student bubble).
  async function requestTutorTurn(text: string) {
    // Snapshot the context right before the call: the reviewer, progress,
    // strike count, study mode, and prior turns (excluding this new message).
    const {
      ingest,
      step,
      strikeCount,
      studyMode,
      sessionMode,
      activeDocumentId,
      textComplexity,
      messages: prior,
    } = useWorkspaceStore.getState();

    if (!ingest) return; // reviewer not loaded yet

    const recentHistory = prior
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    setSendError(null);
    setTutorThinking(true);
    try {
      const res = await sendTutorMessage(workspaceId, text, {
        reviewer: ingest,
        currentStep: step.currentStep,
        totalSteps: step.totalSteps,
        strikeCount,
        studyFocus: studyMode,
        sessionMode,
        documentId: activeDocumentId ?? undefined,
        textComplexity,
        recentHistory,
      });
      applyTutorResponse(res);
      lastFailedRef.current = null;
    } catch (e) {
      setTutorThinking(false);
      lastFailedRef.current = text;
      setSendError(
        e instanceof Error ? e.message : "Lumi didn't respond — check your connection and try again.",
      );
    }
  }

  async function sendMessage(text: string) {
    if (!text || isThinking) return;
    setInput("");
    transcriptRef.current = "";
    pushStudentMessage(text);
    await requestTutorTurn(text);
  }

  function handleSend() {
    sendMessage(input.trim());
  }

  function retrySend() {
    if (lastFailedRef.current && !isThinking) requestTutorTurn(lastFailedRef.current);
  }

  // Manual practice trigger: normally a mini-game is Lumi's own call, spawned
  // mid-conversation once it judges you've engaged with a concept — there's
  // no other way to ask for one on demand. Targets the chapter you're
  // actively working through (the last unlocked one not yet mastered), or
  // the most recently unlocked chapter if everything so far is mastered.
  function practiceCurrentChapter() {
    const target =
      [...unlockedAnchors].reverse().find((a) => !completedChapters.includes(a)) ??
      unlockedAnchors[unlockedAnchors.length - 1];
    if (target) mutateBlockToGame(target, "cloze");
  }
  const canPractice = chapters.length > 0 && unlockedAnchors.length > 0;

  // Feature 2 — Voice-to-Voice: transcribe speech into the input live, and
  // auto-send once the student stops talking (or they click the mic again).
  const voice = useVoiceInput({
    onTranscript: (text) => {
      transcriptRef.current = text;
      setInput(text);
    },
    onStop: () => {
      const text = transcriptRef.current.trim();
      if (text) sendMessage(text);
    },
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header: mascot + TTS toggle */}
      <div className="flex items-center justify-between border-b border-white/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <MascotLumi size={38} speaking={speaking} />
          <div>
            <p className="text-sm font-semibold leading-tight">Lumi</p>
            <p className="text-xs text-muted-foreground">Your AI tutor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <XpBadge />
          {canPractice && (
            <button
              onClick={practiceCurrentChapter}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Practice this chapter with a mini-game"
              title="Practice this chapter with a mini-game"
            >
              <Gamepad2 size={18} />
            </button>
          )}
          <button
            onClick={() => {
              if (ttsEnabled) {
                stopSpeaking();
                setSpeaking(false);
              }
              toggleTts();
            }}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={ttsEnabled ? "Disable text-to-speech" : "Enable text-to-speech"}
          >
            {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      <StepProgressStepper />

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-base text-muted-foreground">
            Say hello to Lumi to begin your guided lesson.
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 24 }}
              animate={
                m.verdict === "incorrect"
                  ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }
                  : { opacity: 1, y: 0 }
              }
              // The shake (x) is a multi-keyframe array — a spring only supports two
              // keyframes and THROWS, so give x its own tween while y/opacity spring.
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 22,
                x: { type: "tween", duration: 0.4, ease: "easeInOut" },
              }}
              className={cn("flex", m.role === "student" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-base shadow-sm",
                  m.role === "student"
                    ? "whitespace-pre-line rounded-br-md bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-violet-500/20"
                    : "rounded-bl-md border border-white/50 bg-white/40 text-foreground backdrop-blur-md",
                  m.verdict === "correct" && "ring-2 ring-emerald-400/70 ring-offset-1",
                )}
              >
                {m.role === "student" ? (
                  m.text
                ) : (
                  <RichMarkdown
                    text={m.text}
                    size="base"
                    className="prose-p:my-1.5 prose-p:first:mt-0 prose-p:last:mb-0 prose-strong:text-foreground"
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isThinking && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-bl-md border border-white/50 bg-white/40 px-3.5 py-3 backdrop-blur-md">
              {[0, 0.15, 0.3].map((d) => (
                <motion.span
                  key={d}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: d }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/40 p-3">
        {sendError && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
            <span>{sendError}</span>
            <button
              onClick={retrySend}
              className="shrink-0 font-medium underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder={voice.listening ? "Listening…" : "Answer Lumi or ask a question…"}
            className="max-h-32 flex-1 resize-none rounded-xl border border-white/50 bg-white/35 px-3 py-2 text-base outline-none backdrop-blur-md transition-shadow placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/40"
          />
          {voice.supported && (
            <button
              onClick={voice.toggle}
              disabled={isThinking}
              title={voice.listening ? "Stop listening" : "Speak your answer"}
              aria-label={voice.listening ? "Stop listening" : "Speak your answer"}
              aria-pressed={voice.listening}
              className={cn(
                "relative flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-40",
                voice.listening
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/40"
                  : "border border-white/50 bg-white/35 text-muted-foreground backdrop-blur-md hover:bg-white/60 hover:text-foreground",
              )}
            >
              {voice.listening && (
                <>
                  <motion.span
                    className="absolute inset-0 rounded-xl bg-violet-600/60"
                    animate={{ scale: [1, 1.9], opacity: [0.55, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.span
                    className="absolute inset-0 rounded-xl bg-violet-600/60"
                    animate={{ scale: [1, 1.9], opacity: [0.55, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                  />
                </>
              )}
              <motion.span
                className="relative z-10 flex items-center justify-center"
                animate={voice.listening ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 1, repeat: voice.listening ? Infinity : 0, ease: "easeInOut" }}
              >
                {voice.listening ? <Mic size={17} /> : <MicOff size={17} />}
              </motion.span>
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 p-2.5 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 disabled:opacity-40 disabled:shadow-none"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
        {voice.permissionDenied && (
          <p className="mt-1.5 text-center text-[11px] text-destructive">
            Microphone access was denied — allow it in your browser to use voice input.
          </p>
        )}
      </div>
    </div>
  );
}
