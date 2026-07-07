# 📄 PRISM LEARNING AI
## Document 2: UI/UX & Component Architecture (PRD)

### 1. INFORMATION ARCHITECTURE (Pages & Routing)
*   **`/`** - Marketing Landing Page (Hero section with animated Mock Chat).
*   **`/sign-in` & `/sign-up`** - Clerk Auth routes (Glassmorphic containers).
*   **`/dashboard`** - User Hub. Displays a grid of created Workspaces and the main Drag & Drop upload zone.
*   **`/workspace/[id]`** - The active learning environment (The 3-Pane interface).

### 2. THE 3-PANE DESKTOP LAYOUT
The `/workspace/[id]` route utilizes a resizable, 3-pane glassmorphic layout:

#### A. Left Panel: The Navigation Sidebar
*Based on the provided accordion-style reference image.*
*   **Top:** "Back to Dashboard" button.
*   **Accordion 1 - Curriculum:** Dropdown containing dynamic links to generated Chapters/Headings. Clicking one auto-scrolls the center pane.
*   **Accordion 2 - Assessments:** Dropdown containing links to generated 'Quizzes' and 'Flashcard Decks'.
*   **Accordion 3 - Settings:** Dropdown for 'Study Mode' (Technical vs. Conceptual) and Audio/TTS toggles.
*   **Bottom Anchor:** A prominent, sticky `[⬇ Export PDF]` button.

#### B. Center Panel: The Main Canvas
*   Displays the active content (The Markdown Reviewer Document, Mermaid diagrams, or the active Quiz UI).
*   **Agentic Highlighting:** Text blocks are wrapped in `<span>` tags with unique IDs. When Lumi refers to a specific concept, the text subtly glows purple.

#### C. Right Panel: Agentic Tutor (Lumi)
*   The dedicated chat UI. Contains Lumi (the 3D Prism Mascot) at the top.
*   Includes the DataCamp-style "Progress Stepper" (e.g., Step 1 -> Step 2) locked to the top of the chat viewport.

### 3. THE "WOW FACTOR" AGENTIC MICRO-INTERACTIONS
To make the AI feel alive and deeply integrated with the user's screen:
1.  **Agentic Viewport Control:** If Lumi says, *"Let's look at the formula for Velocity,"* the AI sends an action payload that automatically scrolls the Center Panel to the exact location of that formula.
2.  **Dynamic Highlighting:** While Lumi is teaching a specific step, that corresponding paragraph in the center pane gets a soft `#D1FAE5` (Mint) or `#F5F3FF` (Purple) highlight to guide the user's eyes.
3.  **Text-To-Speech (TTS):** 
    *   Integrated via the native Web Speech API (or ElevenLabs for premium quality). 
    *   When TTS is active, the Lumi Mascot gently pulses/rotates in sync with the audio.
4.  **Dopamine Feedback:** When a user passes a step (`is_correct: true`), the chat bubble flashes a soft green glow, a subtle UI *ding* sound plays, and the UI automatically slides the next question up smoothly (via Framer Motion).

### 4. MOBILE EXPERIENCE
*   The 3-pane layout transforms into a single-pane view with a sticky **Bottom Navigation Bar**.
*   **Tabs:** 📖 Reviewer, ✨ Lumi Chat, 🧠 Assessments, ⚙️ Menu.
*   *Note:* The "Agentic Viewport Control" still works on mobile; if the user is in the chat tab and Lumi triggers a document highlight, a small toast notification says *"View document to see highlight"* allowing them to tap over.

### 5. DUAL-ONBOARDING FLOW
To ensure zero friction for new users, the app uses a dual-tutorial system (darkened screen with spotlight highlights):
1.  **Dashboard Tutorial:** Triggers on account creation. Highlights the Upload Box: *"Drop your syllabus, presentation, or video here to begin."*
2.  **Workspace Tutorial:** Triggers the first time they open a `/workspace/[id]`. 
    *   Highlight Center: *"Here is your AI-condensed study guide."*
    *   Highlight Right: *"And I am Lumi. I'll read this document and teach it to you step-by-step. Let's start!"*

### 6. CORE REACT COMPONENTS TO BUILD (Dev Checklist)
*   `[ ] <SidebarAccordion />` (Left nav, collapsible sections)
*   `[ ] <DocumentViewer />` (Center pane, handles Markdown rendering and targeted scrolling)
*   `[ ] <MermaidDiagram />` (Renders interactive flowcharts)
*   `[ ] <LumiChatUI />` (Right pane, handles message mapping and Framer Motion slide-ups)
*   `[ ] <StepProgressStepper />` (The DataCamp progress bar)
*   `[ ] <InteractiveQuizModal />` (The assessment UI that overlays the center pane)
*   `[ ] <MascotLumi />` (The CSS/3D animated prism logo)