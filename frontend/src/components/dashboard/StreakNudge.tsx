"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { getProfile, daysSinceActive } from "@/lib/profile";

/** Streak-at-risk nudge: shows only when the user has a streak from
 *  YESTERDAY and hasn't done anything yet today — i.e. the streak dies at
 *  midnight unless they act. Pure clock arithmetic on stored profile data. */
export function StreakNudge() {
  const [nudge, setNudge] = useState<{ streak: number; hoursLeft: number } | null>(null);

  useEffect(() => {
    const { streak } = getProfile();
    // Exactly 1 day since activity = streak survives today only if they act.
    if (streak < 1 || daysSinceActive() !== 1) return;
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    setNudge({
      streak,
      hoursLeft: Math.max(1, Math.round((midnight.getTime() - Date.now()) / 3_600_000)),
    });
  }, []);

  if (!nudge) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 backdrop-blur-sm"
    >
      <Flame size={16} className="shrink-0 text-amber-500" />
      <p className="text-xs font-medium text-amber-900">
        Your <span className="font-bold">{nudge.streak}-day streak</span> ends in about{" "}
        {nudge.hoursLeft}h — one quiz, game, or review keeps it alive.
      </p>
    </motion.div>
  );
}
