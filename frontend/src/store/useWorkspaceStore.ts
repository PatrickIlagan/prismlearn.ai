import { create } from "zustand";
import type {
  BlockGameState,
  BlockMode,
  CanvasChapter,
  ChatMessage,
  Flashcard,
  GamePayload,
  HighlightTone,
  IngestPayload,
  StudyMode,
  TutorResponse,
} from "@/types/prism";
import { parseCanvas } from "@/lib/canvas";
import { playDing } from "@/lib/sounds";
import { addXp as profileAddXp, completeQuest, recordActivity } from "@/lib/profile";

/**
 * The agentic UI-manipulation pipeline lives here.
 *
 * The frontend NEVER renders Lumi's raw output. FastAPI returns a TutorResponse
 * JSON; `applyTutorResponse` reads its `ui_action`, `evaluation`, `state_update`,
 * and `widget_trigger` fields and mutates this store. Beyond scrolling and
 * highlighting, Lumi can now reshape the center pane into an Active Learning
 * Canvas: unlock chapters (fog of war) and turn paragraphs into inline
 * mini-games (cloze, spot-the-lie).
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

  // --- Active Learning Canvas ---
  chapters: CanvasChapter[];
  /** Fog of war: only these chapters are fully visible; the rest are locked. */
  unlockedAnchors: string[];
  /** Runtime mini-game state per block id (absent = plain "read" mode). */
  blockGames: Record<string, BlockGameState>;
  completedBlocks: string[];
  unlockChapter: (anchorId: string) => void;
  unlockNextChapter: () => void;
  mutateBlockToGame: (anchorId: string, gameType: BlockMode, payload?: GamePayload) => void;
  completeBlockGame: (blockId: string) => void;

  // --- Gamification (XP / levels) ---
  xp: number;
  completedChapters: string[];
  /** Bumped whenever a chapter is newly mastered — drives the level-up burst. */
  levelUpTick: number;
  /** Transient label for the burst overlay ("Level 2 · The Nucleus"). */
  levelUpLabel: string;
  /** Add XP without touching chapter progress (e.g. Practice Exam payout). */
  awardXp: (amount: number) => void;

  // --- Agentic viewport control ---
  scrollTarget: string | null;
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
  setIngest: (payload) => {
    const chapters = parseCanvas(payload);
    set({
      ingest: payload,
      chapters,
      // Fog of war: first chapter starts unlocked, the rest are hidden.
      unlockedAnchors: chapters.length ? [chapters[0].anchorId] : [],
      blockGames: {},
      completedBlocks: [],
      xp: 0,
      completedChapters: [],
      levelUpTick: 0,
      levelUpLabel: "",
    });
  },

  chapters: [],
  unlockedAnchors: [],
  blockGames: {},
  completedBlocks: [],
  xp: 0,
  completedChapters: [],
  levelUpTick: 0,
  levelUpLabel: "",
  awardXp: (amount) => set((s) => ({ xp: s.xp + Math.max(0, amount) })),

  unlockChapter: (anchorId) =>
    set((s) =>
      s.unlockedAnchors.includes(anchorId)
        ? s
        : { unlockedAnchors: [...s.unlockedAnchors, anchorId] },
    ),

  unlockNextChapter: () => {
    const { chapters, unlockedAnchors } = get();
    const next = chapters.find((c) => !unlockedAnchors.includes(c.anchorId));
    if (!next) return;
    get().unlockChapter(next.anchorId);
    setTimeout(() => get().requestScrollTo(next.anchorId, "mint"), 250);
  },

  mutateBlockToGame: (anchorId, gameType, payload) => {
    const chapter = get().chapters.find((c) => c.anchorId === anchorId);
    if (!chapter) return;
    // Hotspot games attach to a diagram; the rest to a substantial paragraph.
    const block =
      gameType === "hotspot"
        ? chapter.blocks.find((b) => b.kind === "mermaid" && !get().blockGames[b.id])
        : chapter.blocks.find(
            (b) => b.kind === "text" && b.plain.length > 40 && !get().blockGames[b.id],
          );
    if (!block) return;
    get().unlockChapter(anchorId); // can't play a game in a locked chapter
    set((s) => ({
      blockGames: { ...s.blockGames, [block.id]: { mode: gameType, payload } },
    }));
    setTimeout(() => get().requestScrollTo(anchorId, "purple"), 200);
  },

  completeBlockGame: (blockId) => {
    const { chapters, completedChapters, completedBlocks } = get();
    const alreadyDone = completedBlocks.includes(blockId);
    const chapter = chapters.find((c) => c.blocks.some((b) => b.id === blockId));
    const anchor = chapter?.anchorId;
    // A chapter is "mastered" the first time a mini-game in it is completed.
    const newlyMasteredChapter =
      anchor && !completedChapters.includes(anchor) ? anchor : null;

    set((s) => {
      const games = { ...s.blockGames };
      delete games[blockId];
      const level = s.completedChapters.length + (newlyMasteredChapter ? 1 : 0);
      return {
        blockGames: games,
        completedBlocks: alreadyDone ? s.completedBlocks : [...s.completedBlocks, blockId],
        xp: s.xp + 20, // +20 XP per completed mini-game
        completedChapters: newlyMasteredChapter
          ? [...s.completedChapters, newlyMasteredChapter]
          : s.completedChapters,
        levelUpTick: newlyMasteredChapter ? s.levelUpTick + 1 : s.levelUpTick,
        levelUpLabel: newlyMasteredChapter
          ? `Level ${level + 1} · ${chapter?.title ?? "Chapter"} mastered`
          : s.levelUpLabel,
      };
    });
    playDing();

    // Persist to the lifetime player profile (dashboard streak/quests).
    profileAddXp(20);
    recordActivity();
    completeQuest("game");

    // Reward: reveal the next chapter when one is mastered.
    if (newlyMasteredChapter) setTimeout(() => get().unlockNextChapter(), 900);
  },

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
      messages: [...s.messages, { id: uid("msg"), role: "lumi", text: tutor_message, verdict }],
      isTutorThinking: false,
      step: {
        currentStep: state_update.current_step,
        totalSteps: state_update.total_steps,
        stepTitle: state_update.step_title,
      },
      strikeCount: evaluation.strike_count,
    }));

    // 2. Agentic canvas control.
    const anchor = ui_action.target_anchor_id;
    switch (ui_action.command) {
      case "scroll_and_highlight":
        if (anchor)
          get().requestScrollTo(anchor, evaluation.is_correct === true ? "mint" : "purple");
        break;
      case "highlight":
        if (anchor)
          set({
            activeHighlight: anchor,
            highlightTone: evaluation.is_correct === true ? "mint" : "purple",
          });
        break;
      case "unlock_chapter":
        if (anchor) {
          get().unlockChapter(anchor);
          get().requestScrollTo(anchor, "mint");
        }
        break;
      case "trigger_cloze":
        if (anchor) get().mutateBlockToGame(anchor, "cloze", ui_action.game_payload);
        break;
      case "trigger_spot_the_lie":
        if (anchor) get().mutateBlockToGame(anchor, "spot_the_lie", ui_action.game_payload);
        break;
      case "trigger_order":
        if (anchor) get().mutateBlockToGame(anchor, "order", ui_action.game_payload);
        break;
      case "trigger_hotspot":
        if (anchor) get().mutateBlockToGame(anchor, "hotspot", ui_action.game_payload);
        break;
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
