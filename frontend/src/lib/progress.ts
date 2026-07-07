import type { WorkspaceSummary } from "@/types/prism";

/**
 * Mastery / progress helpers.
 *
 * Until the `concept_mastery` table (see 06_DatabaseArchitecture.md) is wired,
 * per-workspace progress is derived deterministically from the workspace id so
 * the UI is stable across renders. Swap these two functions for real tutor
 * progress data later — every component consumes them, nothing else changes.
 */

export function workspaceProgress(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 8 + (Math.abs(h) % 88); // 8–95%
}

export function workspaceAccuracy(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 33) ^ id.charCodeAt(i)) | 0;
  return 70 + (Math.abs(h) % 28); // 70–97%
}

export interface DashboardStats {
  streak: number;
  conceptsMastered: number;
  accuracy: number;
}

export function computeStats(workspaces: WorkspaceSummary[]): DashboardStats {
  const conceptsMastered = workspaces.reduce(
    (sum, w) => sum + Math.round((w.conceptCount * workspaceProgress(w.id)) / 100),
    0,
  );
  const accuracy = workspaces.length
    ? Math.round(workspaces.reduce((s, w) => s + workspaceAccuracy(w.id), 0) / workspaces.length)
    : 0;
  return { streak: readStreak(), conceptsMastered, accuracy };
}

/** Learning streak — mock-persisted per browser until analytics lands. */
function readStreak(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("prism_streak");
    if (raw) return parseInt(raw, 10) || 0;
    localStorage.setItem("prism_streak", "4");
    return 4;
  } catch {
    return 4;
  }
}
