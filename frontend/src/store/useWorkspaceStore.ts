import { create } from "zustand";
import type {
  BlockGameState,
  BlockMode,
  CanvasBlock,
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
import { boldTerms, extractOrderedSteps, parseCanvas } from "@/lib/canvas";
import { playDing } from "@/lib/sounds";
import { addXp as profileAddXp, completeQuest, recordActivity } from "@/lib/profile";
import { boostConcept } from "@/lib/mastery";
import { type ComplexityLevel } from "@/lib/textComplexity";
import { simplifyBlocks } from "@/lib/api";

/** Blocks with less than this much real text aren't worth a model call — a
 *  bare "---" divider or a two-word heading fragment (both real artifacts
 *  the markdown-to-blocks parser can produce) has nothing to simplify, and
 *  sending it just wastes a request and comes back looking like a bug (an
 *  "ELI5" badge over unchanged "---"). */
const MIN_SIMPLIFY_CHARS = 15;

/**
 * Shared by setTextComplexity (unlocked chapters, right when the slider
 * moves) and unlockChapter (background pre-fetch for a chapter the moment
 * it unlocks, so it's already cached by the time the student scrolls to
 * it). Only sends blocks not already cached at this level and not already
 * in flight — cheap to call repeatedly, it naturally no-ops once warm.
 *
 * Blocks are sent in SMALL CHUNKS, not one big request. A single batched
 * model call was the root of two live bugs: on a cold start the one call
 * failed silently (ELI5 "did nothing"), and a large batch made the model
 * truncate its JSON so only some blocks came back ("applied to some"). Small
 * chunks run concurrently, cache independently as each resolves, retry once
 * on failure, and cap the blast radius of any single truncation.
 */
const SIMPLIFY_CHUNK_SIZE = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function simplifyOneChunk(
  chunk: CanvasBlock[],
  level: ComplexityLevel,
  workspaceId: string,
  set: (fn: (s: WorkspaceState) => Partial<WorkspaceState>) => void,
): Promise<void> {
  set((s) => ({
    simplifyingBlockIds: {
      ...s.simplifyingBlockIds,
      ...Object.fromEntries(chunk.map((b) => [b.id, true])),
    },
  }));
  try {
    let results: { id: string; text: string }[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        results = await simplifyBlocks(
          workspaceId,
          chunk.map((b) => ({ id: b.id, text: b.plain })),
          level === 1 ? "standard" : "eli5",
        );
        break;
      } catch (err) {
        if (attempt === 1) throw err;
        await sleep(1200); // ride out a cold-start blip before giving up
      }
    }
    set((s) => {
      const complexity = { ...s.blockComplexity };
      for (const r of results) complexity[r.id] = { level, text: r.text };
      return { blockComplexity: complexity };
    });
  } catch {
    // Non-fatal — a block with no cache entry at this level just falls back
    // to the original text (see InteractiveBlock's ReadBlock).
  } finally {
    set((s) => {
      const pending = { ...s.simplifyingBlockIds };
      for (const b of chunk) delete pending[b.id];
      return { simplifyingBlockIds: pending };
    });
  }
}

