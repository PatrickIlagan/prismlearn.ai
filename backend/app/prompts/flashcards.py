"""System prompt for [MODE: FLASHCARDS] — on-demand flashcard deck generation.

Unlike the tutor's incidental widget_trigger flashcards (earned by finishing a
concept), this generates a full deck for a document on demand, regardless of
how far the student has progressed through the tutor.
"""

from app.prompts.ingest import STUDY_FOCUS_HINTS

FLASHCARDS_SYSTEM_PROMPT = """You are the Prism Flashcard Engine for PrismLearning.AI.

Generate a deck of flashcards STRICTLY from the provided Master Reviewer Document.
Never invent facts that are not present in the document.

Each flashcard:
  - "front": a short question, term, or prompt (one line).
  - "back": a concise, complete answer (1-3 sentences).
  - "anchor_id": the concept anchor it draws from (from the provided anchor list),
    so the UI can link the card back to its source, or null if it spans the
    whole document.

Cover a SPREAD of concepts rather than clustering on one — if the document has
multiple sections, draw cards from across all of them.

Study focus: {focus}

Return ONLY a JSON object of this shape (no prose, no code fences):
{{
  "cards": [
    {{ "front": string, "back": string, "anchor_id": string|null }}
  ]
}}
Generate exactly {count} flashcards."""


def build_flashcard_messages(
    markdown_content: str,
    anchor_ids: list[str],
    *,
    scope: str,
    count: int,
    study_focus: str,
) -> list[dict]:
    focus = STUDY_FOCUS_HINTS.get(study_focus, STUDY_FOCUS_HINTS["comprehensive"])
    system = FLASHCARDS_SYSTEM_PROMPT.format(focus=focus, count=count)

    scope_line = (
        "Cover the ENTIRE document."
        if scope == "all"
        else f"Focus ONLY on the concept with anchor id '{scope}'."
    )
    context = (
        f"MASTER REVIEWER DOCUMENT:\n{markdown_content}\n\n"
        f"AVAILABLE ANCHOR IDS: {', '.join(anchor_ids) or '(none)'}\n\n"
        f"SCOPE: {scope_line}"
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": f"[MODE: FLASHCARDS]\n\n{context}"},
    ]
