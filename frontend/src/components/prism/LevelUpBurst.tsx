"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const COLORS = ["#7c3aed", "#d946ef", "#22d3ee", "#f59e0b", "#10b981"];

/** Full-screen celebratory burst fired when a chapter is mastered (level up). */
export function LevelUpBurst() {
  const tick = useWorkspaceStore((s) => s.levelUpTick);
  const label = useWorkspaceStore((s) => s.levelUpLabel);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (tick === 0) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, [tick]);

  const particles = Array.from({ length: 18 });

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center"
        >
          {/* particle burst */}
          {particles.map((_, i) => {
            const angle = (i / particles.length) * Math.PI * 2;
            const dist = 120 + Math.random() * 90;
            return (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  opacity: 0,
                  scale: 0.4,
                }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                className="absolute h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
            );
          })}

          {/* card */}
          <motion.div
            initial={{ scale: 0.6, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="glass flex flex-col items-center gap-1 rounded-2xl px-8 py-6 text-center shadow-2xl"
          >
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Sparkles size={24} />
            </div>
            <p className="text-lg font-bold tracking-tight">
              <span className="prism-text">Level Up!</span>
            </p>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-600">+20 XP</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
