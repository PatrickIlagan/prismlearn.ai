"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Swords, X } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/**
 * Offers a themed, chapter-scoped Practice Exam right after a chapter is
 * freshly mastered (see store.completeBlockGame) — a concrete, higher-
 * stakes payoff moment tied to the rank system, instead of mastery just
 * quietly ticking up in the background. Shown after a short delay so it
 * doesn't visually collide with the LevelUpBurst celebration.
 */
export function BossBattlePrompt({ workspaceId }: { workspaceId: string }) {
  const bossBattle = useWorkspaceStore((s) => s.bossBattle);
  const dismissBossBattle = useWorkspaceStore((s) => s.dismissBossBattle);
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!bossBattle) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 2400);
    return () => clearTimeout(t);
  }, [bossBattle]);

  function fight() {
    if (!bossBattle) return;
    setVisible(false);
    router.push(
      `/workspace/${workspaceId}/exam?chapter=${encodeURIComponent(bossBattle.anchorId)}&chapterTitle=${encodeURIComponent(bossBattle.title)}`,
    );
    dismissBossBattle();
  }

  function later() {
    setVisible(false);
    dismissBossBattle();
  }

  return (
    <AnimatePresence>
      {visible && bossBattle && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="glass fixed bottom-5 right-5 z-[110] w-72 rounded-2xl p-4 shadow-2xl"
        >
          <button
            onClick={later}
            aria-label="Dismiss"
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Swords size={17} />
            </div>
            <p className="text-sm font-bold tracking-tight">Boss battle unlocked</p>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Put <span className="font-medium text-foreground">{bossBattle.title}</span> to the test —
            timed, scored, no mercy.
          </p>
          <div className="flex gap-2">
            <button
              onClick={later}
              className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Later
            </button>
            <button
              onClick={fight}
              className="flex-1 rounded-lg bg-gradient-to-b from-amber-400 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-orange-500/25"
            >
              Fight now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
