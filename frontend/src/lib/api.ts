import type {
  DocumentSummary,
  IngestPayload,
  Quiz,
  QuizConfig,
  SessionMode,
  StudyMode,
  TutorResponse,
  WorkspaceSummary,
} from "@/types/prism";
import { MOCK_INGEST, MOCK_QUIZ, MOCK_TUTOR_TURNS, MOCK_WORKSPACES } from "@/lib/mockData";
import { useWakeupStore } from "@/store/useWakeupStore";
import { isDemoMode } from "@/lib/demoMode";

/**
 * Single seam between the frontend and FastAPI.
 *
 * Mocks are ON by default so the UI is demonstrable with no backend. Set
 * NEXT_PUBLIC_USE_MOCKS=false (with the FastAPI container running) to hit the
 * real ingestion + tutor endpoints. The component layer is identical either way.
 */
const ENV_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Mock mode is the env flag OR the visitor-activated demo cookie ("Try the
// demo" on the landing page). Checked per-call rather than once at module
// load so entering/exiting demo mode takes effect without a page reload.
function isMockMode(): boolean {
  return ENV_MOCKS || isDemoMode();
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retries a fetch on a 5xx response or network failure — specifically to
 * ride out Render's free-tier cold start. A full wake-from-sleep can take
 * 30-50s (not just a couple seconds), and it's most visible right after
 * sign-in, when the dashboard fires one reviewer fetch per workspace in
 * parallel — exactly the burst most likely to land mid-wake. The keep-alive
 * cron (.github/workflows/keep-alive.yml) is the primary defense against the
 * backend ever sleeping at all; this is the fallback for the window before
 * that first ping lands, or any other transient 5xx/restart.
 */
// How long a request can run before we assume it's a cold start, not normal
// latency, and show the waking banner. A warm backend responds in well under
// this; a sleeping one often doesn't fail fast — it just holds the
// connection open for 20-40s while the container boots, so triggering on
// elapsed time (not on failure) is what actually catches that case.
const WAKING_THRESHOLD_MS = 2500;

async function fetchWithRetry(url: string, init: RequestInit, attempts = 6): Promise<Response> {
  const { markWaking, clearWaking, setFailed } = useWakeupStore.getState();
  let markedWaking = false;
  const wakingTimer = setTimeout(() => {
    markedWaking = true;
    markWaking();
  }, WAKING_THRESHOLD_MS);

  try {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, init);
        if (res.ok || (res.status < 500 && res.status !== 0)) return res;
        lastError = new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastError = err;
      }
      if (i < attempts - 1) await delay(Math.min(2000 * (i + 1), 8000));
    }
    setFailed(true);
    throw lastError instanceof Error ? lastError : new Error("Request failed after retries");
  } finally {
    clearTimeout(wakingTimer);
    if (markedWaking) clearWaking();
  }
}

// Mock-mode lesson cursor (advances through MOCK_TUTOR_TURNS per session).
let mockTurnIndex = 0;

// --- Session-scoped reviewer cache -------------------------------------------
// Until Supabase persistence lands, a freshly-ingested reviewer is kept in
// sessionStorage keyed by workspace id, so navigating to /workspace/[id] and
// even a page refresh still find the document within the same browser session.
const cacheKey = (workspaceId: string) => `prism_reviewer_${workspaceId}`;

function cacheReviewer(workspaceId: string, reviewer: IngestPayload) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(cacheKey(workspaceId), JSON.stringify(reviewer));
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

function readCachedReviewer(workspaceId: string): IngestPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(workspaceId));
    return raw ? (JSON.parse(raw) as IngestPayload) : null;
  } catch {
    return null;
  }
}

// --- Local workspace registry (mock mode) ------------------------------------
// In mock mode there's no server list, so a freshly-ingested workspace is
// recorded here (same session scope as its cached reviewer) to appear on the
// dashboard. In live mode, GET /workspaces is the source of truth instead.
const REGISTRY_KEY = "prism_workspaces";

function readLocalWorkspaces(): WorkspaceSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as WorkspaceSummary[]) : [];
  } catch {
    return [];
  }
}

