"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  FileText,
  Gamepad2,
  Link2,
  Sparkles,
  Trophy,
  Upload,
  Video,
} from "lucide-react";
import { MascotLumi } from "@/components/prism/MascotLumi";
import { cn } from "@/lib/utils";

/**
 * Auto-advancing 4-step "how it works" walkthrough. Left rail lists the
 * steps (clickable, with a fill bar showing time until auto-advance); the
 * right panel plays a bespoke mini-animation per step. Cycles forever while
 * in view — the point is a landing page that feels alive without a video.
 */

const STEP_MS = 4200;

const STEPS = [
  {
    icon: Upload,
    title: "Drop in any source",
    body: "A PDF, a slide deck, a YouTube lecture, or a website link — anything you have to learn.",
  },
  {
    icon: Sparkles,
    title: "Lumi builds the course",
    body: "Chapters, key concepts, and a quiz bank generated in seconds — grounded only in your document.",
  },
  {
    icon: Gamepad2,
    title: "Learn by playing",
    body: "Lumi teaches step-by-step while blocks mutate into mini-games — cloze, spot-the-lie, drag-to-reorder.",
  },
  {
    icon: Trophy,
    title: "Prove your mastery",
    body: "Boss battles gate each chapter. Spaced repetition brings concepts back right before you'd forget them.",
  },
];

const panelTransition = { duration: 0.45, ease: "easeOut" as const };

function StepVisualUpload() {
  const files = [
    { icon: FileText, label: "biology-ch3.pdf", delay: 0 },
    { icon: Video, label: "Krebs cycle lecture", delay: 0.5 },
    { icon: Link2, label: "en.wikipedia.org/wiki/Mitosis", delay: 1.0 },
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      {files.map(({ icon: Icon, label, delay }) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 18, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...panelTransition, delay: 0.15 + delay }}
          className="flex w-64 items-center gap-2.5 rounded-xl border border-white/60 bg-white/70 px-3.5 py-2.5 text-xs font-medium shadow-sm"
        >
          <Icon size={15} className="shrink-0 text-primary" />
          <span className="truncate text-foreground/80">{label}</span>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.9 }}
        className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600"
      >
        <Check size={12} /> Sources received
      </motion.div>
    </div>
  );
}

function StepVisualBuild() {
  const chapters = ["1. Cell structure", "2. Mitosis phases", "3. Meiosis", "4. Genetic drift"];
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={panelTransition}
        className="mb-4 flex items-center gap-2 text-xs font-semibold text-primary"
      >
        <MascotLumi size={22} /> Building your study guide…
      </motion.div>
      <div className="w-64 space-y-2">
        {chapters.map((ch, i) => (
          <motion.div
            key={ch}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...panelTransition, delay: 0.35 + i * 0.35 }}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary"
          >
            <Check size={12} /> {ch}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StepVisualPlay() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={panelTransition}
        className="w-72 rounded-2xl rounded-bl-sm border border-white/60 bg-white/70 p-3 text-left shadow-sm"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
          <MascotLumi size={15} /> Lumi
        </div>
        <p className="mt-1 text-xs text-foreground/80">
          Quick check — fill in the blank to unlock the next section:
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...panelTransition, delay: 0.6 }}
        className="w-72 rounded-xl border border-violet-200 bg-violet-50/80 px-3.5 py-3 text-xs text-foreground/80 shadow-sm"
      >
        Mitosis produces{" "}
        <motion.span
          initial={{ backgroundColor: "rgba(139,92,246,0.15)", color: "transparent" }}
          animate={{ backgroundColor: "rgba(16,185,129,0.15)", color: "rgb(5,150,105)" }}
          transition={{ delay: 1.7, duration: 0.4 }}
          className="rounded-md px-1.5 py-0.5 font-semibold"
        >
          two identical
        </motion.span>{" "}
        daughter cells.
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.3, type: "spring", stiffness: 300, damping: 18 }}
        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600"
      >
        <Check size={11} /> Correct · +15 XP
      </motion.div>
    </div>
  );
}

function StepVisualMastery() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 14 }}
        className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-200 to-amber-400 text-amber-800 shadow-lg shadow-amber-500/25"
      >
        <Trophy size={30} />
      </motion.div>
      <div className="w-64">
        <div className="mb-1.5 flex justify-between text-[11px] font-medium text-muted-foreground">
          <span>Chapter 2 mastery</span>
          <span className="text-emerald-600">100%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
          <motion.div
            initial={{ width: "24%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.4, duration: 1.4, ease: "easeInOut" }}
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
          />
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.9, duration: 0.4 }}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
      >
        <Sparkles size={12} /> Boss battle defeated — Chapter 3 unlocked
      </motion.div>
    </div>
  );
}

const VISUALS = [StepVisualUpload, StepVisualBuild, StepVisualPlay, StepVisualMastery];

export function ProcessShowcase() {
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(id);
  }, [inView, active]); // `active` in deps restarts the timer after a manual click

  const Visual = VISUALS[active];

  return (
    <motion.div
      onViewportEnter={() => setInView(true)}
      onViewportLeave={() => setInView(false)}
      viewport={{ margin: "-120px" }}
      className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:gap-10"
    >
      {/* step rail */}
      <div className="flex flex-col gap-2">
        {STEPS.map(({ icon: Icon, title, body }, i) => {
          const isActive = i === active;
          return (
            <button
              key={title}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative overflow-hidden rounded-2xl p-4 text-left transition",
                isActive ? "glass shadow-md" : "opacity-60 hover:opacity-90",
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                    isActive ? "bg-primary/15 text-primary" : "bg-foreground/5 text-muted-foreground",
                  )}
                >
                  <Icon size={16} />
                </span>
                <span className="text-sm font-semibold">{title}</span>
              </div>
              {isActive && (
                <>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
                  {/* auto-advance fill bar */}
                  <motion.div
                    key={`bar-${active}-${inView}`}
                    initial={{ width: "0%" }}
                    animate={{ width: inView ? "100%" : "0%" }}
                    transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                    className="absolute bottom-0 left-0 h-0.5 bg-primary/50"
                  />
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* animated panel */}
      <div className="glass relative min-h-[320px] overflow-hidden rounded-3xl p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="h-full"
          >
            <Visual />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
