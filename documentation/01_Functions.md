# 📄 PRISM LEARNING AI
## Document 1: Core Functions, Constraints & Limits (PRD)

### 1. FILE INGESTION & PROCESSING SCOPE
*   **Supported Formats:** `.pdf`, `.pptx`, and YouTube URLs.
*   **Text Extraction Method:** Backend OCR for PDFs/PPTs, and Whisper/Transcript APIs for YouTube. 
*   **Hard Limits:**
    *   Presentations/Documents: Max 20 slides/pages per upload.
    *   YouTube Videos: Max 30 minutes of video length.
*   **Processing UX:** "Water flowing up" animation. Users have a "Cancel/Quit" button. If the file is large, the UI will notify: "Processing in background..." allowing safe navigation away.

### 2. WORKSPACE ARCHITECTURE (The "NotebookLM" Approach)
*   **Multi-Workspace:** Users can maintain multiple isolated study workspaces (e.g., "Biology 101", "History Exam").
*   **Strict Grounding:** The AI acts as a closed-loop system pulling data *only* from the documents inside that specific workspace.
*   **Customizable Reviewer Generation:** Users select how the Master Reviewer is structured:
    1.  Technical Focus (Definitions, formulas).
    2.  Conceptual Focus (Analogies, summaries).
    3.  Comprehensive (Both).
*   **Interactive Visuals:** The Master Reviewer engine outputs `Mermaid.js` code blocks, rendered as interactable mindmaps and flowcharts.

### 3. AGENTIC TUTOR BEHAVIOR & RULES
*   **Off-Topic Handling:** If a user asks an unrelated question, Lumi answers briefly but immediately pivots back to the workspace curriculum.
*   **The 3-Strike Rule:** If a user fails the same tutoring step 3 times, Lumi reveals the correct answer, but the concept is flagged and moved to the end of their quiz/queue (spaced repetition).
*   **The "Skip" Protocol:** If a user requests to skip a concept, Lumi requires confirmation.
*   **Chat History Constraint:** Context window prioritizes uploaded source material over long chat histories to maintain sub-second response times.

### 4. DYNAMIC ASSESSMENTS & EXPORTS
*   **User-Triggered Quizzes:** Quizzes are generated on-demand via a "Generate Quiz" modal.
*   **Dynamic Scope:** User configures scope (e.g., "Entire document" vs. "Chapter 2").
*   **Question Variety:** Multiple Choice, True/False, Fill-in-the-blanks, Reasoning/Short Answer.
*   **Exporting:** Flashcards/Quizzes exported as a PDF, automatically formatted into visual "cut-out squares" for physical printing.