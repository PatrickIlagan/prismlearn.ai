/**
 * Data contracts for the Agentic JSON Pipeline.
 * These mirror documentation/03_SystemPrompts.md exactly — the backend's
 * Pydantic models and these types must stay in lockstep.
 */

// ---------- [MODE: INGEST] ----------

export interface TocEntry {
  title: string;
  anchor_id: string;
}

export interface IngestPayload {
  table_of_contents: TocEntry[];
  markdown_content: string;
}

// ---------- [MODE: TUTOR] ----------

export type UiCommand = "scroll_and_highlight" | "highlight" | "none";

export interface UiAction {
  command: UiCommand;
  target_anchor_id: string | null;
}

export interface TutorEvaluation {
  /** null = nothing to evaluate (greetings, small talk) */
  is_correct: boolean | null;
  strike_count: number;
  move_to_end_of_queue: boolean;
}

export interface TutorStateUpdate {
  current_step: number;
  total_steps: number;
  step_title: string;
}

export type WidgetTrigger = "none" | "flashcard";

export interface TutorResponse {
  internal_thought_process: string;
  evaluation: TutorEvaluation;
  ui_action: UiAction;
  state_update: TutorStateUpdate;
  widget_trigger: WidgetTrigger;
  tutor_message: string;
}

// ---------- [MODE: QUIZ] ----------

export type QuestionType = "mcq" | "true_false" | "fill_blank" | "short_answer";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  anchor_id: string | null;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export interface QuizConfig {
  /** "all" or a concept anchor_id */
  scope: string;
  question_count: number;
  study_focus: StudyMode;
}

// ---------- Frontend-side models ----------

export interface ChatMessage {
  id: string;
  role: "student" | "lumi";
  text: string;
  /** Drives the dopamine feedback: green glow vs. shake */
  verdict?: "correct" | "incorrect";
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  anchorId?: string;
}

export interface WorkspaceSummary {
  id: string;
  title: string;
  sourceType: "pdf" | "pptx" | "youtube";
  conceptCount: number;
  createdAt: string;
}

export type StudyMode = "technical" | "conceptual" | "comprehensive";
export type HighlightTone = "purple" | "mint";
export type MobileTab = "reviewer" | "chat" | "assessments" | "menu";
