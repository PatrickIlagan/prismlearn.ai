"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, Swords, X } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { conceptStrength } from "@/lib/mastery";

/**
 * Lesson completion summary — appears once, the moment the final chapter of
 * a document is mastered. Every number comes from data already in the store
 * or localStorage (chapters, XP, per-concept mastery); no AI call. The
 * shown-once flag lives in sessionStorage keyed by the document so replays
 * of the same session don't re-celebrate.
 */
export function CompletionSummary({ workspaceId }: { workspaceId: string }) {
  const chapters = useWorkspaceStore((s) => s.chapters);
  const completedChapters = useWorkspaceStore((s) => s.completedChapters);
  const xp = useWorkspaceStore((s) => s.xp);
  const sessionKey = useWorkspaceStore((s) => s.sessionKey);
  const [visible, setVisible] = useState(false);

  const allDone =
    chapters.length > 0 &&
    chapters.every((c) => completedChapters.includes(c.anchorId));

  useEffect(() => {
    if (!allDone || !sessionKey) return;
    const flag = `prism_complete_shown_${sessionKey}`;
    try {
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, "1");
    } catch {
      /* still show it; worst case it reappears after a reload */
    }
    setVisible(true);
  }, [allDone, sessionKey]);

  if (!allDone) return null;

  const mastered = chapters.filter((c) => conceptStrength(c.anchorId) >= 70).length;
  const avgMastery = Math.round(
    chapters.reduce((s, c) => s + conceptStrength(c.anchorId), 0) / chapters.length,
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm"
          onClick={() => setVisible(false)}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass relative w-full max-w-sm rounded-3xl p-6 text-center"
          >
            <button
              onClick={() => setVisible(false)}
              className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X size={15} />
            </button>
            <motion.div
              initial={{ rotate: -12, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.15 }}
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-200 to-amber-400 text-amber-800 shadow-lg shadow-amber-500/25"
            >
              <PartyPopper size={26} />
            </motion.div>
            <h2 className="text-xl font-bold tracking-tight">Lesson complete! 🎉</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every chapter in this document is mastered.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Chapters", value: `${completedChapters.length}/${chapters.length}` },
                { label: "Mastered", value: `${mastered} concepts` },
                { label: "Session XP", value: `+${xp}` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/60 bg-white/50 p-2.5">
                  <p className="text-sm font-bold text-primary">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Average mastery across concepts: <b>{avgMastery}%</b>
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={`/workspace/${workspaceId}/exam`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-violet-500/40"
              >
                <Swords size={15} /> Prove it — Practice Exam
              </Link>
              <Link
                href="/dashboard"
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Back to dashboard
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
