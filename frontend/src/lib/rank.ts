import { Sparkle, Flame, Zap, Gem, Crown, type LucideIcon } from "lucide-react";

/**
 * Level → rank tiers, so XP visibly means something beyond a raw number: the
 * badge's icon, name, and color all change as a student levels up. Shared by
 * XpBadge (compact, chat header) and ProfileCard (dashboard) so the two never
 * drift out of sync.
 */
export interface Rank {
  name: string;
  icon: LucideIcon;
  minLevel: number;
  /** gradient + text classes for a filled tile/badge background */
  tile: string;
  /** text-only color class, for compact inline use */
  text: string;
}

export const RANKS: Rank[] = [
  {
    name: "Spark",
    icon: Sparkle,
    minLevel: 1,
    tile: "from-slate-400/20 to-slate-500/20 text-slate-500",
    text: "text-slate-500",
  },
  {
    name: "Glow",
    icon: Flame,
    minLevel: 3,
    tile: "from-violet-300/25 to-violet-400/25 text-violet-500",
    text: "text-violet-500",
  },
  {
    name: "Beam",
    icon: Zap,
    minLevel: 6,
    tile: "from-violet-500/25 to-fuchsia-500/25 text-violet-600",
    text: "text-violet-600",
  },
  {
    name: "Prism",
    icon: Gem,
    minLevel: 10,
    tile: "from-violet-500/25 via-fuchsia-500/20 to-cyan-400/25 text-fuchsia-600",
    text: "text-fuchsia-600",
  },
  {
    name: "Luminary",
    icon: Crown,
    minLevel: 15,
    tile: "from-amber-400/25 to-yellow-500/25 text-amber-600",
    text: "text-amber-600",
  },
];

export function rankForLevel(level: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (level >= r.minLevel) current = r;
  }
  return current;
}

/** The next rank up, or null if already at the top tier. */
export function nextRank(level: number): Rank | null {
  return RANKS.find((r) => r.minLevel > level) ?? null;
}
