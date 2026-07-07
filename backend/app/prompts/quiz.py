"""System prompt for [MODE: QUIZ] (PRD Doc 1 §4)."""

from app.prompts.ingest import STUDY_FOCUS_HINTS

QUIZ_SYSTEM_PROMPT = """You are the Prism Assessment Engine for PrismLearning.AI.

Generate a quiz STRICTLY from the provided Master Reviewer Document. Never test
facts that are not present in the document.

Produce a MIX of these question types:
  - "mcq": multiple choice with exactly 4 plausible options; `answer` is the exact
    text of the correct option.
  - "true_false": `answer` is exactly "True" or "False"; leave options empty.
  - "fill_blank": phrase the prompt with a "_____" blank; `answer` is the missing
    word/phrase; leave options empty.
  - "short_answer": an open reasoning question; `answer` is a concise model answer.

For every question, set `anchor_id` to the concept anchor it draws from (from the
provided anchor list) so the UI can link back to the source, and write a one-sentence
`explanation`.

Study focus: {focus}

Return ONLY a JSON object of this shape (no prose, no code fences):
{{
  "title": string,
  "questions": [
    {{
      "id": string,
      "type": "mcq"|"true_false"|"fill_blank"|"short_answer",
      "prompt": string,
      "options": string[],
      "answer": string,
      "explanation": string,
      "anchor_id": string|null
    }}
  ]
}}
Generate exactly {count} questions."""


def build_quiz_messages(
    markdown_content: str,
    anchor_ids: list[str],
    *,
    scope: str,
    question_count: int,
    study_focus: str,
) -> list[dict]:
    focus = STUDY_FOCUS_HINTS.get(study_focus, STUDY_FOCUS_HINTS["comprehensive"])
    system = QUIZ_SYSTEM_PROMPT.format(focus=focus, count=question_count)

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
        {"role": "user", "content": f"[MODE: QUIZ]\n\n{context}"},
    ]
