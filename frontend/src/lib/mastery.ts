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
 *
 * Mastery also DECAYS over time since it was last boosted (the forgetting
 * curve) — a concept you nailed three weeks ago and haven't touched since
 * shouldn't still show 100%. Without this, mastery only ever goes up, which
 * is dishonest and gives no reason to come back and actually re-review.
 */

export interface ConceptMastery {
  anchorId: string;
  title: string;
  strength: number; // 0–100, 0 = never attempted
  strikes: number; // failed attempts (0 = never failed OR never attempted)
}

interface BoostRecord {
  strength: number; // strength AS OF lastBoost, before any decay is applied
  lastBoost: string; // ISO date
}

const BOOST_KEY = "prism_mastery_boost";
const DECAY_PER_DAY = 1.5; // points/day
const DECAY_GRACE_DAYS = 1; // no decay for the first day after a boost

function readBoosts(): Record<string, BoostRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(BOOST_KEY) || "{}") as Record<
      string,
      number | BoostRecord
    >;
    const normalized: Record<string, BoostRecord> = {};
    for (const [anchorId, value] of Object.entries(raw)) {
      // Back-compat: the pre-decay format stored a bare number. Treat those
      // as boosted "now" (no retroactive decay) rather than losing the data.
      normalized[anchorId] =
        typeof value === "number" ? { strength: value, lastBoost: new Date().toISOString() } : value;
    }
    return normalized;
  } catch {
    return {};
  }
}

function decayedStrength(rec: BoostRecord): number {
  const days = (Date.now() - Date.parse(rec.lastBoost)) / 86_400_000;
  const decayDays = Math.max(0, days - DECAY_GRACE_DAYS);
  return Math.max(0, rec.strength - decayDays * DECAY_PER_DAY);
}

/** Persist mastery gained by actually engaging with a concept. */
export function boostConcept(anchorId: string, amount: number): void {
  if (typeof window === "undefined") return;
  try {
    const boosts = readBoosts();
    const current = boosts[anchorId] ? decayedStrength(boosts[anchorId]) : 0;
    boosts[anchorId] = { strength: Math.min(100, current + amount), lastBoost: new Date().toISOString() };
    localStorage.setItem(BOOST_KEY, JSON.stringify(boosts));
  } catch {
    /* non-fatal */
  }
}

/** True mastery: 0 until the student has actually engaged with this concept,
 *  decaying since it was last boosted. */
export function conceptStrength(anchorId: string): number {
  const rec = readBoosts()[anchorId];
  if (!rec) return 0;
  return Math.min(100, Math.round(decayedStrength(rec)));
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
