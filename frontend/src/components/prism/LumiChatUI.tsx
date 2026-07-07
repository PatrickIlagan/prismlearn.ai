"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Volume2, VolumeX } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { sendTutorMessage } from "@/lib/api";
import { speak, stopSpeaking } from "@/lib/sounds";
import { MascotLumi } from "./MascotLumi";
import { StepProgressStepper } from "./StepProgressStepper";
import { cn } from "@/lib/utils";

export function LumiChatUI({ workspaceId }: { workspaceId: string }) {
  const messages = useWorkspaceStore((s) => s.messages);
  const isThinking = useWorkspaceStore((s) => s.isTutorThinking);
  const ttsEnabled = useWorkspaceStore((s) => s.ttsEnabled);
  const toggleTts = useWorkspaceStore((s) => s.toggleTts);
  const pushStudentMessage = useWorkspaceStore((s) => s.pushStudentMessage);
  const setTutorThinking = useWorkspaceStore((s) => s.setTutorThinking);
  const applyTutorResponse = useWorkspaceStore((s) => s.applyTutorResponse);

  const [input, setInput] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string | null>(null);

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

  async function handleSend() {
    const text = input.trim();
    if (!text || isThinking) return;

    // Snapshot the context BEFORE mutating the store: the reviewer, progress,
    // strike count, study mode, and prior turns (excluding this new message).
    const {
      ingest,
      step,
      strikeCount,
      studyMode,
      messages: prior,
    } = useWorkspaceStore.getState();

    if (!ingest) return; // reviewer not loaded yet

    const recentHistory = prior
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    setInput("");
    pushStudentMessage(text);
    setTutorThinking(true);
    try {
      const res = await sendTutorMessage(workspaceId, text, {
        reviewer: ingest,
        currentStep: step.currentStep,
        totalSteps: step.totalSteps,
        strikeCount,
        studyFocus: studyMode,
        recentHistory,
      });
      applyTutorResponse(res);
    } catch {
      setTutorThinking(false);
    }
  }

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

      <StepProgressStepper />

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
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
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className={cn("flex", m.role === "student" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  m.role === "student"
                    ? "rounded-br-md bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-violet-500/20"
                    : "rounded-bl-md border border-white/50 bg-white/40 text-foreground backdrop-blur-md",
                  m.verdict === "correct" && "ring-2 ring-emerald-400/70 ring-offset-1",
                )}
              >
                {m.text}
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
            placeholder="Answer Lumi or ask a question…"
            className="max-h-32 flex-1 resize-none rounded-xl border border-white/50 bg-white/35 px-3 py-2 text-sm outline-none backdrop-blur-md transition-shadow placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 p-2.5 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 disabled:opacity-40 disabled:shadow-none"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
