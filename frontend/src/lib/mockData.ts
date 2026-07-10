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
      "Turn the Cell diagram into a hotspot game — have them click the organelle that stores DNA.",
    evaluation: { is_correct: null, strike_count: 0, move_to_end_of_queue: false },
    ui_action: {
      command: "trigger_hotspot",
      target_anchor_id: "concept_cell",
      game_payload: { target: "Nucleus" },
    },
    state_update: { current_step: 1, total_steps: 4, step_title: "Find it on the map" },
    widget_trigger: "none",
    tutor_message:
      "Look at the diagram above — tap the organelle that stores the cell's genetic code.",
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
      "Exactly right — the **nucleus** stores the DNA and directs the cell! 🎉 I've saved a flashcard for you. Let's test that: fill in the blanks I've opened on the left.",
  },
  {
    internal_thought_process:
      "Turn the Nucleus paragraph into a cloze exercise so the student actively recalls the key terms.",
    evaluation: { is_correct: null, strike_count: 1, move_to_end_of_queue: false },
    ui_action: {
      command: "trigger_cloze",
      target_anchor_id: "concept_nucleus",
      game_payload: { blanks: ["nucleus", "DNA"] },
    },
    state_update: { current_step: 3, total_steps: 4, step_title: "Recall: The Nucleus" },
    widget_trigger: "none",
    tutor_message:
      "Type the missing words directly into the paragraph. Which organelle is it, and what does it store?",
  },
  {
    internal_thought_process:
      "Now a spot-the-lie on Mitochondria to check they can distinguish energy vs. genetics.",
    evaluation: { is_correct: true, strike_count: 1, move_to_end_of_queue: false },
    ui_action: {
      command: "trigger_spot_the_lie",
      target_anchor_id: "concept_mitochondria",
      game_payload: {
        lie: "Mitochondria are also where the cell permanently stores its DNA.",
        lie_index: 1,
      },
    },
    state_update: { current_step: 4, total_steps: 4, step_title: "Spot the Lie: Mitochondria" },
    widget_trigger: "none",
    tutor_message:
      "Nice! One of these sentences about the mitochondria is false — click the lie to catch it.",
  },
  {
    internal_thought_process:
      "Student is doing great — unlock the final chapter as a reward.",
    evaluation: { is_correct: true, strike_count: 1, move_to_end_of_queue: false },
    ui_action: { command: "unlock_chapter", target_anchor_id: "concept_division" },
    state_update: { current_step: 4, total_steps: 4, step_title: "Unlocked: Cell Division" },
    widget_trigger: "none",
    tutor_message:
      "You've earned it — I've unlocked **Cell Division** for you. Ready to keep going?",
  },
  {
    internal_thought_process:
      "Reinforce the sequence of mitosis with a drag-to-order game on Cell Division.",
    evaluation: { is_correct: true, strike_count: 1, move_to_end_of_queue: false },
    ui_action: {
      command: "trigger_order",
      target_anchor_id: "concept_division",
      game_payload: {
        steps: [
          "Interphase — DNA replicates",
          "Prophase — chromosomes condense",
          "Metaphase — chromosomes align",
          "Anaphase — chromatids separate",
          "Telophase — two nuclei form",
        ],
      },
    },
    state_update: { current_step: 4, total_steps: 4, step_title: "Sequence: Mitosis" },
    widget_trigger: "none",
    tutor_message:
      "Last one! Drag the phases of mitosis into the correct order on the left.",
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
      answer_format: "text",
      tolerance: null,
      language: null,
      explanation: "The nucleus stores genetic material and directs cell activity.",
      anchor_id: "concept_nucleus",
    },
    {
      id: "q2",
      type: "true_false",
      prompt: "The mitochondria store the cell's primary genetic blueprint.",
      options: [],
      answer: "False",
      answer_format: "text",
      tolerance: null,
      language: null,
      explanation: "Mitochondria produce ATP (energy); the nucleus stores DNA.",
      anchor_id: "concept_mitochondria",
    },
    {
      id: "q3",
      type: "fill_blank",
      prompt: "Mitochondria generate _____, the chemical energy that powers the cell.",
      options: [],
      answer: "ATP",
      answer_format: "text",
      tolerance: null,
      language: null,
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
      answer_format: "text",
      tolerance: null,
      language: null,
      explanation: "Mitosis = identical body cells; meiosis = gametes for reproduction.",
      anchor_id: "concept_division",
    },
    {
      id: "q5",
      type: "math",
      prompt: "A cell culture doubles every 20 minutes. Starting from 1 cell, how many cells are there after 2 hours? $$N = N_0 \\cdot 2^{t/20}$$",
      options: [],
      answer: "64",
      answer_format: "numeric",
      tolerance: 0,
      language: null,
      explanation: "2 hours = 120 minutes = 6 doublings, so $N = 1 \\cdot 2^6 = 64$.",
      anchor_id: "concept_division",
    },
    {
      id: "q6",
      type: "code",
      prompt:
        "What does this print?\n\n```python\nphases = [\"prophase\", \"metaphase\", \"anaphase\", \"telophase\"]\nprint(phases[-2])\n```",
      options: [],
      answer: "anaphase",
      answer_format: "text",
      tolerance: null,
      language: "python",
      explanation: "Negative indices count from the end: -1 is the last item, -2 is second-to-last.",
      anchor_id: "concept_division",
    },
  ],
};
