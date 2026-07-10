# 📄 PRISM LEARNING AI
## Document 3: System Prompts & Data Payloads

### 1. Overview: The Agentic JSON Pipeline

PrismLearning.AI relies on structured-output generation, not free-text parsing: every
model call is constrained to a strict JSON schema, and the Next.js frontend never renders
raw model output directly. Instead, it parses the returned JSON and dispatches a
Zustand reducer (`applyTutorResponse` and siblings) that manipulates the UI directly —
scrolling, highlighting, advancing a stepper, spawning a flashcard, playing a sound. The
model is not describing an action; its output *is* the action, validated by Pydantic
before it ever reaches the client.

Three modes, each a distinct JSON contract:

---

### 2. `[MODE: INGEST]`

**Trigger:** a document, video, or URL is uploaded. FastAPI extracts raw text and sends it
for structuring.
**Objective:** turn unstructured source text into a navigable curriculum — a table of
contents with stable anchor IDs the frontend can scroll to, and markdown content with
those same anchors embedded inline.

**Output contract:**
```json
{
  "table_of_contents": [
    { "title": "1. Cell Division", "anchor_id": "concept_cell_division" },
    { "title": "2. Mitosis Phases", "anchor_id": "concept_mitosis" }
  ],
  "markdown_content": "<span id=\"concept_cell_division\"># 1. Cell Division</span>\n\nCells divide to reproduce...\n\n<span id=\"concept_mitosis\">## 2. Mitosis Phases</span>\n\nThe four phases are..."
}
```

---

### 3. `[MODE: TUTOR]`

**Trigger:** the student sends a chat message.
**Objective:** teach one micro-step at a time, grounded strictly in the workspace's Master
Reviewer document — never the model's own general knowledge.

**Behavioral rules (paraphrased from the live system prompt):**
1. **Teach first.** The default posture is hand-holding instruction, not quizzing — the
   tutor withholds an answer only when the student is actively attempting an assessment
   question, never as a blanket policy.
2. **Teach-it-back.** Roughly every two to three concepts, ask the student to explain the
   idea back instead of recapping it yourself.
3. **One `ui_action` per turn**, driving the student's actual screen — see the command
   list below.
4. **Refuse graded-work requests** ("write my essay," "just give me the answers") and
   redirect to the underlying concept.
5. **Stay in scope.** An off-topic question gets a brief, honest answer, then a pivot back
   to the curriculum.

**`ui_action.command` — the real command surface (not illustrative, exhaustive):**
`scroll_and_highlight` · `highlight` · `trigger_cloze` · `trigger_spot_the_lie` ·
`trigger_order` · `trigger_hotspot` · `unlock_chapter` · `none`. The `trigger_*` commands
mutate a document block into a mini-game in place — the tutor doesn't just describe an
exercise, it spawns one.

**Output contract:**
```json
{
  "evaluation": { "is_correct": false },
  "ui_action": {
    "command": "scroll_and_highlight",
    "target_anchor_id": "concept_nucleus"
  },
  "game_payload": null,
  "state_update": {
    "current_step": 2,
    "total_steps": 5,
    "step_title": "Understanding the Nucleus"
  },
  "tutor_message": "Not quite — the mitochondria is the powerhouse. Look at the highlighted section: which organelle acts as the cell's 'control center', storing its genetic code?"
}
```

---

### 4. `[MODE: QUIZ]`

**Trigger:** the student requests a quiz, scoped to the whole document or a chapter.
**Objective:** produce a mixed-type assessment grounded in the reviewer content, with math
and code questions **hard-required** — not optional — whenever the source material
contains worked equations or code listings. This was a deliberate prompt-engineering fix:
early revisions treated question-type variety as a soft preference, which the model
routinely ignored in favor of generic multiple-choice; the current prompt states it as a
hard requirement with concrete JSON few-shot examples, and reasoning effort is raised to
`high` specifically for this mode (math correctness in the `answer` field was silently
wrong at `low`/`medium` effort, confirmed by repeated live generation).

**Output contract (excerpt, math question):**
```json
{
  "type": "math",
  "prompt": "Solve for x: 3x + 7 = 22",
  "answer": "5",
  "tolerance": 0.01,
  "explanation": "3x = 15, so x = 5."
}
```

Grading is tolerance-based for math (not exact-string) and whitespace-normalized for code
(not literal-string), so `x = 5` and `x=5.0` both grade correctly. Every quiz question also
carries a required pre-reveal confidence rating from the student
(`confident` / `unsure`), compared against actual correctness client-side.
