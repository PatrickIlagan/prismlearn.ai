"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Brain, Target } from "lucide-react";
import { fetchRealStats, type RealStats } from "@/lib/realStats";
import { getProfile } from "@/lib/profile";
import type { WorkspaceSummary } from "@/types/prism";
import { cn } from "@/lib/utils";

interface StatCard {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: typeof Flame;
  tile: string; // gradient classes for the icon tile
}

export function StatsBento({ workspaces }: { workspaces: WorkspaceSummary[] | null }) {
  const [stats, setStats] = useState<RealStats | null>(null);
  useEffect(() => {
    if (workspaces === null) return;
    let cancelled = false;
    fetchRealStats(workspaces).then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaces]);
  const loading = workspaces === null || stats === null;

  // Real streak from the persistent profile (hydrated client-side).
  const [streak, setStreak] = useState(0);
  useEffect(() => setStreak(getProfile().streak), []);

  const cards: StatCard[] = [
    {
      key: "streak",
      label: "Learning streak",
      value: `${streak}`,
      hint: streak === 1 ? "day — keep it going" : streak === 0 ? "start today!" : "days in a row",
      icon: Flame,
      tile: "from-orange-400/20 to-amber-500/20 text-orange-500",
    },
    {
      key: "mastered",
      label: "Concepts mastered",
      value: `${stats?.conceptsMastered ?? 0}`,
      hint: "across all workspaces",
      icon: Brain,
      tile: "from-violet-500/20 to-fuchsia-500/20 text-violet-600",
    },
    {
      key: "accuracy",
      label: "Overall accuracy",
      value: `${stats?.accuracy ?? 0}%`,
      hint: "in tutor sessions",
      icon: Target,
      tile: "from-emerald-400/20 to-cyan-500/20 text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 160, damping: 20 }}
            className="glass flex items-center gap-4 rounded-2xl p-4"
          >
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-white/50",
                c.tile,
              )}
            >
              <motion.span
                animate={c.key === "streak" ? { scale: [1, 1.12, 1] } : {}}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Icon size={22} />
              </motion.span>
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold leading-none tracking-tight">
                {loading ? <span className="text-muted-foreground/40">—</span> : c.value}
              </div>
              <div className="mt-1 truncate text-xs font-medium text-foreground/70">{c.label}</div>
              <div className="truncate text-[11px] text-muted-foreground">{c.hint}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
