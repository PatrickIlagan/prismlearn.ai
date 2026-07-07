"use client";

import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/** DataCamp-style progress bar, locked to the top of the chat viewport. */
export function StepProgressStepper() {
  const { currentStep, totalSteps, stepTitle } = useWorkspaceStore((s) => s.step);

  if (totalSteps === 0) return null;

  const pct = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="border-b bg-card/60 px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="max-w-[60%] truncate text-muted-foreground">{stepTitle}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
