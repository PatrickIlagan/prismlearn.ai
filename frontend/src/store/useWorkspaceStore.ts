import { create } from "zustand";
import type {
  BlockGameState,
  BlockMode,
  CanvasChapter,
  ChatMessage,
  DocumentSummary,
  Flashcard,
  GamePayload,
  HighlightTone,
  IngestPayload,
  SessionMode,
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

/**
 * Per-workspace session persistence.
 *
 * The chat transcript and lesson progress live in this store, which is wiped on
 * every full page load. Without persistence, refreshing the tab (or the Practice
 * Exam's window.location.reload()) makes the whole conversation vanish. We snapshot
 * the learning slice to sessionStorage (same scope as the cached reviewer) and
 * rehydrate it on mount so a reload resumes exactly where the student left off.
 */
const SESSION_PREFIX = "prism_session_";

type PersistedSession = Pick<
  WorkspaceState,
  | "messages"
  | "step"
  | "strikeCount"
  | "unlockedAnchors"
  | "blockGames"
  | "completedBlocks"
  | "xp"
  | "completedChapters"
>;

function loadPersistedSession(id: string): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + id);
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch {
    return null;
  }
}

function savePersistedSession(id: string, s: WorkspaceState) {
  if (typeof window === "undefined") return;
  try {
    const slice: PersistedSession = {
      messages: s.messages,
      step: s.step,
      strikeCount: s.strikeCount,
      unlockedAnchors: s.unlockedAnchors,
      blockGames: s.blockGames,
      completedBlocks: s.completedBlocks,
      xp: s.xp,
      completedChapters: s.completedChapters,
    };
    sessionStorage.setItem(SESSION_PREFIX + id, JSON.stringify(slice));
  } catch {
    // sessionStorage may be full or unavailable — non-fatal.
  }
}

interface WorkspaceState {
  // --- Reviewer content (from [MODE: INGEST]) ---
  ingest: IngestPayload | null;
  setIngest: (payload: IngestPayload) => void;

  // --- Session persistence ---
  /** Persistence key for the active document's session (gates sessionStorage writes). */
  sessionKey: string | null;
  /** Rehydrate a document's chat + lesson progress after a reload / doc switch. */
  resumeSession: (sessionKey: string) => void;

  // --- Documents in the current workspace ---
  documents: DocumentSummary[];
  activeDocumentId: string | null;
  setWorkspaceDocuments: (docs: DocumentSummary[]) => void;
  /** Record which document is active and its saved study mode. */
  setActiveDocument: (documentId: string, mode: SessionMode) => void;

  // --- Active Learning Canvas ---
  chapters: CanvasChapter[];
  /** Fog of war: only these chapters are fully visible; the rest are locked. */
  unlockedAnchors: string[];
  /** Runtime mini-game state per block id (absent = plain "read" mode). */
  blockGames: Record<string, BlockGameState>;
  completedBlocks: string[];
  unlockChapter: (anchorId: string) => void;
  unlockNextChapter: () => void;
  /** Review mode is a recap that walks the WHOLE document — no fog-of-war gating,
   *  otherwise Lumi referencing an upcoming chapter scrolls the student into a
   *  blurred, padlocked wall ("locked out" of their own review session). */
  unlockAllChapters: () => void;
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
  /** "learn" (first-time teaching) vs "review" (rapid recall of seen material). */
  sessionMode: "learn" | "review";
  setStudyMode: (mode: StudyMode) => void;
  toggleTts: () => void;
  setSessionMode: (mode: "learn" | "review") => void;

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
      messages: [],
      step: { currentStep: 0, totalSteps: 0, stepTitle: "" },
      strikeCount: 0,
      // Pause persistence: resumeSession() re-establishes it for the right key,
      // so this fresh reset never clobbers a saved session.
      sessionKey: null,
    });
  },

  sessionKey: null,
  resumeSession: (sessionKey) => {
    const saved = loadPersistedSession(sessionKey);
    set(saved ? { sessionKey, ...saved } : { sessionKey });
  },

  documents: [],
  activeDocumentId: null,
  setWorkspaceDocuments: (docs) => set({ documents: docs }),
  setActiveDocument: (documentId, mode) =>
    set({ activeDocumentId: documentId, sessionMode: mode }),

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

  unlockAllChapters: () =>
    set((s) => ({ unlockedAnchors: s.chapters.map((c) => c.anchorId) })),

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
  sessionMode: "learn",
  setStudyMode: (mode) => set({ studyMode: mode }),
  toggleTts: () => set((s) => ({ ttsEnabled: !s.ttsEnabled })),
  setSessionMode: (mode) => set({ sessionMode: mode }),

  quizOpen: false,
  setQuizOpen: (open) => set({ quizOpen: open }),

  applyTutorResponse: (res) => {
    const { evaluation, ui_action, state_update, widget_trigger } = res;
    // Models sometimes emit a literal "\n" (double-escaped) instead of a real
    // newline; normalize so the bubble (whitespace-pre-line) renders cleanly.
    const tutor_message = res.tutor_message.replace(/\\n/g, "\n");

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

// Persist the learning session (chat + progress) on every change, so a page
// reload or the Practice Exam's window.location.reload() resumes where the
// student left off instead of wiping the conversation.
useWorkspaceStore.subscribe((state) => {
  if (state.sessionKey) savePersistedSession(state.sessionKey, state);
});