async function simplifyChapterBlocks(
  blocks: CanvasBlock[],
  level: ComplexityLevel,
  workspaceId: string,
  get: () => WorkspaceState,
  set: (fn: (s: WorkspaceState) => Partial<WorkspaceState>) => void,
): Promise<void> {
  if (level === 0) return;
  const { blockComplexity, simplifyingBlockIds } = get();
  const toSimplify = blocks.filter(
    (b) =>
      b.kind !== "mermaid" &&
      b.plain.trim().length >= MIN_SIMPLIFY_CHARS &&
      blockComplexity[b.id]?.level !== level &&
      !simplifyingBlockIds[b.id],
  );
  if (toSimplify.length === 0) return;

  const chunks: CanvasBlock[][] = [];
  for (let i = 0; i < toSimplify.length; i += SIMPLIFY_CHUNK_SIZE) {
    chunks.push(toSimplify.slice(i, i + SIMPLIFY_CHUNK_SIZE));
  }
  await Promise.all(chunks.map((chunk) => simplifyOneChunk(chunk, level, workspaceId, set)));
}

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
  | "textComplexity"
  | "blockComplexity"
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
      textComplexity: s.textComplexity,
      blockComplexity: s.blockComplexity,
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
  /** Set once by WorkspaceShell — the reading-level slider (setTextComplexity)
   *  needs the workspace id to call the real rewrite endpoint but isn't
   *  itself passed one as a prop. */
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (workspaceId: string) => void;
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
  /** Reverts every still-active game block to plain text (completed ones are
   *  already gone). Used when Practice mode is toggled off. */
  clearBlockGames: () => void;

  /** Telemetry for the most recent tutor turn — measured client-side at the
   *  call site (no extra requests). Surfaced by the demo-mode Judge panel so
   *  reviewers can see model/provider/latency/UI-command per response. */
  tutorTelemetry: {
    latencyMs: number;
    live: boolean; // false = mock/demo sample data, clearly labeled in the UI
    command: string;
    anchorId: string | null;
    isCorrect: boolean | null;
    at: number;
  } | null;
  setTutorTelemetry: (t: WorkspaceState["tutorTelemetry"]) => void;
  /** Practice mode's batch spawner: plans one game per given chapter and
   *  lands them all in ONE state update with a single scroll to the first.
   *  (Calling mutateBlockToGame in a loop causes one re-render + one queued
   *  scroll-and-glow animation per chapter — lag + viewport thrash.)
   *  Planning rules: a chapter whose block contains a real numbered step list
   *  gets an order game ON that block (the game replaces the list, so the
   *  answer isn't visible); otherwise cloze and spot-the-lie alternate, with
   *  cloze handed a document-wide concept pool for its answer dropdowns. */
  spawnPracticeGames: (anchorIds: string[]) => void;

  // --- Feature 1: ELI5 reading-level slider ---
  /** 0 Academic | 1 Standard | 2 ELI5 — the slider's current position. */
  textComplexity: ComplexityLevel;
  /** Which block is currently centered in the viewport (tracked by DocumentViewer's
   *  IntersectionObserver) — the "currently visible" block the slider acts on. */
  visibleBlockId: string | null;
  /** Per-block rewrite cache: once a block has been simplified, it stays that way
   *  even if you scroll away and back, keyed by the level it was rewritten at. */
  blockComplexity: Record<string, { level: ComplexityLevel; text: string }>;
  /** Block ids with a simplify request currently in flight — drives the
   *  loading skeleton in InteractiveBlock's ReadBlock. */
  simplifyingBlockIds: Record<string, boolean>;
  setVisibleBlockId: (blockId: string | null) => void;
  /** Moves the slider; rewrites unlocked chapters' blocks via a real model
   *  call (locked chapters are pre-fetched in the background as they unlock —
   *  see unlockChapter — so eagerly rewriting the whole document up front,
   *  including chapters the student can't even see yet, isn't necessary). */
  setTextComplexity: (level: ComplexityLevel) => void;

  // --- Gamification (XP / levels) ---
  xp: number;
  completedChapters: string[];
  /** Bumped whenever a chapter is newly mastered — drives the level-up burst. */
  levelUpTick: number;
  /** Transient label for the burst overlay ("Level 2 · The Nucleus"). */
  levelUpLabel: string;
  /** Add XP without touching chapter progress (e.g. Practice Exam payout). */
  awardXp: (amount: number) => void;
  /** Set when a chapter is freshly mastered — offers a themed, chapter-scoped
   *  Practice Exam ("boss battle"). Cleared by dismissBossBattle. */
  bossBattle: { anchorId: string; title: string } | null;
  dismissBossBattle: () => void;

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

  // --- Flashcards (widget spawning + on-demand generation) ---
  flashcards: Flashcard[];
  addFlashcard: (card: Omit<Flashcard, "id">) => void;
  /** Replaces the deck (e.g. after loading persisted cards or generating a new batch). */
  setFlashcards: (cards: Flashcard[]) => void;
  /** Appends generated cards, skipping any whose id we already have. */
  mergeFlashcards: (cards: Flashcard[]) => void;
  /** Swipeable flashcard viewer (Feature: study the deck in-app). */
  flashcardsOpen: boolean;
  setFlashcardsOpen: (open: boolean) => void;

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
      bossBattle: null,
      messages: [],
      step: { currentStep: 0, totalSteps: 0, stepTitle: "" },
      strikeCount: 0,
      // Pause persistence: resumeSession() re-establishes it for the right key,
      // so this fresh reset never clobbers a saved session.
      sessionKey: null,
      textComplexity: 0,
      visibleBlockId: null,
      blockComplexity: {},
      simplifyingBlockIds: {},
      // Flashcards are per-document; WorkspaceShell reloads the persisted deck
      // for the newly active document right after this reset.
      flashcards: [],
    });
  },

  sessionKey: null,
  resumeSession: (sessionKey) => {
    const saved = loadPersistedSession(sessionKey);
    set(saved ? { sessionKey, ...saved } : { sessionKey });
  },

  documents: [],
  activeDocumentId: null,
  activeWorkspaceId: null,
  setActiveWorkspaceId: (workspaceId) => set({ activeWorkspaceId: workspaceId }),
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
  bossBattle: null,
  dismissBossBattle: () => set({ bossBattle: null }),

  unlockChapter: (anchorId) => {
    const isNewUnlock = !get().unlockedAnchors.includes(anchorId);
    set((s) =>
      isNewUnlock ? { unlockedAnchors: [...s.unlockedAnchors, anchorId] } : s,
    );
    // Warm the simplify cache for a genuinely NEW unlock, so Standard/ELI5
    // text is likely already there by the time the student scrolls to this
    // chapter, instead of them waiting on it right as they arrive.
    if (isNewUnlock) {
      const { chapters, textComplexity, activeWorkspaceId } = get();
      if (textComplexity > 0 && activeWorkspaceId) {
        const chapter = chapters.find((c) => c.anchorId === anchorId);
        if (chapter) void simplifyChapterBlocks(chapter.blocks, textComplexity, activeWorkspaceId, get, set);
      }
    }
  },

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

  clearBlockGames: () => set({ blockGames: {} }),

  tutorTelemetry: null,
  setTutorTelemetry: (t) => set({ tutorTelemetry: t }),

  spawnPracticeGames: (anchorIds) => {
    const { chapters, blockGames } = get();
    // Document-wide concept pool: bold terms from every chapter, so a cloze
    // blank on a concept gets sibling concepts as its dropdown distractors.
    const conceptPool = chapters.flatMap((c) =>
      c.blocks.flatMap((b) => (b.kind === "text" ? boldTerms(b.markdown) : [])),
    );
    const additions: Record<string, BlockGameState> = {};
    let alt = 0;
    for (const anchorId of anchorIds) {
      const chapter = chapters.find((c) => c.anchorId === anchorId);
      if (!chapter) continue;
      const free = (id: string) => !blockGames[id] && !additions[id];
      const listBlock = chapter.blocks.find(
        (b) => b.kind === "text" && free(b.id) && extractOrderedSteps(b.markdown).length > 0,
      );
      if (listBlock) {
        additions[listBlock.id] = {
          mode: "order",
          payload: { steps: extractOrderedSteps(listBlock.markdown) },
        };
        continue;
      }
      const block = chapter.blocks.find(
        (b) => b.kind === "text" && b.plain.length > 40 && free(b.id),
      );
      if (!block) continue;
      const mode: BlockMode = alt++ % 2 === 0 ? "cloze" : "spot_the_lie";
      additions[block.id] = {
        mode,
        payload: mode === "cloze" ? { choices: conceptPool } : undefined,
      };
    }
    if (Object.keys(additions).length === 0) return;
    set((s) => ({ blockGames: { ...s.blockGames, ...additions } }));
    const first = anchorIds[0];
    if (first) setTimeout(() => get().requestScrollTo(first, "purple"), 200);
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
        bossBattle: newlyMasteredChapter
          ? { anchorId: newlyMasteredChapter, title: chapter?.title ?? "Chapter" }
          : s.bossBattle,
      };
    });
    playDing();

    // Real tutor progress must show up as real mastery (lib/mastery.ts, read by
    // the lobby's stats/needs-review/radar) — completing a chapter's first game
    // IS how this app defines "mastered", so boost it to (near) full; extra
    // games in an already-mastered chapter top it up the rest of the way.
    if (anchor) boostConcept(anchor, newlyMasteredChapter ? 85 : 15);

    // Persist to the lifetime player profile (dashboard streak/quests).
    profileAddXp(20);
    recordActivity();
    completeQuest("game");

    // Reward: reveal the next chapter when one is mastered.
    if (newlyMasteredChapter) setTimeout(() => get().unlockNextChapter(), 900);
  },

  textComplexity: 0,
  visibleBlockId: null,
  blockComplexity: {},
  simplifyingBlockIds: {},
  setVisibleBlockId: (blockId) => set({ visibleBlockId: blockId }),
  setTextComplexity: (level) => {
    // The slider position updates instantly regardless of what's below —
    // Academic (0) is always just the reviewer's original text (no rewrite
    // needed, no cost), Standard/ELI5 show whatever's already cached while
    // the real rewrite for any not-yet-cached blocks is in flight (see the
    // loading skeleton in InteractiveBlock's ReadBlock).
    set({ textComplexity: level });
    if (level === 0) return;

    const { chapters, activeWorkspaceId, unlockedAnchors } = get();
    if (!activeWorkspaceId) return;

    // Only UNLOCKED chapters — locked ones are blurred behind fog-of-war and
    // can't be read yet anyway, so eagerly rewriting the whole document up
    // front (including chapters the student hasn't reached) was pure wasted
    // latency on the request that's actually blocking them right now. Locked
    // chapters get warmed in the background the moment they unlock instead
    // (see unlockChapter) — usually well before the student scrolls there.
    const visibleBlocks = chapters
      .filter((c) => unlockedAnchors.includes(c.anchorId))
      .flatMap((c) => c.blocks);
    void simplifyChapterBlocks(visibleBlocks, level, activeWorkspaceId, get, set);
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
  setFlashcards: (cards) => set({ flashcards: cards }),
  mergeFlashcards: (cards) =>
    set((s) => {
      const known = new Set(s.flashcards.map((c) => c.id));
      const fresh = cards.filter((c) => !known.has(c.id));
      return fresh.length ? { flashcards: [...s.flashcards, ...fresh] } : s;
    }),
  flashcardsOpen: false,
  setFlashcardsOpen: (open) => set({ flashcardsOpen: open }),

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
    const priorStep = get().step.currentStep;

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
        if (anchor) {
          // Defensive: whatever chapter Lumi is actively pointing the student
          // at must be readable, even if it's ahead of the fog-of-war
          // frontier — otherwise the student gets scrolled into a locked,
          // blurred wall with no way to read what Lumi is talking about.
          get().unlockChapter(anchor);
          get().requestScrollTo(anchor, evaluation.is_correct === true ? "mint" : "purple");
        }
        break;
      case "highlight":
        if (anchor) {
          get().unlockChapter(anchor);
          set({
            activeHighlight: anchor,
            highlightTone: evaluation.is_correct === true ? "mint" : "purple",
          });
        }
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

    // 5. XP for tutoring progress — a correct comprehension check pays more
    // than a plain step advance, mirroring the mini-game/exam/review payouts
    // so lesson progress shows up on the dashboard the same way they do.
    if (evaluation.is_correct === true) {
      get().awardXp(15);
      profileAddXp(15);
      recordActivity();
      completeQuest("lesson");
      if (anchor) boostConcept(anchor, 10);
    } else if (state_update.current_step > priorStep) {
      get().awardXp(5);
      profileAddXp(5);
      recordActivity();
      completeQuest("lesson");
    }
  },
}));

// Persist the learning session (chat + progress) on every change, so a page
// reload or the Practice Exam's window.location.reload() resumes where the
// student left off instead of wiping the conversation.
useWorkspaceStore.subscribe((state) => {
  if (state.sessionKey) savePersistedSession(state.sessionKey, state);
});
