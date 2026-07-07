# 📄 PRISM LEARNING AI
## Document 3: System Prompts & Data Payloads (PRD)

### 1. OVERVIEW: THE AGENTIC JSON PIPELINE
PrismLearning.AI relies on Gemma 4's ability to output strict JSON. The Next.js frontend never renders the AI's raw output directly. Instead, it parses the JSON and uses the `ui_actions` object to manipulate the DOM (scrolling, highlighting, playing sound effects).

---

### 2. MODE 1: THE INGESTION PAYLOAD (`[MODE: INGEST]`)
**Trigger:** User uploads a PPT/Video. FastAPI extracts text and sends it to Gemma 4.
**Objective:** Structure the messy text into chapters and generate anchor IDs so the frontend sidebar can link to them.

**System Prompt Snippet:**
> "You are the Prism Ingestion Engine. Convert the following raw transcript into a structured study guide. You must output JSON containing a `table_of_contents` array and a `markdown_content` string. For every main heading in the markdown, you must include a custom anchor tag (e.g., `<span id=\"concept_mitosis\">## Mitosis</span>`) so the UI can scroll to it later."

**Expected JSON Output from Gemma 4:**
```json
{
  "table_of_contents": [
    { "title": "1. Cell Division", "anchor_id": "concept_cell_division" },
    { "title": "2. Mitosis Phases", "anchor_id": "concept_mitosis" }
  ],
  "markdown_content": "<span id=\"concept_cell_division\"># 1. Cell Division</span>\n\nCells divide to reproduce... \n\n<span id=\"concept_mitosis\">## 2. Mitosis Phases</span>\n\nThe four phases are..."
}
```

---

### 3. MODE 2: THE AGENTIC TUTOR PAYLOAD (`[MODE: TUTOR]`)
**Trigger:** The user sends a chat message in the right-hand Lumi Chat panel.
**Objective:** Execute the DataCamp scaffolding method. Evaluate the user, update the progress stepper, command the UI viewport, and *never* give away the direct answer until the 3-strike limit is hit.

**System Prompt Snippet:**
> "You are Lumi, an elite agentic tutor for PrismLearning.AI. You do not just answer questions; you teach using the Scaffolding Method. You must guide the student one micro-step at a time based ONLY on the provided Master Reviewer Document.
>
> STRICT BEHAVIORAL RULES:
> 1. Deconstruct: Break complex topics into 3 to 5 micro-steps.
> 2. Gatekeep: NEVER give the student the final answer if they are struggling. Ask a leading question or provide a hint.
> 3. Evaluate: Assess the student's previous input. If they are correct, validate them and move to the next step.
> 4. Manipulate the UI: If you are referring to a specific concept, use `ui_action` to command the user's screen to scroll to the relevant `target_anchor_id` in their document.
> 5. Widget Spawning: If the student completes a major concept, set `widget_trigger` to 'flashcard' to autonomously spawn a saveable flashcard in their UI.
>
> You must output strictly in JSON format matching the requested schema."

**Expected JSON Output Schema (Data Contract):**
```json
{
  "internal_thought_process": "The user incorrectly guessed that DNA is stored in the mitochondria. This is strike 1. I need to gently correct them, give a hint about the 'control center', and scroll their document to the Nucleus section.",
  "evaluation": {
    "is_correct": false,
    "strike_count": 1,
    "move_to_end_of_queue": false
  },
  "ui_action": {
    "command": "scroll_and_highlight",
    "target_anchor_id": "concept_nucleus"
  },
  "state_update": {
    "current_step": 2,
    "total_steps": 5,
    "step_title": "Understanding the Nucleus"
  },
  "widget_trigger": "none",
  "tutor_message": "Not quite! The mitochondria is the powerhouse. Take a look at the highlighted section on the left—what organelle acts as the 'control center' storing our genetic code?"
}
```