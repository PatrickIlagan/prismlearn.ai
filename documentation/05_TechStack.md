# 📄 PRISM LEARNING AI
## Document 5: Tech Stack & Architecture (PRD)

### 1. FRONTEND (The Next.js Container)
*   **Framework:** Next.js 14 (App Router) & React.
*   **Styling:** Tailwind CSS & Shadcn/UI (for rapid, accessible glassmorphic components).
*   **State Management:** Zustand (Handles UI manipulation like auto-scrolling and highlighting triggered by the AI).
*   **Animations:** Framer Motion (for chat bubble slide-ups, shakes on wrong answers, and flashcard flips).
*   **Diagramming:** `mermaid.js` (Renders the AI's markdown flowchart code into interactive visual maps).

### 2. BACKEND (The FastAPI Container)
*   **Framework:** Python 3.11 with FastAPI (High performance, perfect for async data processing).
*   **Data Validation:** Pydantic (Ensures all data moving between Frontend and AI is strictly typed).
*   **Extraction Libraries:** 
    *   `python-pptx` (Extracts text from slides).
    *   `pdfplumber` or `PyPDF2` (Extracts text from PDFs).
    *   `youtube-transcript-api` (Pulls transcripts directly from YT without downloading the video).

### 3. AI & INFRASTRUCTURE
*   **Core Inference Engine:** OpenAI `gpt-oss-120b`, served via Fireworks AI on AMD Instinct
    GPUs for sub-second, hardware-accelerated latency.
*   **Database & Auth:** Supabase (PostgreSQL) and Clerk (Auth).
*   **Containerization:** Docker & Docker Compose.

### 4. SYSTEM ARCHITECTURE FLOW
1.  **Client -> Next.js:** User uploads a document. Next.js passes the file to the FastAPI backend.
2.  **FastAPI -> Parser:** Python extracts the raw text from the file.
3.  **FastAPI -> Fireworks AI:** Python sends the text + `[MODE: INGEST]` prompt to OpenAI `gpt-oss-120b`.
4.  **Fireworks AI -> FastAPI -> Database:** AI returns the structured Reviewer JSON. FastAPI saves it to Supabase under the user's ID.
5.  **The Agentic Loop:** Next.js sends chat messages to FastAPI -> FastAPI fetches the Reviewer JSON from Supabase -> Both are sent to OpenAI `gpt-oss-120b` `[MODE: TUTOR]` -> AI returns the UI Action JSON -> Next.js Zustand reads the UI Action and animates the screen.