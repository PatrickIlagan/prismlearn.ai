import type { IngestPayload, Quiz, TutorResponse, WorkspaceSummary } from "@/types/prism";

/**
 * Demo fixtures so the frontend agentic pipeline is fully exercisable before the
 * FastAPI ingestion/tutor endpoints exist. Shapes match the Data Contracts in
 * documentation/03_SystemPrompts.md exactly, so swapping in the real API later
 * is a one-line change in lib/api.ts.
 */

export const MOCK_WORKSPACES: WorkspaceSummary[] = [
  { id: "bio-101", title: "Biology 101", sourceType: "pptx", conceptCount: 5, createdAt: "2026-07-01" },
  { id: "history-exam", title: "History Exam", sourceType: "pdf", conceptCount: 8, createdAt: "2026-06-28" },
  { id: "ml-crash", title: "ML Crash Course", sourceType: "youtube", conceptCount: 6, createdAt: "2026-06-20" },
];

export const MOCK_INGEST: IngestPayload = {
  table_of_contents: [
    { title: "1. The Cell", anchor_id: "concept_cell" },
    { title: "2. The Nucleus", anchor_id: "concept_nucleus" },
    { title: "3. Mitochondria", anchor_id: "concept_mitochondria" },
    { title: "4. Cell Division", anchor_id: "concept_division" },
  ],
  markdown_content: [
    `# <span id="concept_cell">1. The Cell</span>`,
    ``,
    `The **cell** is the basic structural and functional unit of all living organisms. Cells are often called the "building blocks of life."`,
    ``,
    `\`\`\`mermaid`,
    `graph TD`,
    `  A[Cell] --> B[Nucleus]`,
    `  A --> C[Mitochondria]`,
    `  A --> D[Cytoplasm]`,
    `  B --> E[DNA / Genetic Code]`,
    `\`\`\``,
    ``,
    `## <span id="concept_nucleus">2. The Nucleus</span>`,
    ``,
    `The **nucleus** is the control center of the cell. It stores the cell's genetic material (DNA) and coordinates activities such as growth, metabolism, and reproduction.`,
    ``,
    `> Think of the nucleus as the "command headquarters" — every instruction the cell follows originates here.`,
    ``,
    `## <span id="concept_mitochondria">3. Mitochondria</span>`,
    ``,
    `The **mitochondria** are the powerhouse of the cell. They generate ATP, the chemical energy that powers cellular processes. Unlike the nucleus, they do *not* store the primary genetic blueprint.`,
    ``,
    `## <span id="concept_division">4. Cell Division</span>`,
    ``,
    `Cells reproduce through **division**. The two main types are *mitosis* (producing identical cells) and *meiosis* (producing gametes with half the chromosomes).`,
    ``,
  ].join("\n"),
};

/**
 * Deterministic canned tutor turns keyed by student attempt count, so the demo
 * shows the 3-strike scaffolding loop, scroll_and_highlight, the stepper, and
 * autonomous flashcard spawning.
 */
export const MOCK_TUTOR_TURNS: TutorResponse[] = [
  {
    internal_thought_process:
      "Opening the lesson. Ask a leading question about where genetic code is stored and point them at the nucleus section.",
    evaluation: { is_correct: null, strike_count: 0, move_to_end_of_queue: false },
    ui_action: { command: "scroll_and_highlight", target_anchor_id: "concept_nucleus" },
    state_update: { current_step: 1, total_steps: 4, step_title: "Locating the Genetic Code" },
    widget_trigger: "none",
    tutor_message:
      "Let's start with the basics! I've highlighted a section on the left. Which organelle acts as the 'control center' that stores the cell's DNA?",
  },
  {
    internal_thought_process:
      "Student guessed mitochondria — strike 1. Gently correct, hint about the 'powerhouse vs control center' distinction, keep them on the nucleus.",
    evaluation: { is_correct: false, strike_count: 1, move_to_end_of_queue: false },
    ui_action: { command: "scroll_and_highlight", target_anchor_id: "concept_mitochondria" },
    state_update: { current_step: 1, total_steps: 4, step_title: "Locating the Genetic Code" },
    widget_trigger: "none",
    tutor_message:
      "Not quite! The mitochondria is the *powerhouse* — it makes energy, not genetic code. Look again at the highlighted section: which part is described as the 'command headquarters'?",
  },
  {
    internal_thought_process:
      "Student answered 'nucleus' correctly. Validate, spawn a flashcard for this completed concept, advance the stepper, and move to mitochondria's function.",
    evaluation: { is_correct: true, strike_count: 1, move_to_end_of_queue: false },
    ui_action: { command: "scroll_and_highlight", target_anchor_id: "concept_nucleus" },
    state_update: { current_step: 2, total_steps: 4, step_title: "The Powerhouse" },
    widget_trigger: "flashcard",
    tutor_message:
      "Exactly right — the **nucleus** stores the DNA and directs the cell! 🎉 I've saved a flashcard for you. Next: what molecule do the mitochondria produce to power the cell?",
  },
];

/** Canned quiz so the assessment modal is fully demonstrable without the backend. */
export const MOCK_QUIZ: Quiz = {
  title: "Cell Biology — Quick Check",
  questions: [
    {
      id: "q1",
      type: "mcq",
      prompt: "Which organelle acts as the cell's control center, storing its DNA?",
      options: ["Mitochondria", "Nucleus", "Cytoplasm", "Ribosome"],
      answer: "Nucleus",
      explanation: "The nucleus stores genetic material and directs cell activity.",
      anchor_id: "concept_nucleus",
    },
    {
      id: "q2",
      type: "true_false",
      prompt: "The mitochondria store the cell's primary genetic blueprint.",
      options: [],
      answer: "False",
      explanation: "Mitochondria produce ATP (energy); the nucleus stores DNA.",
      anchor_id: "concept_mitochondria",
    },
    {
      id: "q3",
      type: "fill_blank",
      prompt: "Mitochondria generate _____, the chemical energy that powers the cell.",
      options: [],
      answer: "ATP",
      explanation: "ATP is the energy currency produced by mitochondria.",
      anchor_id: "concept_mitochondria",
    },
    {
      id: "q4",
      type: "short_answer",
      prompt: "In one sentence, explain the difference between mitosis and meiosis.",
      options: [],
      answer:
        "Mitosis produces two identical cells, while meiosis produces gametes with half the chromosomes.",
      explanation: "Mitosis = identical body cells; meiosis = gametes for reproduction.",
      anchor_id: "concept_division",
    },
  ],
};
