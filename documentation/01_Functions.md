# 📄 PRISM LEARNING AI
## Document 1: Core Functions, Constraints & Limits

### 1. Ingestion & Processing Scope

- **Supported sources:** `.pdf`, `.pptx`, YouTube URLs, and generic article URLs.
- **Extraction method:** direct text-layer extraction, not OCR — `pdfplumber` for PDFs,
  `python-pptx` for slide decks, `youtube-transcript-api` for video captions. This is a
  deliberate choice, not an oversight: OCR implies scanning rendered pixels, which is
  slower, lossier, and unnecessary for born-digital documents. Scanned-image PDFs with no
  text layer are out of scope for the same reason a resume parser doesn't need a camera.
- **Hard limits**, enforced server-side (not just UI copy):
  - Documents/presentations: 20 pages/slides per upload.
  - YouTube videos: 30 minutes.
  - Upload size: 25 MB, enforced by streaming the file in 1 MiB chunks and rejecting mid-
    stream once the cap is exceeded — a malicious multi-GB upload never fully buffers.
- **YouTube ingestion, cloud caveat:** YouTube blocks transcript requests from cloud-
  provider IP ranges outright. This works without configuration in local development;
  a production deployment needs a residential proxy (Webshare is the supported path — see
  `YOUTUBE_PROXY_*` in `backend/.env.example`) or YouTube ingestion will fail with a clear,
  actionable error rather than an opaque timeout.

### 2. Workspace Architecture

PrismLearning.AI follows a NotebookLM-style closed-loop model: each workspace is an
isolated container, and the AI is grounded **only** in the documents inside the workspace
being studied. A user can maintain any number of workspaces (e.g. "Biology 101",
"Bar Exam Review") with zero cross-contamination between them.

- **Study focus, selected at ingestion:** Technical (definitions, formulas, precise terms),
  Conceptual (analogies, intuition), or Comprehensive (a balance of both) — this shapes how
  the Master Reviewer document is structured, not just its tone.
- **Study mode, set per document and changeable later:** *Learn* (first-time, step-by-step
  teaching) or *Review* (a recap pass that assumes prior exposure) — a genuinely different
  tutoring posture, not a cosmetic label.
- **Interactive visuals:** the ingestion engine emits `mermaid.js` code blocks inline in the
  generated markdown, rendered as interactive flowcharts and mindmaps in the document
  viewer.

### 3. Agentic Tutor Behavior

- **Scaffolded teaching, not answer-dumping:** Lumi decomposes a concept into micro-steps
  and teaches one at a time. It will not hand over a final answer to an assessment question
  the student is actively attempting — hints and leading questions instead, until the
  student either gets there or the interaction naturally resolves.
- **Teach-it-back:** roughly every two to three concepts, Lumi asks the student to explain
  the idea back in their own words instead of the tutor simply recapping it — active
  recall in the tutoring loop itself, not just in flashcards.
- **Off-topic handling:** an unrelated question gets a brief, honest answer, then a pivot
  back to the workspace curriculum.
- **Academic-integrity guardrail:** Lumi refuses to do a student's graded work for them
  ("write my essay," "just give me the answers") and redirects to teaching the underlying
  concept.
- **Confidence-calibrated assessment:** before any quiz answer is revealed, the student
  self-rates their confidence; feedback then compares stated confidence against actual
  correctness, surfacing overconfidence rather than just a right/wrong mark.

### 4. Mastery, Retention & Assessment

- **Concept mastery is earned, not assumed:** every concept starts at 0% and only rises
  from real interaction — completing a tutor-embedded mini-game, a diagnostic check, or a
  weak-concept review. It also **decays** over time since it was last touched (1.5 points/
  day after a one-day grace period), so a concept mastered three weeks ago and never
  revisited stops reading as "mastered."
- **Chapter boss battles:** the first time a student masters a chapter — completing its
  first embedded mini-game — it triggers a themed, timed practice exam scoped to that
  chapter, not a generic quiz bank.
- **Quizzes**, generated on demand and scoped by the user (entire document or a specific
  chapter): six question types — multiple choice, true/false, fill-in-the-blank, short
  answer, **math** (rendered in LaTeX via KaTeX, graded with numeric tolerance rather than
  exact-string matching), and **code** (graded on normalized output, not literal text).
  Math and code questions are a hard requirement, not a "nice to have," whenever the source
  document contains worked equations or code listings.
- **Flashcards** run on real spaced repetition (an SM-2-lite scheduler): recall quality
  determines when a card resurfaces, not a fixed daily batch.
- **Exports:** flashcards and quizzes (with answer key) export client-side to a print-ready
  PDF, formatted as cut-out study cards.
