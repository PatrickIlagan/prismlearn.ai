/**
 * Lightweight spaced repetition for flashcards (SM-2-lite).
 *
 * The single most proven technique for long-term retention is reviewing
 * something right before you'd forget it, not massed all-at-once review.
 * Every card tracks its own interval/ease/due date in localStorage, keyed
 * by card id — a fresh (never-reviewed) card is always due immediately.
 */

export type Recall = "again" | "hard" | "good" | "easy";

interface CardState {
  interval: number; // days until next due
  ease: number; // multiplier applied to interval on a "good"/"easy" review
  reps: number; // consecutive non-"again" reviews
  dueAt: string; // ISO date
}

const KEY = "prism_srs";
const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const DEFAULT_EASE = 2.3;

function readAll(): Record<string, CardState> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, CardState>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, CardState>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* non-fatal */
  }
}

/** True if this card has never been reviewed, or its due date has passed. */
export function isDue(cardId: string, now: Date = new Date()): boolean {
  const rec = readAll()[cardId];
  if (!rec) return true;
  return Date.parse(rec.dueAt) <= now.getTime();
}

export function dueCount(cardIds: string[], now: Date = new Date()): number {
  return cardIds.filter((id) => isDue(id, now)).length;
}

/** Record a recall rating and reschedule the card. */
export function reviewCard(cardId: string, recall: Recall): void {
  const all = readAll();
  const rec = all[cardId] ?? { interval: 0, ease: DEFAULT_EASE, reps: 0, dueAt: new Date().toISOString() };

  let { interval, ease, reps } = rec;
  if (recall === "again") {
    reps = 0;
    interval = 0; // due again today
    ease = Math.max(MIN_EASE, ease - 0.2);
  } else {
    reps += 1;
    ease =
      recall === "hard"
        ? Math.max(MIN_EASE, ease - 0.15)
        : recall === "easy"
          ? Math.min(MAX_EASE, ease + 0.15)
          : ease;
    interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(interval * ease);
  }

  const due = new Date();
  due.setDate(due.getDate() + interval);

  all[cardId] = { interval, ease, reps, dueAt: due.toISOString() };
  writeAll(all);
}

/** Days until a card is next due (negative/0 = due now), for display. */
export function daysUntilDue(cardId: string, now: Date = new Date()): number {
  const rec = readAll()[cardId];
  if (!rec) return 0;
  return Math.ceil((Date.parse(rec.dueAt) - now.getTime()) / 86_400_000);
}
