# 🔷 PrismLearning.AI

> An enterprise-grade, source-grounded EdTech application. Upload a PDF, PowerPoint, or
> YouTube video and PrismLearning.AI turns it into an interactive study workspace with an
> agentic AI tutor ("Lumi"), auto-generated reviewers, quizzes, and printable flashcards.
>
> Built for the AMD / Fireworks AI Hackathon.

---

## 1. What it is

PrismLearning.AI follows a **NotebookLM-style closed-loop** model: every AI response is
grounded **only** in the documents inside a given workspace. The signature feature is the
**Agentic JSON Pipeline** — the AI never renders raw text to the user. Instead it returns
strict JSON, and the frontend parses that JSON to *manipulate the UI directly*: scrolling
the document, glowing a concept purple/mint, advancing a progress stepper, spawning a
flashcard, and playing feedback sounds.

There are three AI "modes", each a strict JSON contract:

| Mode | Trigger | Output |
|------|---------|--------|
| `[MODE: INGEST]` | User uploads a source | A structured Master Reviewer (table of contents + anchored markdown) |
| `[MODE: TUTOR]`  | User chats with Lumi | An evaluation + `ui_action` + stepper state + optional flashcard spawn |
| `[MODE: QUIZ]`   | User clicks "Generate Quiz" | A mixed-type quiz grounded in the reviewer |

See [`documentation/`](documentation/) for the full 6-part product spec.

---

## 2. Tech stack

**Frontend** — Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui (pinned to
`2.3.0` for Tailwind v3) · Zustand (agentic UI state) · Framer Motion · Mermaid.js ·
react-markdown + rehype-raw (renders the AI's anchored HTML spans) · jsPDF (client-side
exports) · Clerk (auth, `@clerk/nextjs@6`).

**Backend** — Python 3.11 · FastAPI · Pydantic v2 · `openai` SDK pointed at Fireworks ·
`python-pptx` / `pdfplumber` / `youtube-transcript-api` (extraction) · `supabase-py`
(persistence) · PyJWT (Clerk verification, planned).

**AI & infra** — Gemma (served via Fireworks AI) · Supabase (PostgreSQL + RLS) · Clerk
(auth) · Docker Compose.

---

## 3. Architecture

```
┌───────────────┐   upload / chat / quiz    ┌────────────────┐   [MODE] + text   ┌──────────────┐
│   Next.js 14  │ ────────────────────────► │    FastAPI     │ ────────────────► │  Fireworks   │
│  (frontend)   │                           │   (backend)    │                   │  (Gemma)     │
│               │ ◄──────────────────────── │                │ ◄──────────────── │              │
│  Zustand store│    strict JSON payloads   │  Pydantic      │   validated JSON  └──────────────┘
│  drives the   │                           │  validation    │
│  UI directly  │                           │      │         │        ┌──────────────┐
└───────────────┘                           │      └────────────────► │   Supabase   │
                                            └────────────────┘  store  │  (Postgres)  │
                                                                       └──────────────┘
```

**The agentic loop:** frontend sends a chat message → FastAPI loads the workspace's reviewer
→ sends reviewer + message + `[MODE: TUTOR]` to Gemma → Gemma returns a `TutorResponse` JSON
→ FastAPI validates it → frontend's Zustand `applyTutorResponse` reducer fans it out into
scroll, highlight, stepper update, flashcard spawn, and a sound.

---

## 4. Repository structure

```
PrismLearn/
├── docker-compose.yml            # runs frontend + backend containers
├── README.md                     # this file
├── documentation/                # 6-part product + architecture spec
│   ├── 01_Functions.md
│   ├── 02_UI_UX.md
│   ├── 03_SystemPrompts.md
│   ├── 04_Security.md
│   ├── 05_TechStack.md
│   └── 06_DatabaseArchitecture.md
├── backend/
│   ├── Dockerfile · requirements.txt · .env.example
│   └── app/
│       ├── main.py               # FastAPI app + router registration
│       ├── core/                 # config (pydantic-settings) + auth dependency
│       ├── schemas/              # Pydantic contracts (ingest, tutor, quiz, workspace)
│       ├── prompts/              # the three [MODE] system prompts
│       ├── services/             # extractors (pptx/pdf/youtube) + fireworks client
│       ├── db/                   # repository pattern: base, memory, supabase, schema.sql
│       └── routers/              # ingest, workspaces, tutor, quiz
└── frontend/
    └── src/
        ├── app/                  # /, /dashboard, /workspace/[id]
        ├── components/prism/     # DocumentViewer, LumiChatUI, InteractiveQuizModal, …
        ├── store/                # useWorkspaceStore (the agentic reducer)
        ├── lib/                  # api.ts (the mock/live seam), exportPdf, mockData, sounds
        └── types/prism.ts        # data contracts (kept in lockstep with backend Pydantic)
```

