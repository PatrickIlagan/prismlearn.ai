import { scopedKey } from "./userScope";

/**
 * Save-for-Review bookmarks — quiz questions, Lumi explanations, flashcards,
 * concepts. Pure localStorage (per-user via scopedKey, works in demo mode's
 * anon scope too); the /dashboard/saved page lists everything in one place.
 */
export type SavedItemType = "question" | "lumi" | "flashcard" | "concept";

export interface SavedItem {
  id: string;
  type: SavedItemType;
  title: string;
  body: string;
  workspaceId?: string;
  anchorId?: string;
  savedAt: number;
}

const BASE_KEY = "prism_saved";

function readAll(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(scopedKey(BASE_KEY)) || "[]") as SavedItem[];
  } catch {
    return [];
  }
}

function writeAll(items: SavedItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(scopedKey(BASE_KEY), JSON.stringify(items.slice(0, 200)));
  } catch {
    /* storage full/unavailable — non-fatal */
  }
}

export function listSaved(): SavedItem[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function isSaved(id: string): boolean {
  return readAll().some((i) => i.id === id);
}

/** Toggle: saves if absent, removes if present. Returns the new saved state. */
export function toggleSaved(item: Omit<SavedItem, "savedAt">): boolean {
  const all = readAll();
  const idx = all.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    all.splice(idx, 1);
    writeAll(all);
    return false;
  }
  writeAll([{ ...item, savedAt: Date.now() }, ...all]);
  return true;
}

export function removeSaved(id: string): void {
  writeAll(readAll().filter((i) => i.id !== id));
}

export function savedCount(): number {
  return readAll().length;
}
