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

export type UiCommand =
  | "scroll_and_highlight"
  | "highlight"
  | "none"
  // Active Learning Canvas commands — Lumi mutates the center pane:
  | "trigger_cloze"
  | "trigger_spot_the_lie"
  | "trigger_order"
  | "trigger_hotspot"
  | "unlock_chapter";

/** Optional game configuration attached to a ui_action. */
export interface GamePayload {
  /** cloze: exact words to blank out (defaults to the block's bold terms). */
  blanks?: string[];
  /** spot_the_lie: the false sentence Lumi injects for the user to catch. */
  lie?: string;
  /** spot_the_lie: where to insert the lie among the real sentences. */
  lie_index?: number;
  /** order: the steps in their correct sequence (UI shuffles them to solve). */
  steps?: string[];
  /** hotspot: the diagram node label the student must click. */
  target?: string;
}

export interface UiAction {
  command: UiCommand;
  target_anchor_id: string | null;
  game_payload?: GamePayload;
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

export type QuestionType =
  | "mcq"
  | "true_false"
  | "fill_blank"
  | "short_answer"
  | "math"
  | "code";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  /** May contain $inline$ / $$block$$ LaTeX and fenced ```lang code — render via RichMarkdown. */
  prompt: string;
  options: string[];
  answer: string;
  /** math-only: "numeric" grades by parse + tolerance; "text" is a normalized symbolic compare. */
  answer_format: "numeric" | "text";
  /** math-only, numeric format: absolute tolerance for the compare. */
  tolerance: number | null;
  /** code-only: snippet language, e.g. "python" — drives syntax highlighting. */
  language: string | null;
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

// ---------- Active Learning Canvas ----------

export type BlockKind = "text" | "quote" | "mermaid";
export type BlockMode = "read" | "cloze" | "spot_the_lie" | "order" | "hotspot";

export interface CanvasBlock {
  id: string;
  chapterAnchor: string;
  kind: BlockKind;
  /** Raw markdown (for read/mermaid rendering). */
  markdown: string;
  /** Plain text with markdown stripped (for the mini-games). */
  plain: string;
}

export interface CanvasChapter {
  anchorId: string;
  title: string;
  level: number;
  blocks: CanvasBlock[];
}

/** Runtime game state for a single block, keyed by block id in the store. */
export interface BlockGameState {
  mode: BlockMode;
  payload?: GamePayload;
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
  sourceType: "pdf" | "pptx" | "youtube" | "website";
  conceptCount: number;
  /** Number of documents in the workspace (>=1). */
  documentCount?: number;
  createdAt: string;
}

/** "learn" = first-time teaching; "review" = recap that still walks the doc. */
export type SessionMode = "learn" | "review";

export interface DocumentSummary {
  id: string;
  title: string;
  sourceType: "pdf" | "pptx" | "youtube" | "website";
  mode: SessionMode;
  conceptCount: number;
  createdAt: string;
}

export type StudyMode = "technical" | "conceptual" | "comprehensive";
export type HighlightTone = "purple" | "mint";
export type MobileTab = "reviewer" | "chat" | "assessments" | "menu";