---

## 5. Feature & integration status

Legend: ✅ built & verified · 🟡 built, credential-gated (untestable without keys) · ⬜ planned

### Frontend (feature-complete in mock mode)
- ✅ Marketing landing page + dashboard with drag-drop / YouTube upload zone
- ✅ 3-pane resizable glassmorphic workspace (sidebar accordion · document · Lumi chat)
- ✅ `DocumentViewer` — markdown + anchored spans + interactive Mermaid diagrams
- ✅ **Agentic UI pipeline** — scroll-to-concept, purple/mint glow, stepper, flashcard spawn, dopamine ding
- ✅ Lumi chat with the DataCamp-style progress stepper
- ✅ `InteractiveQuizModal` — 4 question types, live grading, score summary
- ✅ Client-side PDF export — flashcards (cut-out squares) **and** quizzes (+ answer key)
- ✅ Live dashboard grid (created workspaces appear first)
- ✅ Mobile single-pane view with bottom nav
- ⬜ Onboarding spotlight tours · TTS pulse polish

### Backend
- ✅ `POST /ingest/file` · `POST /ingest/youtube` — extraction + `[MODE: INGEST]` + persist
- ✅ `GET /workspaces` · `GET /workspaces/{id}/reviewer`
- ✅ `GET|POST /workspaces/{id}/flashcards`
- ✅ `POST /workspaces/{id}/tutor` — `[MODE: TUTOR]`, reviewer loaded server-side
- ✅ `POST /workspaces/{id}/quiz` — `[MODE: QUIZ]`
- ✅ Repository pattern: in-memory (default) + Supabase impl, auto-selected by config
- ✅ Hard limits (20 pages/slides, 30 min video), prompt-injection isolation, guardrails
- 🟡 Live Gemma inference — wired & shape-validated; needs a real `FIREWORKS_API_KEY` + model id
- 🟡 Supabase persistence — implemented; needs real project URL + service-role key
- ⬜ Clerk JWT verification — currently a dev stub (`X-User-Id` header); see §7

> **Why the 🟡 items aren't "done":** this build was developed without live vendor
> credentials. All request/response plumbing around them is complete and tested with stubs;
> they activate by filling in `.env`.

---

## 6. Running locally

### Prerequisites
- Node.js 20+, Python 3.11, (Docker optional)

### A. Quickest path — frontend in mock mode (no backend, no keys)
```powershell
cd frontend
npm install
npm run dev          # http://localhost:3000
```
The whole experience runs on canned fixtures. Uploads return a sample "Cell Biology"
reviewer; the tutor and quizzes use mock payloads.

### B. Full stack (live AI)
1. Backend env — copy and fill `backend/.env`:
   ```
   FIREWORKS_API_KEY=fw_...
   FIREWORKS_MODEL=accounts/fireworks/models/<gemma-model-id>
   SUPABASE_URL=https://<ref>.supabase.co        # optional; in-memory fallback if unset
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
2. Frontend env — add to `frontend/.env.local`:
   ```
   NEXT_PUBLIC_USE_MOCKS=false
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
3. Run both:
   ```powershell
   # backend
   cd backend; python -m venv venv; .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload            # http://localhost:8000

   # frontend (separate terminal)
   cd frontend; npm run dev
   ```
   Or `docker compose up --build` from the repo root.

---

## 7. The mock/live seam

Everything routes through **`frontend/src/lib/api.ts`**. A single flag,
`NEXT_PUBLIC_USE_MOCKS` (default `true`), switches every call between canned fixtures and
real `fetch()`s to FastAPI. The component layer is identical in both modes — this is what
lets the UI be fully demonstrable today and go live by flipping one env var.

Two bridges exist only while credentials are absent and disappear once Supabase/Clerk land:
- **Reviewer session cache** — an ingested reviewer is stored in `sessionStorage` so
  navigation/refresh work without a database.
- **User identity** — the backend reads an `X-User-Id` header (defaulting to `dev-user`)
  instead of verifying a Clerk JWT.

---

## 8. Security posture (see `documentation/04_Security.md`)
- **Zero-retention uploads:** raw files are held in memory only during the request and never
  written to storage — only the derived reviewer JSON is persisted.
- **Row Level Security:** Supabase RLS scopes every row to its owner's Clerk id.
- **Prompt-injection isolation:** the student message is always a separate turn from the
  system rules; the tutor prompt refuses system-prompt extraction and academic dishonesty.

See [`documentation/06_DatabaseArchitecture.md`](documentation/06_DatabaseArchitecture.md)
for the full data model, including user accounts.
