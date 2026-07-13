import { parseCanvas } from "./canvas";
import type { IngestPayload } from "@/types/prism";

/**
 * Deterministic study-time estimate — no AI. Remaining time is the word
 * count of not-yet-completed chapters at a study reading pace (~150 wpm,
 * slower than skimming because tutoring interleaves questions) plus a flat
 * per-chapter interaction overhead for the tutor exchanges and mini-game
 * each chapter typically involves.
 */
const STUDY_WPM = 150;
const CHAPTER_OVERHEAD_MIN = 2;

export function estimateStudyMinutes(
  reviewer: IngestPayload,
  completedAnchors: string[],
): number {
  const chapters = parseCanvas(reviewer);
  const remaining = chapters.filter((c) => !completedAnchors.includes(c.anchorId));
  if (remaining.length === 0) return 0;
  const words = remaining.reduce(
    (sum, c) => sum + c.blocks.reduce((s, b) => s + b.plain.split(/\s+/).length, 0),
    0,
  );
  return Math.max(1, Math.round(words / STUDY_WPM + remaining.length * CHAPTER_OVERHEAD_MIN));
}

/** "About 8 minutes remaining" / "Done — nothing left to study". */
export function studyTimeLabel(minutes: number): string {
  if (minutes <= 0) return "All chapters complete";
  if (minutes < 60) return `About ${minutes} min remaining`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `About ${h}h ${m ? `${m}m ` : ""}remaining`;
}
