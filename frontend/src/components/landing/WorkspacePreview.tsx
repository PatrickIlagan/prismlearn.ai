"use client";

import { motion } from "framer-motion";
import { Check, Flame, Gamepad2, Lock, Send, Swords } from "lucide-react";
import { MascotLumi } from "@/components/prism/MascotLumi";
import { cn } from "@/lib/utils";

/**
 * A faithful, hand-built miniature of the real workspace UI (chapter rail /
 * document canvas / Lumi chat) inside a browser-window frame, so visitors see
 * exactly what the product looks like before signing up. Built in code rather
 * than a screenshot so it stays crisp at every size and inherits the theme.
 */

const CHAPTERS = [
  { title: "1. Cell structure", state: "done" },
  { title: "2. Mitosis phases", state: "active" },
  { title: "3. Meiosis", state: "locked" },
  { title: "4. Genetic drift", state: "locked" },
] as const;

const bubbleIn = (delay: number) => ({
  initial: { opacity: 0, y: 10, scale: 0.97 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.4, delay, ease: "easeOut" as const },
});

export function WorkspacePreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="glass overflow-hidden rounded-3xl shadow-xl shadow-violet-500/10"
    >
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/50 bg-white/40 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="mx-auto flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-[10px] font-medium text-muted-foreground">
          prismlearning.ai/workspace/cell-biology
        </div>
        <div className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
          <Flame size={10} /> 6-day streak
        </div>
      </div>

      <div className="grid text-left sm:grid-cols-[170px_1fr_240px]">
        {/* chapter rail */}
        <div className="hidden space-y-1.5 border-r border-white/50 p-3 sm:block">
          <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Chapters
          </p>
          {CHAPTERS.map((ch) => (
            <div
              key={ch.title}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium",
                ch.state === "active" && "bg-primary/15 text-primary",
                ch.state === "done" && "text-emerald-600",
                ch.state === "locked" && "text-muted-foreground/50",
              )}
            >
              {ch.state === "done" && <Check size={11} />}
              {ch.state === "active" && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              {ch.state === "locked" && <Lock size={11} />}
              {ch.title}
            </div>
          ))}
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500/15 to-amber-500/15 px-2 py-1.5 text-[11px] font-semibold text-rose-600">
            <Swords size={11} /> Boss battle
          </div>
        </div>

        {/* document canvas */}
        <div className="space-y-2.5 p-4">
          <div className="h-3 w-1/2 rounded-full bg-primary/25" />
          <div className="h-2 w-full rounded-full bg-foreground/10" />
          <div className="h-2 w-11/12 rounded-full bg-foreground/10" />
          {/* mint-highlighted concept the tutor just scrolled to */}
          <motion.div
            initial={{ backgroundColor: "rgba(16,185,129,0)" }}
            whileInView={{ backgroundColor: "rgba(16,185,129,0.12)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="rounded-lg p-2"
          >
            <div className="h-2 w-full rounded-full bg-emerald-600/30" />
            <div className="mt-1.5 h-2 w-4/5 rounded-full bg-emerald-600/20" />
          </motion.div>
          {/* block mutated into a mini-game */}
          <motion.div {...bubbleIn(0.8)} className="rounded-xl border border-violet-200 bg-violet-50/70 p-2.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-primary">
              <Gamepad2 size={11} /> Spot the lie
            </div>
            <div className="mt-1.5 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-foreground/10" />
              <div className="h-1.5 w-5/6 rounded-full bg-rose-400/40" />
              <div className="h-1.5 w-11/12 rounded-full bg-foreground/10" />
            </div>
          </motion.div>
          <div className="h-2 w-3/4 rounded-full bg-foreground/10 blur-[1px]" />
          <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-muted-foreground/70">
            <Lock size={10} /> Fog of war — unlocks with mastery
          </div>
        </div>

        {/* Lumi chat */}
        <div className="flex flex-col justify-end gap-2 border-t border-white/50 p-3 sm:border-l sm:border-t-0">
          <motion.div {...bubbleIn(0.3)} className="rounded-2xl rounded-bl-sm bg-white/70 p-2.5 shadow-sm">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-primary">
              <MascotLumi size={13} /> Lumi
            </div>
            <p className="mt-1 text-[11px] leading-snug text-foreground/80">
              During which phase do chromosomes line up along the middle?
            </p>
          </motion.div>
          <motion.div
            {...bubbleIn(0.9)}
            className="ml-6 rounded-2xl rounded-br-sm bg-primary/90 p-2.5 text-[11px] text-white shadow-sm"
          >
            Metaphase!
          </motion.div>
          <motion.div {...bubbleIn(1.5)} className="rounded-2xl rounded-bl-sm bg-white/70 p-2.5 shadow-sm">
            <p className="text-[11px] leading-snug text-foreground/80">
              Exactly right. Watch the canvas — I&apos;m unlocking the next section for you.
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">
              <Check size={9} /> +15 XP
            </span>
          </motion.div>
          <div className="mt-1 flex items-center gap-1.5 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-[10px] text-muted-foreground/60">
            Ask Lumi anything…
            <Send size={10} className="ml-auto text-primary/60" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