function registerLocalWorkspace(summary: WorkspaceSummary) {
  if (typeof window === "undefined") return;
  try {
    const existing = readLocalWorkspaces().filter((w) => w.id !== summary.id);
    sessionStorage.setItem(REGISTRY_KEY, JSON.stringify([summary, ...existing]));
  } catch {
    /* non-fatal */
  }
}

function titleFromFilename(name: string): string {
  const stem = name.replace(/\.(pdf|pptx)$/i, "").replace(/[_-]+/g, " ").trim();
  return stem || "Untitled";
}

// --- Auth header -------------------------------------------------------------
// Attaches the signed-in student's Clerk session token as a bearer token, which
// the backend verifies against Clerk's JWKS (app/core/auth.py). This module
// isn't a React component, so it can't use the useAuth()/useSession() hooks —
// `window.Clerk` is the documented escape hatch: ClerkProvider attaches the
// underlying clerk-js instance to it once loaded, and `.session.getToken()`
// is how Clerk's own hooks fetch a fresh token under the hood.
async function authHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    // ClerkProvider attaches the underlying clerk-js instance to window.Clerk
    // once loaded; cast through unknown since its ambient type isn't visible
    // in every compilation unit and is a broad union we don't need here.
    const clerk = (window as unknown as Record<string, unknown>).Clerk as
      | { session?: { getToken(): Promise<string | null> } | null }
      | undefined;
    const token = await clerk?.session?.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

// --- Types matching the backend IngestResponse -------------------------------
export interface IngestResult {
  workspace_id: string;
  document_id: string;
  mode: SessionMode;
  source_type: "pdf" | "pptx" | "youtube" | "website";
  reviewer: IngestPayload;
}

/** Options for ingest: study focus, the per-document study mode, and an optional
 *  existing workspace to add the document to (otherwise a new workspace is made). */
export interface IngestOptions {
  studyFocus?: StudyMode;
  mode?: SessionMode;
  workspaceId?: string;
}

export interface TutorContext {
  reviewer: IngestPayload;
  currentStep: number;
  totalSteps: number;
  strikeCount: number;
  studyFocus: StudyMode;
  /** "learn" = first-time teaching; "review" = rapid recall of seen material */
  sessionMode: SessionMode;
  /** which document in the workspace is being tutored (defaults to primary) */
  documentId?: string;
  /** reading-level slider (0 Academic, 1 Standard, 2 ELI5) — changes how Lumi talks */
  textComplexity?: 0 | 1 | 2;
  /** prior turns only — the current student message is sent separately */
  recentHistory: { role: "student" | "lumi"; text: string }[];
}

// --- Ingestion ---------------------------------------------------------------
function mockIngestResult(source_type: IngestResult["source_type"], mode: SessionMode): IngestResult {
  const id = `ws_${Date.now().toString(36)}`;
  return {
    workspace_id: id,
    document_id: `doc_${Date.now().toString(36)}`,
    mode,
    source_type,
    reviewer: MOCK_INGEST,
  };
}

