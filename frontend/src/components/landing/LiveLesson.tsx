"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock, Sparkles } from "lucide-react";
import { MascotLumi } from "@/components/prism/MascotLumi";

/**
 * The hero's right-hand panel: a real lesson exchange that plays itself on a
 * loop — Lumi asks, the student's answer types itself out, XP pops, the next
 * chapter unlocks. The product demoing itself beats a static mockup or a
 * floating chat bubble.
 *
 * Phase machine (ms are cumulative from loop start):
 *   0 lumi typing → 1 lumi question → 2 student typing → 3 student sent
 *   → 4 verdict + XP → 5 chapter unlock → reset
 */

const STUDENT_ANSWER = "The mitochondria!";

const PHASES = [900, 1400, 2200, 1100, 1600, 2600]; // duration of each phase

export function LiveLesson() {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase((p) => {
        const next = (p + 1) % PHASES.length;
        if (next === 0) setTyped("");
        return next;
      });
    }, PHASES[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  // typewriter for the student's reply during phase 2
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (phase !== 2) return;
    STUDENT_ANSWER.split("").forEach((_, i) => {
      timers.current.push(
        setTimeout(() => setTyped(STUDENT_ANSWER.slice(0, i + 1)), 250 + i * 85),
      );
    });
    return () => timers.current.forEach(clearTimeout);
  }, [phase]);

  const showLumiQ = phase >= 1;
  const showStudent = phase >= 3;
  const showVerdict = phase >= 4;
  const showUnlock = phase >= 5;

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5 shadow-xl shadow-violet-500/10">
      {/* header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <MascotLumi size={20} /> Live lesson · Cell Biology
        </div>
        <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> live
        </div>
      </div>

      {/* chat area — fixed height so the loop doesn't reflow the hero */}
      <div className="flex h-[240px] flex-col justify-start gap-2.5">
        <AnimatePresence mode="popLayout">
          {phase === 0 && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex w-14 items-center justify-center gap-1 rounded-2xl rounded-bl-sm bg-white/70 px-3 py-2.5 shadow-sm"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="h-1.5 w-1.5 rounded-full bg-primary/60"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {showLumiQ && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white/70 p-3 text-left shadow-sm"
          >
            <p className="text-xs leading-relaxed text-foreground/80">
              I highlighted the organelle section. Which one is the{" "}
              <span className="font-semibold text-primary">powerhouse of the cell</span>?
            </p>
          </motion.div>
        )}

        {phase === 2 && typed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-auto max-w-[70%] rounded-2xl rounded-br-sm border border-primary/20 bg-white/60 p-3 text-left"
          >
            <p className="text-xs text-foreground/70">
              {typed}
              <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-primary align-middle" />
            </p>
          </motion.div>
        )}

        {showStudent && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="ml-auto max-w-[70%] rounded-2xl rounded-br-sm bg-primary/90 p-3 text-left shadow-sm"
          >
            <p className="text-xs text-white">{STUDENT_ANSWER}</p>
          </motion.div>
        )}

        {showVerdict && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white/70 p-3 text-left shadow-sm"
          >
            <p className="text-xs leading-relaxed text-foreground/80">
              Exactly. Watch the canvas — that section is yours now.
            </p>
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 320, damping: 16 }}
              className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600"
            >
              <Check size={10} /> Correct · +15 XP
            </motion.span>
          </motion.div>
        )}
      </div>

      {/* fog-of-war footer — chapter 3 unlocks at the end of the loop.
          Plain keyed div, NOT AnimatePresence mode="wait" (documented staller
          in this codebase — exit animations can hang and freeze the swap). */}
      <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-3 py-2.5">
        {showUnlock ? (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-[11px] font-semibold text-primary"
          >
            <motion.span
              initial={{ rotate: -12, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15"
            >
              <Sparkles size={11} />
            </motion.span>
            Chapter 3: Meiosis — unlocked
          </motion.div>
        ) : (
          <motion.div
            key="locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground/70"
          >
            <Lock size={11} /> Chapter 3: Meiosis — prove mastery to unlock
          </motion.div>
        )}
      </div>
    </div>
  );
}
