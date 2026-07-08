import type { Flashcard, IngestPayload } from "@/types/prism";

/**
 * The flashcards table is workspace-scoped, not document-scoped (no schema
 * migration for that yet), so a workspace with multiple documents stores all
 * of their decks together. We attribute each card to a document by checking
 * whether its `anchorId` appears in that document's table of contents —
 * anchor ids are namespaced per-reviewer, so collisions across documents in
 * the same workspace are unlikely in practice. Cards with no anchor (rare —
 * only when the model marks a card as spanning the whole document) are kept
 * for every document, since there's no better signal to attribute them by.
 */
export function filterFlashcardsForDocument(
  cards: Flashcard[],
  reviewer: IngestPayload | null,
): Flashcard[] {
  if (!reviewer) return cards;
  const anchors = new Set(reviewer.table_of_contents.map((c) => c.anchor_id));
  return cards.filter((c) => !c.anchorId || anchors.has(c.anchorId));
}