export async function ingestFile(
  file: File,
  opts: IngestOptions = {},
): Promise<IngestResult> {
  const { studyFocus = "comprehensive", mode = "learn", workspaceId } = opts;
  if (isMockMode()) {
    await delay(1200);
    const result = mockIngestResult(
      file.name.toLowerCase().endsWith(".pptx") ? "pptx" : "pdf",
      mode,
    );
    if (workspaceId) result.workspace_id = workspaceId;
    cacheReviewer(result.document_id, result.reviewer);
    cacheReviewer(result.workspace_id, result.reviewer);
    registerLocalWorkspace({
      id: result.workspace_id,
      title: titleFromFilename(file.name),
      sourceType: result.source_type,
      conceptCount: result.reviewer.table_of_contents.length,
      createdAt: new Date().toISOString(),
    });
    return result;
  }
  const form = new FormData();
  form.append("file", file);
  form.append("study_focus", studyFocus);
  form.append("mode", mode);
  if (workspaceId) form.append("workspace_id", workspaceId);
  const res = await fetch(`${API_URL}/ingest/file`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(await extractError(res, "Ingestion failed"));
  const result: IngestResult = await res.json();
  cacheReviewer(result.document_id, result.reviewer);
  cacheReviewer(result.workspace_id, result.reviewer);
  return result;
}

export async function ingestYoutube(
  youtubeUrl: string,
  opts: IngestOptions = {},
): Promise<IngestResult> {
  const { studyFocus = "comprehensive", mode = "learn", workspaceId } = opts;
  if (isMockMode()) {
    await delay(1200);
    const result = mockIngestResult("youtube", mode);
    if (workspaceId) result.workspace_id = workspaceId;
    cacheReviewer(result.document_id, result.reviewer);
    cacheReviewer(result.workspace_id, result.reviewer);
    registerLocalWorkspace({
      id: result.workspace_id,
      title: "YouTube Video",
      sourceType: "youtube",
      conceptCount: result.reviewer.table_of_contents.length,
      createdAt: new Date().toISOString(),
    });
    return result;
  }
  const res = await fetch(`${API_URL}/ingest/youtube`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      youtube_url: youtubeUrl,
      study_focus: studyFocus,
      mode,
      workspace_id: workspaceId,
    }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Ingestion failed"));
  const result: IngestResult = await res.json();
  cacheReviewer(result.document_id, result.reviewer);
  cacheReviewer(result.workspace_id, result.reviewer);
  return result;
}

const YOUTUBE_HOST = /(^|\.)(youtube\.com|youtu\.be|music\.youtube\.com)$/i;

/** Generic "paste a link" ingestion — the backend routes YouTube URLs through
 *  the transcript extractor and everything else through the website article
 *  extractor (trafilatura), so this one function covers both. */
export async function ingestUrl(
  url: string,
  opts: IngestOptions = {},
): Promise<IngestResult> {
  const { studyFocus = "comprehensive", mode = "learn", workspaceId } = opts;
  if (isMockMode()) {
    await delay(1200);
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      /* fall through to website mock below */
    }
    const isYoutube = YOUTUBE_HOST.test(host);
    const result = mockIngestResult(isYoutube ? "youtube" : "website", mode);
    if (workspaceId) result.workspace_id = workspaceId;
    cacheReviewer(result.document_id, result.reviewer);
    cacheReviewer(result.workspace_id, result.reviewer);
    registerLocalWorkspace({
      id: result.workspace_id,
      title: isYoutube ? "YouTube Video" : host || "Web Article",
      sourceType: result.source_type,
      conceptCount: result.reviewer.table_of_contents.length,
      createdAt: new Date().toISOString(),
    });
    return result;
  }
  const res = await fetch(`${API_URL}/ingest/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      url,
      study_focus: studyFocus,
      mode,
      workspace_id: workspaceId,
    }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Ingestion failed"));
  const result: IngestResult = await res.json();
  cacheReviewer(result.document_id, result.reviewer);
  cacheReviewer(result.workspace_id, result.reviewer);
  return result;
}

// --- Workspace listing (dashboard grid) --------------------------------------
export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  if (isMockMode()) {
    await delay(200);
    // Workspaces created this session appear first, then the demo samples.
    return [...readLocalWorkspaces(), ...MOCK_WORKSPACES];
  }
  const res = await fetchWithRetry(`${API_URL}/workspaces`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await extractError(res, "Failed to load workspaces"));
  const rows = (await res.json()) as Array<{
    id: string;
    title: string;
    source_type: "pdf" | "pptx" | "youtube" | "website";
    concept_count: number;
    document_count?: number;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    sourceType: r.source_type,
    conceptCount: r.concept_count,
    documentCount: r.document_count,
    createdAt: r.created_at,
  }));
}

// --- Documents ---------------------------------------------------------------
export async function listDocuments(workspaceId: string): Promise<DocumentSummary[]> {
  if (isMockMode()) {
    await delay(150);
    // Mock mode has no server doc list; synthesize a single primary document.
    return [
      {
        id: `doc_${workspaceId}`,
        title: "Document",
        sourceType: "pdf",
        mode: "learn",
        conceptCount: MOCK_INGEST.table_of_contents.length,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/documents`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to load documents"));
  const rows = (await res.json()) as Array<{
    id: string;
    title: string;
    source_type: "pdf" | "pptx" | "youtube" | "website";
    mode: SessionMode;
    concept_count: number;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    sourceType: r.source_type,
    mode: r.mode,
    conceptCount: r.concept_count,
    createdAt: r.created_at,
  }));
}

