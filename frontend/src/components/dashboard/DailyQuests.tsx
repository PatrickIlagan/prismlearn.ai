"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Target, Check, Zap } from "lucide-react";
import { getProfile, type DailyQuest, type ProfileSummary } from "@/lib/profile";
import { cn } from "@/lib/utils";

const ICON = { game: Sparkles, exam: Trophy, review: Target } as const;

export function DailyQuests() {
  // Hydrate on the client (localStorage) to avoid an SSR mismatch.
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  useEffect(() => setProfile(getProfile()), []);

  const quests = profile?.quests ?? [];
  const done = profile?.questsDone ?? 0;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Daily quests</h2>
          <p className="text-xs text-muted-foreground">
            {done}/{quests.length || 3} complete · resets at midnight
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-white/50">
          <Zap size={13} className="fill-violet-500 text-violet-500" />
          Lv {profile?.level ?? 1} · {profile?.xp ?? 0} XP
        </div>
      </div>

      <ul className="space-y-2">
        {(quests.length ? quests : PLACEHOLDER).map((q, i) => {
          const Icon = ICON[q.id];
          return (
            <motion.li
              key={q.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                q.done
                  ? "border-emerald-300/60 bg-emerald-50/50"
                  : "border-white/50 bg-white/40",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  q.done ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary",
                )}
              >
                {q.done ? <Check size={16} /> : <Icon size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", q.done && "text-emerald-800")}>{q.title}</p>
                <p className="truncate text-xs text-muted-foreground">{q.desc}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs font-semibold",
                  q.done ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                +{q.xp} XP
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

const PLACEHOLDER: DailyQuest[] = [
  { id: "game", title: "Warm up", desc: "Complete a mini-game with Lumi", xp: 30, done: false },
  { id: "exam", title: "Prove it", desc: "Finish a Practice Exam", xp: 50, done: false },
  { id: "review", title: "Patch the gaps", desc: "Review a weak concept", xp: 40, done: false },
];
