# 📄 PRISM LEARNING AI
## Document 5: Tech Stack & Architecture

### 1. Frontend

- **Framework:** Next.js 14 (App Router) & React 18, TypeScript throughout.
- **Styling:** Tailwind CSS & shadcn/ui (pinned to `2.3.0` for Tailwind v3 compatibility).
- **State management:** Zustand — the reducer that turns the AI's structured `ui_action`
  JSON into real DOM effects (scroll, highlight, stepper, mini-game spawn).
- **Animation:** Framer Motion — chat bubble transitions, level-up bursts, page transitions.
- **Content rendering:** `react-markdown` + `remark-gfm`/`remark-math`/`remark-breaks` +
  `rehype-katex` (LaTeX math) + `react-syntax-highlighter` (fenced code blocks) —
  deliberately no raw-HTML plugin (see `04_Security.md` §4).
- **Diagramming:** `mermaid.js` — renders the AI's markdown flowchart/mindmap code as
  interactive visuals.
- **Voice:** native Web Speech API (`SpeechRecognition` for input, `speechSynthesis` for
  output) — no third-party voice vendor.
- **Auth:** Clerk (`@clerk/nextjs@6`).
- **Export:** jsPDF, client-side, for flashcard and quiz PDF exports.

### 2. Backend

- **Framework:** Python 3.11, FastAPI — async, long-lived process (not a serverless
  function; see the Render deployment notes in the root `README.md`).
- **Validation:** Pydantic v2 — every request and AI response is strictly typed and
  validated before it reaches application logic or the client.
- **Auth verification:** PyJWT + `PyJWKClient`, live RS256 verification against Clerk's
  JWKS endpoint on every protected route — not a placeholder.
- **Extraction:** `pdfplumber` (PDF text layers), `python-pptx` (slide decks),
  `youtube-transcript-api` (video captions, proxy-aware for cloud deployments).
- **Persistence:** `supabase-py`, offloaded to worker threads (`anyio.to_thread`) since the
  client is synchronous — keeps the async event loop unblocked.

### 3. AI & Infrastructure

- **Tutoring, ingestion, quiz generation:** OpenAI's open-weight `gpt-oss-120b`, served via
  Fireworks AI's serverless inference platform, running on AMD Instinct™ GPUs.
- **Flashcard generation:** Gemma 3 27B via Fireworks AI, a task-level override
  (`GEMMA_FLASHCARDS_MODEL`) for a short, templated extraction job — a deliberate model
  right-sizing decision, not a fallback.
- **Enterprise tutoring path:** Gemma 4, self-hosted on AMD Instinct™ GPUs via AMD
  Developer Cloud (`AI_PROVIDER=amd_cloud`) — a real, schema-tested code path, gated off by
  default since it requires a dedicated GPU deployment. See
  `07_AMDGemmaDeployment.md`.
- **Database & auth:** Supabase (PostgreSQL + Row Level Security), Clerk.
- **Deployment:** Render (backend, standard web service) + Vercel (frontend), Docker
  Compose for local full-stack development.

### 4. System Architecture Flow

1. **Client → FastAPI:** the browser uploads a document or sends a chat/quiz request.
2. **FastAPI → extractor:** raw text is pulled from the source (no OCR, no video download).
3. **FastAPI → Fireworks AI:** text + the relevant `[MODE]` prompt is sent to the model in
   play for that task (gpt-oss-120b by default, Gemma 3 27B for flashcards).
4. **Fireworks AI → FastAPI:** the model returns strict JSON; Pydantic validates it before
   anything downstream touches it.
5. **FastAPI → Supabase:** the validated result is persisted, scoped to the authenticated
   user.
6. **The agentic loop:** the frontend's Zustand store reads the same validated JSON and
   drives the UI directly — no intermediate "the AI suggests..." layer, the response *is*
   the state update.