export async function setDocumentMode(
  workspaceId: string,
  documentId: string,
  mode: SessionMode,
): Promise<void> {
  if (isMockMode()) {
    await delay(120);
    return;
  }
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/documents/${documentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to update mode"));
}

/** Renames a document and/or directly edits the markdown the tutor teaches
 *  from and the student reads. Invalidates the local reviewer cache so the
 *  edit shows up immediately instead of the stale cached copy. */
export async function updateDocumentContent(
  workspaceId: string,
  documentId: string,
  patch: { title?: string; markdownContent?: string },
): Promise<DocumentSummary> {
  if (isMockMode()) {
    await delay(150);
    return {
      id: documentId,
      title: patch.title ?? "Document",
      sourceType: "pdf",
      mode: "learn",
      conceptCount: MOCK_INGEST.table_of_contents.length,
      createdAt: new Date().toISOString(),
    };
  }
  const res = await fetch(
    `${API_URL}/workspaces/${workspaceId}/documents/${documentId}/content`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ title: patch.title, markdown_content: patch.markdownContent }),
    },
  );
  if (!res.ok) throw new Error(await extractError(res, "Failed to save changes"));
  const row = (await res.json()) as {
    id: string;
    title: string;
    source_type: "pdf" | "pptx" | "youtube" | "website";
    mode: SessionMode;
    concept_count: number;
    created_at: string;
  };
  // The cached reviewer (keyed by document id) is now stale — clear it so the
  // next fetchReviewer() call goes to the server and picks up the edit.
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(cacheKey(documentId));
    } catch {
      /* non-fatal */
    }
  }
  return {
    id: row.id,
    title: row.title,
    sourceType: row.source_type,
    mode: row.mode,
    conceptCount: row.concept_count,
    createdAt: row.created_at,
  };
}

export async function deleteDocument(workspaceId: string, documentId: string): Promise<void> {
  if (isMockMode()) {
    await delay(150);
    return;
  }
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/documents/${documentId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await extractError(res, "Failed to delete document"));
  }
}

export async function renameWorkspace(workspaceId: string, title: string): Promise<void> {
  if (isMockMode()) {
    await delay(150);
    return;
  }
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to rename workspace"));
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  if (isMockMode()) {
    await delay(150);
    return;
  }
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await extractError(res, "Failed to delete workspace"));
  }
}

// --- Reviewer retrieval ------------------------------------------------------
export async function fetchReviewer(
  workspaceId: string,
  documentId?: string,
): Promise<IngestPayload> {
  if (isMockMode()) {
    await delay(400);
    return readCachedReviewer(documentId ?? workspaceId) ?? MOCK_INGEST;
  }
  // Session cache first (survives refresh without a re-fetch); server is fallback.
  const cached = readCachedReviewer(documentId ?? workspaceId);
  if (cached) return cached;
  const qs = documentId ? `?document_id=${encodeURIComponent(documentId)}` : "";
  const res = await fetchWithRetry(`${API_URL}/workspaces/${workspaceId}/reviewer${qs}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load reviewer: ${res.status}`);
  const reviewer: IngestPayload = await res.json();
  if (documentId) cacheReviewer(documentId, reviewer);
  return reviewer;
}

