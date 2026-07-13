import type { WorkspaceSummary } from "@/types/prism";
import { fetchWorkspaceMastery } from "@/lib/realStats";
import { scopedKey } from "@/lib/userScope";

/**
 * "Study next" recommendation — pure conditional logic over data the app
 * already stores (SRS schedule, saved sessions, mastery), zero AI calls.
 * Priority order mirrors what a tutor would actually tell you to do first:
 * due spaced-repetition reviews beat everything (they're time-sensitive),
 * then finishing what you started, then shoring up the weakest workspace,
 * then simply continuing the newest course.
 */
export interface StudyNextSuggestion {
  cta: string;
  reason: string;
  href: string;
}

function srsDueCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const all = JSON.parse(localStorage.getItem(scopedKey("prism_srs")) || "{}") as Record<
      string,
      { dueAt: string }
    >;
    const now = Date.now();
    return Object.values(all).filter((c) => Date.parse(c.dueAt) <= now).length;
  } catch {
    return 0;
  }
}

function hasUnfinishedSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith("prism_session_")) continue;
      const saved = JSON.parse(sessionStorage.getItem(key) || "{}") as {
        messages?: unknown[];
      };
      if ((saved.messages?.length ?? 0) > 0) return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}

export async function computeStudyNext(
  workspaces: WorkspaceSummary[],
): Promise<StudyNextSuggestion | null> {
  if (workspaces.length === 0) return null;
  const newest = workspaces[0]; // dashboard order: newest first

  const due = srsDueCount();
  if (due > 0) {
    return {
      cta: "Review flashcards",
      reason: `${due} flashcard${due > 1 ? "s are" : " is"} due for spaced review — catching them now is when it sticks.`,
      href: `/workspace/${newest.id}/overview`,
    };
  }

  if (hasUnfinishedSession()) {
    return {
      cta: "Resume your lesson",
      reason: "You have an unfinished tutoring session in your most recent workspace.",
      href: `/workspace/${newest.id}/overview`,
    };
  }

  // Weakest workspace that's been started (mastery > 0) but isn't solid yet.
  const masteries = await Promise.all(
    workspaces.slice(0, 6).map(async (w) => ({ w, m: await fetchWorkspaceMastery(w.id) })),
  );
  const weakest = masteries
    .filter(({ m }) => m > 0 && m < 70)
    .sort((a, b) => a.m - b.m)[0];
  if (weakest) {
    return {
      cta: "Review weak concepts",
      reason: `“${weakest.w.title}” is at ${weakest.m}% mastery — a focused review closes the gap fastest.`,
      href: `/workspace/${weakest.w.id}/review`,
    };
  }

  return {
    cta: "Continue learning",
    reason: `Pick up “${newest.title}” — the next chapter is waiting.`,
    href: `/workspace/${newest.id}/overview`,
  };
}
