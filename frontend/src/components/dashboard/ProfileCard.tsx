"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getProfile, type ProfileSummary } from "@/lib/profile";
import { rankForLevel, nextRank } from "@/lib/rank";
import { MascotLumi } from "@/components/prism/MascotLumi";
import { cn } from "@/lib/utils";

/** Dashboard "profile" strip — gives XP a visible identity (rank badge, not
 *  just a number) rather than only showing up as a raw total in DailyQuests. */
export function ProfileCard() {
  // Hydrate on the client (localStorage) to avoid an SSR mismatch.
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  useEffect(() => setProfile(getProfile()), []);

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpIntoLevel = profile?.xpIntoLevel ?? 0;
  const xpPerLevel = profile?.xpPerLevel ?? 100;
  const rank = rankForLevel(level);
  const next = nextRank(level);
  const Icon = rank.icon;
  const pct = (xpIntoLevel / xpPerLevel) * 100;
  const levelsToNext = next ? next.minLevel - level : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
      className="glass mb-6 flex items-center gap-4 rounded-2xl p-4"
    >
      <div className="relative shrink-0">
        <MascotLumi size={44} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ring-1 ring-white/50",
              rank.tile,
            )}
          >
            <Icon size={13} />
          </div>
          <p className="text-sm font-semibold">{rank.name}</p>
          <span className="text-xs text-muted-foreground">Level {level}</span>
        </div>
        <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-violet-500/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {xp} XP total
          {next
            ? ` · ${levelsToNext} level${levelsToNext === 1 ? "" : "s"} to ${next.name}`
            : " · Max rank reached"}
        </p>
      </div>
    </motion.div>
  );
}
