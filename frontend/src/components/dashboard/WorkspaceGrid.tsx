"use client";

import { motion, type Variants } from "framer-motion";
import { Loader2, FolderOpen } from "lucide-react";
import { WorkspaceCard } from "./WorkspaceCard";
import type { WorkspaceSummary } from "@/types/prism";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } },
};

/** Presentational grid. Pass `null` for the loading state. */
export function WorkspaceGrid({
  workspaces,
  onWorkspacesChange,
}: {
  workspaces: WorkspaceSummary[] | null;
  /** Called after a delete/rename so the parent's list stays in sync. */
  onWorkspacesChange?: (next: WorkspaceSummary[]) => void;
}) {
  if (workspaces === null) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading your workspaces…
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl py-12 text-center">
        <FolderOpen className="text-muted-foreground" size={26} />
        <p className="text-sm font-medium">No workspaces yet</p>
        <p className="text-xs text-muted-foreground">Upload a source above to create your first one.</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {workspaces.map((ws) => (
        <motion.div key={ws.id} variants={item}>
          <WorkspaceCard
            ws={ws}
            onDeleted={(id) => onWorkspacesChange?.(workspaces.filter((w) => w.id !== id))}
            onRenamed={(id, title) =>
              onWorkspacesChange?.(workspaces.map((w) => (w.id === id ? { ...w, title } : w)))
            }
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
