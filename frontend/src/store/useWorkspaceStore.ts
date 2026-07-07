import { create } from "zustand";
import type {
  ChatMessage,
  Flashcard,
  HighlightTone,
  IngestPayload,
  StudyMode,
  TutorResponse,
} from "@/types/prism";
import { playDing } from "@/lib/sounds";

/**
 * The agentic UI-manipulation pipeline lives here.
 *
 * The frontend NEVER renders Lumi's raw output. FastAPI returns a TutorResponse
 * JSON; `applyTutorResponse` reads its `ui_action`, `evaluation`, `state_update`,
 * and `widget_trigger` fields and mutates this store. Components subscribe to the
 * slices they care about (DocumentViewer -> activeHighlight; StepProgressStepper
 * -> step state; LumiChatUI -> messages), so a single AI payload fans out into
 * scrolling, highlighting, a stepper update, a flashcard spawn, and a sound.
 */

let messageCounterSeed = 0;
const uid = (prefix: string) => `${prefix}_${Date.now()}_${messageCounterSeed++}`;

interface StepState {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
}

interface WorkspaceState {
  // --- Reviewer content (from [MODE: INGEST]) ---
  ingest: IngestPayload | null;
  setIngest: (payload: IngestPayload) => void;

  // --- Agentic viewport control ---
  /** anchor_id the DocumentViewer should scroll to; consumed then cleared */
  scrollTarget: string | null;
  /** anchor_id currently glowing, plus its tone */
  activeHighlight: string | null;
  highlightTone: HighlightTone;
  requestScrollTo: (anchorId: string, tone?: HighlightTone) => void;
  clearScrollTarget: () => void;

  // --- Lumi chat ---
  messages: ChatMessage[];
  isTutorThinking: boolean;
  pushStudentMessage: (text: string) => void;
  setTutorThinking: (thinking: boolean) => void;

  // --- Progress stepper ---
  step: StepState;

  // --- 3-strike tracking (sent to the backend on each tutor turn) ---
  strikeCount: number;

  // --- Flashcards (widget spawning) ---
  flashcards: Flashcard[];
  addFlashcard: (card: Omit<Flashcard, "id">) => void;

  // --- Settings ---
  studyMode: StudyMode;
  ttsEnabled: boolean;
  setStudyMode: (mode: StudyMode) => void;
  toggleTts: () => void;

  // --- Quiz modal ---
  quizOpen: boolean;
  setQuizOpen: (open: boolean) => void;

  // --- The core agentic reducer ---
  applyTutorResponse: (res: TutorResponse) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ingest: null,
  setIngest: (payload) => set({ ingest: payload }),

  scrollTarget: null,
  activeHighlight: null,
  highlightTone: "purple",
  requestScrollTo: (anchorId, tone = "purple") =>
    set({ scrollTarget: anchorId, activeHighlight: anchorId, highlightTone: tone }),
  clearScrollTarget: () => set({ scrollTarget: null }),

  messages: [],
  isTutorThinking: false,
  pushStudentMessage: (text) =>
    set((s) => ({
      messages: [...s.messages, { id: uid("msg"), role: "student", text }],
    })),
  setTutorThinking: (thinking) => set({ isTutorThinking: thinking }),

  step: { currentStep: 0, totalSteps: 0, stepTitle: "" },
  strikeCount: 0,

  flashcards: [],
  addFlashcard: (card) =>
    set((s) => ({ flashcards: [...s.flashcards, { ...card, id: uid("card") }] })),

  studyMode: "comprehensive",
  ttsEnabled: false,
  setStudyMode: (mode) => set({ studyMode: mode }),
  toggleTts: () => set((s) => ({ ttsEnabled: !s.ttsEnabled })),

  quizOpen: false,
  setQuizOpen: (open) => set({ quizOpen: open }),

  applyTutorResponse: (res) => {
    const { evaluation, ui_action, state_update, widget_trigger, tutor_message } = res;

    // 1. Append Lumi's chat bubble with a verdict for dopamine feedback.
    const verdict =
      evaluation.is_correct === true
        ? "correct"
        : evaluation.is_correct === false
          ? "incorrect"
          : undefined;

    set((s) => ({
      messages: [
        ...s.messages,
        { id: uid("msg"), role: "lumi", text: tutor_message, verdict },
      ],
      isTutorThinking: false,
      step: {
        currentStep: state_update.current_step,
        totalSteps: state_update.total_steps,
        stepTitle: state_update.step_title,
      },
      // Backend owns strike arithmetic; mirror it so the next turn reports it.
      strikeCount: evaluation.strike_count,
    }));

    // 2. Agentic viewport control.
    if (
      (ui_action.command === "scroll_and_highlight" || ui_action.command === "highlight") &&
      ui_action.target_anchor_id
    ) {
      const tone: HighlightTone = evaluation.is_correct === true ? "mint" : "purple";
      if (ui_action.command === "scroll_and_highlight") {
        get().requestScrollTo(ui_action.target_anchor_id, tone);
      } else {
        set({ activeHighlight: ui_action.target_anchor_id, highlightTone: tone });
      }
    }

    // 3. Autonomous widget spawning.
    if (widget_trigger === "flashcard") {
      set((s) => ({
        flashcards: [
          ...s.flashcards,
          {
            id: uid("card"),
            front: state_update.step_title || "Key concept",
            back: tutor_message,
            anchorId: ui_action.target_anchor_id ?? undefined,
          },
        ],
      }));
    }

    // 4. Dopamine ding on a correct answer.
    if (evaluation.is_correct === true) playDing();
  },
}));