// --- Tutor turn --------------------------------------------------------------
export async function sendTutorMessage(
  workspaceId: string,
  studentMessage: string,
  ctx: TutorContext,
): Promise<TutorResponse> {
  if (isMockMode()) {
    await delay(700);
    // Walk the canned lesson turn-by-turn. recentHistory is capped for real
    // requests, so use a dedicated counter that resets when a fresh session
    // starts (no prior turns) — this reaches every scripted game.
    if (ctx.recentHistory.length === 0) mockTurnIndex = 0;
    const turn = MOCK_TUTOR_TURNS[Math.min(mockTurnIndex, MOCK_TUTOR_TURNS.length - 1)];
    mockTurnIndex += 1;
    return turn;
  }
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/tutor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      student_message: studentMessage,
      current_step: ctx.currentStep,
      total_steps: ctx.totalSteps,
      strike_count: ctx.strikeCount,
      study_focus: ctx.studyFocus,
      session_mode: ctx.sessionMode,
      document_id: ctx.documentId,
      text_complexity: ctx.textComplexity,
      recent_history: ctx.recentHistory,
      reviewer: ctx.reviewer,
    }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Tutor request failed"));
  return res.json();
}

// --- Quiz generation ---------------------------------------------------------
export async function generateQuiz(
  workspaceId: string,
  config: QuizConfig,
  reviewer?: IngestPayload,
  documentId?: string,
): Promise<Quiz> {
  if (isMockMode()) {
    await delay(900);
    return MOCK_QUIZ;
  }
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ ...config, reviewer, document_id: documentId }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Quiz generation failed"));
  return res.json();
}

// --- Flashcards ----------------------------------------------------------------
export interface FlashcardGenConfig {
  scope?: string; // "all" or a concept anchor_id
  count?: number;
  study_focus?: StudyMode;
}

function fromRecord(r: { id: string; front: string; back: string; anchor_id?: string | null }) {
  return { id: r.id, front: r.front, back: r.back, anchorId: r.anchor_id ?? undefined };
}

/** Cards already saved for a workspace (survives reload — unlike tutor-earned
 *  widget flashcards, which are still local-only). */
export async function listFlashcards(workspaceId: string): Promise<
  { id: string; front: string; back: string; anchorId?: string }[]
> {
  if (isMockMode()) return [];
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/flashcards`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to load flashcards"));
  const rows = (await res.json()) as Array<{
    id: string;
    front: string;
    back: string;
    anchor_id?: string | null;
  }>;
  return rows.map(fromRecord);
}

/** Generates (and persists) a full deck for a document on demand — independent
 *  of how far the student has gotten through the tutor. */
export async function generateFlashcards(
  workspaceId: string,
  config: FlashcardGenConfig = {},
  documentId?: string,
): Promise<{ id: string; front: string; back: string; anchorId?: string }[]> {
  if (isMockMode()) {
    await delay(900);
    return MOCK_INGEST.table_of_contents.slice(0, config.count ?? 8).map((c, i) => ({
      id: `mock_card_${i}`,
      front: `What is ${c.title}?`,
      back: `A key concept covered in "${c.title}."`,
      anchorId: c.anchor_id,
    }));
  }
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/flashcards/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      scope: config.scope ?? "all",
      count: config.count ?? 10,
      study_focus: config.study_focus ?? "comprehensive",
      document_id: documentId,
    }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Flashcard generation failed"));
  const rows = (await res.json()) as Array<{
    id: string;
    front: string;
    back: string;
    anchor_id?: string | null;
  }>;
  return rows.map(fromRecord);
}

// --- Reading-level rewrite (Standard/ELI5 slider) -----------------------------
export interface SimplifyBlockInput {
  id: string;
  text: string;
}

/** Real model call, batched (every block needing a rewrite goes in one
 *  request, not one round trip per paragraph). Mock mode returns blocks
 *  unchanged rather than faking a rewrite — showing correct-but-unsimplified
 *  text beats showing something that looks simplified but might be wrong. */
export async function simplifyBlocks(
  workspaceId: string,
  blocks: SimplifyBlockInput[],
  level: "standard" | "eli5",
): Promise<SimplifyBlockInput[]> {
  if (blocks.length === 0) return [];
  if (isMockMode()) {
    await delay(500);
    return blocks;
  }
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/simplify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ blocks, level }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Simplify failed"));
  const data = (await res.json()) as { blocks: SimplifyBlockInput[] };
  return data.blocks;
}

// --- helpers -----------------------------------------------------------------
async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body.detail === "string" ? body.detail : `${fallback}: ${res.status}`;
  } catch {
    return `${fallback}: ${res.status}`;
  }
}
