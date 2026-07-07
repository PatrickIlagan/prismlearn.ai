import type { TocEntry } from "@/types/prism";

/**
 * Per-concept mastery.
 *
 * Deterministic mock derived from the anchor id until the `concept_mastery`
 * table (06_DatabaseArchitecture.md) is wired. Every gamification surface — the
 * lobby stats, the "Needs Review" list, the chapter radar, and the tutor
 * stepper — reads from here, so swapping in real data is a one-file change.
 */

export interface ConceptMastery {
  anchorId: string;
  title: string;
  strength: number; // 0–100
  strikes: number; // failed attempts (0 = never failed)
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

/** Persist mastery gained by reviewing a concept (until real data lands). */
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

export function conceptStrength(anchorId: string): number {
  let h = 2166136261;
  for (let i = 0; i < anchorId.length; i++) {
    h ^= anchorId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const base = 18 + (Math.abs(h) % 80); // 18–97
  return Math.min(100, base + (readBoosts()[anchorId] ?? 0));
}

function strikesFor(strength: number): number {
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

export function needsReview(toc: TocEntry[]): ConceptMastery[] {
  return chapterMastery(toc)
    .filter((c) => c.strikes > 0)
    .sort((a, b) => a.strength - b.strength);
}
