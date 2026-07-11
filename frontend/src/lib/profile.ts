/**
 * Persistent player profile (localStorage).
 *
 * Tracks lifetime XP/level, a real daily streak, and per-day quests so the
 * dashboard's gamification carries across sessions. When the backend
 * `concept_mastery`/profile tables land (06_DatabaseArchitecture.md), swap these
 * localStorage reads/writes for API calls — every caller stays the same.
 */

import { scopedKey } from "./userScope";

const BASE_KEY = "prism_profile";
const XP_PER_LEVEL = 100;

export interface DailyQuest {
  id: "game" | "exam" | "review" | "lesson" | "quiz";
  title: string;
  desc: string;
  xp: number;
  done: boolean;
}

export const QUEST_DEFS: Omit<DailyQuest, "done">[] = [
  { id: "game", title: "Warm up", desc: "Complete a mini-game with Lumi", xp: 30 },
  { id: "lesson", title: "Stay on track", desc: "Complete a step with Lumi", xp: 25 },
  { id: "quiz", title: "Test yourself", desc: "Finish a quiz", xp: 35 },
  { id: "exam", title: "Prove it", desc: "Finish a Practice Exam", xp: 50 },
  { id: "review", title: "Patch the gaps", desc: "Review a weak concept", xp: 40 },
];

interface ProfileData {
  xp: number;
  streak: number;
  lastActive: string; // YYYY-MM-DD
  quests: Record<string, Record<string, boolean>>; // date -> questId -> done
}

const EMPTY: ProfileData = { xp: 0, streak: 0, lastActive: "", quests: {} };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00`) - Date.parse(`${a}T00:00:00`);
  return Math.round(ms / 86_400_000);
}

function read(): ProfileData {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(scopedKey(BASE_KEY));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as ProfileData) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function write(data: ProfileData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(scopedKey(BASE_KEY), JSON.stringify(data));
  } catch {
    /* non-fatal */
  }
}

/** Update the streak for a day of activity (call on any XP-earning action). */
export function recordActivity(): void {
  const data = read();
  const t = today();
  if (data.lastActive === t) return; // already counted today
  if (data.lastActive && daysBetween(data.lastActive, t) === 1) data.streak += 1;
  else data.streak = 1; // first ever, or a broken streak
  data.lastActive = t;
  write(data);
}

export function addXp(amount: number): void {
  if (amount <= 0) return;
  const data = read();
  data.xp += amount;
  write(data);
}

/** Mark a daily quest complete (idempotent per day); awards its XP once. */
export function completeQuest(id: DailyQuest["id"]): void {
  const data = read();
  const t = today();
  const day = (data.quests[t] ??= {});
  if (day[id]) return;
  day[id] = true;
  const def = QUEST_DEFS.find((q) => q.id === id);
  if (def) data.xp += def.xp;
  write(data);
}

export interface ProfileSummary {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpPerLevel: number;
  streak: number;
  quests: DailyQuest[];
  questsDone: number;
}

export function getProfile(): ProfileSummary {
  const data = read();
  const day = data.quests[today()] ?? {};
  const quests: DailyQuest[] = QUEST_DEFS.map((q) => ({ ...q, done: !!day[q.id] }));
  return {
    xp: data.xp,
    level: Math.floor(data.xp / XP_PER_LEVEL) + 1,
    xpIntoLevel: data.xp % XP_PER_LEVEL,
    xpPerLevel: XP_PER_LEVEL,
    streak: data.streak,
    quests,
    questsDone: quests.filter((q) => q.done).length,
  };
}
