import type { TocEntry } from "@/types/prism";

/**
 * Per-concept mastery.
 *
 * Starts at 0% for every concept and only rises from REAL interaction —
 * completing a mini-game in the tutor (store.completeBlockGame boosts the
 * chapter's anchor), the diagnostic assessment, or a weakness-review answer.
 * (A previous version derived a fake 18-97% "starting" mastery from a hash of
 * the anchor id, which made every fresh, untouched document immediately show
 * high mastery and 3-strike "needs review" flags before the student had done
 * anything — a real bug, not a feature.) Persisted to localStorage until the
 * backend's concept_mastery table is wired up on the frontend.
 */

export interface ConceptMastery {
  anchorId: string;
  title: string;
  strength: number; // 0–100, 0 = never attempted
  strikes: number; // failed attempts (0 = never failed OR never attempted)
}

const BOOST_KEY = "prism_mastery_boost";

function readBoosts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(BOOST_KEY) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

/** Persist mastery gained by actually engaging with a concept. */
export function boostConcept(anchorId: string, amount: number): void {
  if (typeof window === "undefined") return;
  try {
    const boosts = readBoosts();
    boosts[anchorId] = Math.min(100, (boosts[anchorId] ?? 0) + amount);
    localStorage.setItem(BOOST_KEY, JSON.stringify(boosts));
  } catch {
    /* non-fatal */
  }
}

/** True mastery: 0 until the student has actually engaged with this concept. */
export function conceptStrength(anchorId: string): number {
  return Math.min(100, readBoosts()[anchorId] ?? 0);
}

function strikesFor(strength: number): number {
  if (strength === 0) return 0; // never attempted is not a "miss"
  if (strength < 32) return 3;
  if (strength < 45) return 2;
  if (strength < 58) return 1;
  return 0;
}

export function chapterMastery(toc: TocEntry[]): ConceptMastery[] {
  return toc.map((c) => {
    const strength = conceptStrength(c.anchor_id);
    return { anchorId: c.anchor_id, title: c.title, strength, strikes: strikesFor(strength) };
  });
}

export function overallMastery(toc: TocEntry[]): number {
  if (!toc.length) return 0;
  return Math.round(chapterMastery(toc).reduce((s, c) => s + c.strength, 0) / toc.length);
}

/** Only concepts the student has actually attempted AND is still weak on —
 *  never-touched concepts (strength 0) are not "needing review", they're just new. */
export function needsReview(toc: TocEntry[]): ConceptMastery[] {
  return chapterMastery(toc)
    .filter((c) => c.strength > 0 && c.strikes > 0)
    .sort((a, b) => a.strength - b.strength);
}
