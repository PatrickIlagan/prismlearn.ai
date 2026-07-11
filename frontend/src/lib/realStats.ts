import { fetchReviewer } from "./api";
import { conceptStrength, overallMastery } from "./mastery";
import type { WorkspaceSummary } from "@/types/prism";

/**
 * Real, per-workspace/dashboard mastery — replaces the old progress.ts
 * hash-of-the-workspace-id placeholder (`workspaceProgress`/`workspaceAccuracy`),
 * which returned a fixed, meaningless number derived from the id string, not
 * anything the student actually did. Pulls each workspace's real table of
 * contents and scores it against lib/mastery.ts's localStorage-backed
 * per-concept strength — the same source of truth the tutor's Fog-of-War
 * unlocking and the weakness-review flow already use.
 */

const MASTERED_THRESHOLD = 70;

/** 0-100 average mastery across a single workspace's concepts (untouched
 *  concepts count as 0, matching mastery.ts's own overallMastery). */
export async function fetchWorkspaceMastery(workspaceId: string): Promise<number> {
  try {
    const reviewer = await fetchReviewer(workspaceId);
    return overallMastery(reviewer.table_of_contents);
  } catch {
    return 0;
  }
}

export interface RealStats {
  conceptsMastered: number;
  /** Average strength over concepts the student has actually attempted
   *  (strength > 0) — untouched concepts are excluded so a fresh workspace
   *  doesn't drag this toward 0 rather than reading as "no data yet". */
  accuracy: number;
}

export async function fetchRealStats(workspaces: WorkspaceSummary[]): Promise<RealStats> {
  let masteredCount = 0;
  let attemptedSum = 0;
  let attemptedCount = 0;

  await Promise.all(
    workspaces.map(async (w) => {
      try {
        const reviewer = await fetchReviewer(w.id);
        for (const entry of reviewer.table_of_contents) {
          const s = conceptStrength(entry.anchor_id);
          if (s > 0) {
            attemptedSum += s;
            attemptedCount += 1;
          }
          if (s >= MASTERED_THRESHOLD) masteredCount += 1;
        }
      } catch {
        /* skip a workspace whose reviewer failed to load */
      }
    }),
  );

  return {
    conceptsMastered: masteredCount,
    accuracy: attemptedCount ? Math.round(attemptedSum / attemptedCount) : 0,
  };
}
