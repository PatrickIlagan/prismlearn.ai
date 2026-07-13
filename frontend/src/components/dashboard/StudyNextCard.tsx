"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Compass } from "lucide-react";
import { computeStudyNext, type StudyNextSuggestion } from "@/lib/studyNext";
import type { WorkspaceSummary } from "@/types/prism";

/** "Study next" — one deterministic recommendation (SRS due → unfinished
 *  session → weakest workspace → continue newest), with the reason shown so
 *  the student knows WHY this is the suggestion. No AI involved. */
export function StudyNextCard({ workspaces }: { workspaces: WorkspaceSummary[] | null }) {
  const [suggestion, setSuggestion] = useState<StudyNextSuggestion | null | "loading">("loading");

  useEffect(() => {
    if (!workspaces) return;
    let alive = true;
    computeStudyNext(workspaces)
      .then((s) => alive && setSuggestion(s))
      .catch(() => alive && setSuggestion(null));
    return () => {
      alive = false;
    };
  }, [workspaces]);

  if (suggestion === "loading" || suggestion === null) return null; // empty state: the dropzone below is the CTA

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass mb-6 flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Compass size={17} />
      </span>
      <div className="min-w-[200px] flex-1">
        <p className="text-sm font-semibold">Study next</p>
        <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
      </div>
      <Link
        href={suggestion.href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/20 transition hover:opacity-90"
      >
        {suggestion.cta} <ArrowRight size={13} />
      </Link>
    </motion.div>
  );
}
