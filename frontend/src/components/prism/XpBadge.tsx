"use client";

import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { rankForLevel } from "@/lib/rank";
import { cn } from "@/lib/utils";

const XP_PER_LEVEL = 100;

/** Compact rank badge + XP-bar indicator for the tutor chat header — the
 *  icon/color change with rank, so leveling up is visible at a glance, not
 *  just a bigger number. */
export function XpBadge() {
  const xp = useWorkspaceStore((s) => s.xp);
  const level = useWorkspaceStore((s) => s.completedChapters.length + 1);
  const intoLevel = xp % XP_PER_LEVEL;
  const pct = (intoLevel / XP_PER_LEVEL) * 100;
  const rank = rankForLevel(level);
  const Icon = rank.icon;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-6 items-center gap-1 rounded-full bg-gradient-to-r px-2 text-[11px] font-semibold ring-1 ring-white/50",
          rank.tile,
        )}
        title={`${rank.name} · Level ${level}`}
      >
        <Icon size={12} /> {rank.name} · Lv {level}
      </div>
      <div className="hidden w-16 sm:block">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-500/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <p className="mt-0.5 text-[9px] leading-none text-muted-foreground">{xp} XP</p>
      </div>
    </div>
  );
}
