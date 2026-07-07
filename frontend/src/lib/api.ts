import type {
  IngestPayload,
  Quiz,
  QuizConfig,
  StudyMode,
  TutorResponse,
  WorkspaceSummary,
} from "@/types/prism";
import { MOCK_INGEST, MOCK_QUIZ, MOCK_TUTOR_TURNS, MOCK_WORKSPACES } from "@/lib/mockData";

/**
 * Single seam between the frontend and FastAPI.
 *
 * Mocks are ON by default so the UI is demonstrable with no backend. Set
 * NEXT_PUBLIC_USE_MOCKS=false (with the FastAPI container running) to hit the
 * real ingestion + tutor endpoints. The component layer is identical either way.
 */
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
// Sends the (mock) user id so backend user-scoping works. When real Clerk lands,
// this becomes an `Authorization: Bearer <jwt>` header instead.
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("prism_mock_user");
    if (raw) return { "X-User-Id": (JSON.parse(raw) as { id: string }).id };
  } catch {
    /* ignore */
  }
  return {};
}

// --- Types matching the backend IngestResponse -------------------------------
export interface IngestResult {
  workspace_id: string;
  source_type: "pdf" | "pptx" | "youtube";
  reviewer: IngestPayload;
}

export interface TutorContext {
  reviewer: IngestPayload;
  currentStep: number;
  totalSteps: number;
  strikeCount: number;
  studyFocus: StudyMode;
  /** prior turns only — the current student message is sent separately */
  recentHistory: { role: "student" | "lumi"; text: string }[];
}

// --- Ingestion ---------------------------------------------------------------
export async function ingestFile(
  file: File,
  studyFocus: StudyMode = "comprehensive",
): Promise<IngestResult> {
  if (USE_MOCKS) {
    await delay(1200);
    const result: IngestResult = {
      workspace_id: `ws_${Date.now().toString(36)}`,
      source_type: file.name.toLowerCase().endsWith(".pptx") ? "pptx" : "pdf",
      reviewer: MOCK_INGEST,
    };
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
  const res = await fetch(`${API_URL}/ingest/file`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(await extractError(res, "Ingestion failed"));
  const result: IngestResult = await res.json();
  cacheReviewer(result.workspace_id, result.reviewer);
  return result;
}

export async function ingestYoutube(
  youtubeUrl: string,
  studyFocus: StudyMode = "comprehensive",
): Promise<IngestResult> {
  if (USE_MOCKS) {
    await delay(1200);
    const result: IngestResult = {
      workspace_id: `ws_${Date.now().toString(36)}`,
      source_type: "youtube",
      reviewer: MOCK_INGEST,
    };
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ youtube_url: youtubeUrl, study_focus: studyFocus }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Ingestion failed"));
  const result: IngestResult = await res.json();
  cacheReviewer(result.workspace_id, result.reviewer);
  return result;
}

// --- Workspace listing (dashboard grid) --------------------------------------
export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  if (USE_MOCKS) {
    await delay(200);
    // Workspaces created this session appear first, then the demo samples.
    return [...readLocalWorkspaces(), ...MOCK_WORKSPACES];
  }
  const res = await fetch(`${API_URL}/workspaces`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await extractError(res, "Failed to load workspaces"));
  const rows = (await res.json()) as Array<{
    id: string;
    title: string;
    source_type: "pdf" | "pptx" | "youtube";
    concept_count: number;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    sourceType: r.source_type,
    conceptCount: r.concept_count,
    createdAt: r.created_at,
  }));
}

// --- Reviewer retrieval ------------------------------------------------------
export async function fetchReviewer(workspaceId: string): Promise<IngestPayload> {
  if (USE_MOCKS) {
    await delay(400);
    return readCachedReviewer(workspaceId) ?? MOCK_INGEST;
  }
  // Session cache first (survives refresh without a DB); server GET is the
  // fallback once Supabase persistence exists.
  const cached = readCachedReviewer(workspaceId);
  if (cached) return cached;
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/reviewer`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load reviewer: ${res.status}`);
  return res.json();
}

// --- Tutor turn --------------------------------------------------------------
export async function sendTutorMessage(
  workspaceId: string,
  studentMessage: string,
  ctx: TutorContext,
): Promise<TutorResponse> {
  if (USE_MOCKS) {
    await delay(700);
    // Progress the mock lesson by how many student turns have happened.
    const priorStudentTurns = ctx.recentHistory.filter((t) => t.role === "student").length;
    return MOCK_TUTOR_TURNS[Math.min(priorStudentTurns, MOCK_TUTOR_TURNS.length - 1)];
  }
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/tutor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      student_message: studentMessage,
      current_step: ctx.currentStep,
      total_steps: ctx.totalSteps,
      strike_count: ctx.strikeCount,
      study_focus: ctx.studyFocus,
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
): Promise<Quiz> {
  if (USE_MOCKS) {
    await delay(900);
    return MOCK_QUIZ;
  }
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ...config, reviewer }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Quiz generation failed"));
  return res.json();
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
