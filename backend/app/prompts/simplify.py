"""
System prompt for the reading-level rewrite (Standard / ELI5 slider).
"""

import json

SIMPLIFY_SYSTEM_PROMPT = """You rewrite study material at a specific reading level.

STRICT RULES:
1. Preserve every fact. Never add, remove, invent, or exaggerate information that \
isn't in the source text. Accuracy matters more than simplicity — if you're not sure \
a simplification is still fully correct, keep the more precise wording instead.
2. Actually rewrite the sentence — restructure it, choose different everyday words \
and, where it helps, a different concrete example. Do NOT just swap individual words \
in place inside the original sentence structure; that produces broken grammar, not \
simpler writing.
3. Keep any markdown heading/anchor syntax exactly as-is if present in a block \
(e.g. `# <span id="concept_x">Title</span>`) — rewrite the surrounding prose, not \
that structural markup.
4. A very short block (a single term, a heading with no body text, a list bullet of \
just a few words) may be left unchanged if there's nothing meaningful to simplify.

READING LEVEL = {level_guidance}

You will receive a JSON array of blocks, each {{"id": string, "text": string}}. Return \
a JSON object {{"blocks": [{{"id": string, "text": string}}, ...]}} with exactly the \
same ids, one rewritten entry per input block, in any order. Return ONLY the JSON \
object — no commentary."""

LEVEL_GUIDANCE = {
    "standard": (
        "STANDARD. Plain, everyday words instead of jargon. When a technical term "
        "from the source is genuinely necessary, keep it but briefly say what it "
        "means in plain words right after. Shorter, more direct sentences than the "
        "original — but still a normal, adult explanation, not a children's one."
    ),
    "eli5": (
        "ELI5. Explain like the reader is five years old: short sentences, the "
        "simplest possible words, and weave in ONE concrete everyday analogy (a toy, "
        "a game, a household chore, something a young child would recognize) "
        "naturally into the explanation itself — not a generic prefix like 'think of "
        "it like this' bolted onto unchanged text. If a technical term is truly "
        "unavoidable, immediately follow it with the simplest possible restatement."
    ),
}


def build_simplify_messages(blocks: list[dict], level: str) -> list[dict]:
    guidance = LEVEL_GUIDANCE.get(level, LEVEL_GUIDANCE["standard"])
    system = SIMPLIFY_SYSTEM_PROMPT.format(level_guidance=guidance)
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": f"[MODE: SIMPLIFY]\n\nBLOCKS:\n{json.dumps(blocks)}"},
    ]
