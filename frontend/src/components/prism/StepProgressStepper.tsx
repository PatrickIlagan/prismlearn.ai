"use client";

import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/** DataCamp-style progress bar, locked to the top of the chat viewport. */
export function StepProgressStepper() {
  const { currentStep, totalSteps, stepTitle } = useWorkspaceStore((s) => s.step);

  if (totalSteps === 0) return null;

  const pct = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="border-b border-white/40 px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="max-w-[60%] truncate text-muted-foreground">{stepTitle}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-500/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
