# 📄 PRISM LEARNING AI
## Document 2: UI/UX & Component Architecture

### 1. Information Architecture

| Route | Purpose |
|---|---|
| `/` | Marketing landing page — hero, feature walkthrough, live compliance/AMD statement in the footer (visible unauthenticated). |
| `/sign-in`, `/sign-up` | Clerk auth, styled as a single glass container (the previous double-card visual bug is fixed). |
| `/dashboard` | Workspace grid, drag-drop / YouTube upload zone, gamification profile card, daily quests. |
| `/dashboard/workspaces` | Full workspace list view. |
| `/dashboard/analytics` | Mastery-by-workspace and weakness/needs-review rollups. |
| `/dashboard/settings` | Study mode, TTS toggle, and the AI Models card (below). |
| `/workspace/[id]` | The active learning environment — the 3-pane interface. |
| `/workspace/[id]/exam` | Boss-battle / practice-exam arena, chapter-scoped and timed. |
| `/workspace/[id]/overview`, `/workspace/[id]/review` | Document overview and weak-concept review flows. |

### 2. The 3-Pane Desktop Layout

`/workspace/[id]` is a resizable, three-pane glassmorphic layout.

**Left — navigation sidebar (`SidebarAccordion`):** an accordion with Curriculum (dynamic
links to generated chapters, auto-scrolls the center pane on click), Assessments (quizzes
and flashcard decks), and a sticky **Export PDF** action at the base.

**Center — the main canvas (`DocumentViewer`):** the active content — the Markdown
reviewer document, interactive Mermaid diagrams, or the active quiz UI. Headings are
wrapped in anchor `<span>`s with stable IDs; when Lumi refers to a concept, that span
glows purple or mint and the viewport scrolls to it. Locked/unmastered sections render
blurred ("Fog of War") and unblur section-by-section as mastery is proven — not a static
reveal-all, an incremental one tied to real progress.

**Right — the agentic tutor (`LumiChatUI`):** the mascot (a faceted-prism 3D-style mark),
a DataCamp-style step progress indicator pinned to the top of the chat viewport, message
bubbles rendering full markdown (bold, lists, LaTeX, syntax-highlighted code — not plain
text), and a composer with a microphone button for voice input.

### 3. Signature Agentic Micro-Interactions

1. **Agentic viewport control** — the tutor's structured JSON response includes a
   `ui_action` (e.g. `scroll_and_highlight`) with a `target_anchor_id`; the frontend's
   Zustand reducer executes it directly against the DOM. The AI is not describing what
   should happen — it is issuing the command that makes it happen.
2. **Dynamic highlighting** — the referenced paragraph gets a soft mint or purple wash
   synced to the tutoring step in progress.
3. **Text-to-speech** — the native browser Web Speech API (`speechSynthesis`), toggled in
   Settings; no third-party voice vendor. The mascot's idle animation subtly syncs while
   speech is active.
4. **Voice input** — the same Web Speech API's recognition side, wired into the chat
   composer's microphone button; a full round-trip voice conversation, not text-only.
5. **Dopamine feedback** — a correct answer triggers a soft glow, a short affirmative
   sound, and a Framer Motion slide-up into the next step.
6. **Adaptive reading level** — a slider above the document canvas rewrites the active
   chapter's prose in real time, from a simplified (ELI5) pass to a technical one, via a
   dedicated model call rather than a client-side text transform.

### 4. Mobile Experience

The 3-pane layout collapses to a single pane with a sticky bottom navigation bar
(Reviewer · Lumi Chat · Assessments · Menu). Agentic viewport control still fires while a
different tab is active; the document tab surfaces a toast when a highlight is waiting to
be viewed.

### 5. Onboarding — planned, not yet built

A spotlight-tour onboarding flow (dashboard upload-zone callout, first-workspace
walkthrough) is scoped but not implemented. Listed here as a known gap, not a shipped
feature — see `09_Roadmap.md`.

### 6. Core Component Architecture (as built)

- `SidebarAccordion` — collapsible left-nav sections, PDF export entry point.
- `DocumentViewer` — markdown + anchor-span rendering, targeted scroll, Fog-of-War blur.
- `MermaidDiagram` — interactive flowchart/mindmap rendering.
- `LumiChatUI` — message list, markdown rendering, voice I/O, step progress.
- `InteractiveQuizModal` — six question types, confidence check, live grading.
- `PracticeExamArena` — the boss-battle timed exam UI.
- `FlashcardSwiper` — spaced-repetition review UI.
- `WeaknessReview` — surfaces concepts with low strength and repeated misses.
- `Mascot` (Lumi) — the animated prism mark, reused identically across the app, the
  marketing site, and the Remotion promo video.
