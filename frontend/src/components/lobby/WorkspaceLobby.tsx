"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  AlertTriangle,
  FileQuestion,
  Flame,
  Target,
  BookOpen,
  Pencil,
  Check,
  Loader2,
} from "lucide-react";
import { fetchReviewer, listDocuments, listWorkspaces, renameWorkspace } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { chapterMastery, needsReview, overallMastery } from "@/lib/mastery";
import type { DocumentSummary, IngestPayload, WorkspaceSummary } from "@/types/prism";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { ChapterRadar } from "./ChapterRadar";
import { DiagnosticAssessment } from "./DiagnosticAssessment";
import { WorkspaceDocuments } from "./WorkspaceDocuments";
import { cn } from "@/lib/utils";
import type { SessionMode } from "@/types/prism";

const diagKey = (docId: string) => `prism_diag_done_${docId}`;

function diagnosticDone(docId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(diagKey(docId)) === "1";
  } catch {
    return true;
  }
}

export function WorkspaceLobby({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const setIngest = useWorkspaceStore((s) => s.setIngest);
  const [reviewer, setReviewer] = useState<IngestPayload | null>(null);
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentSummary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  // Bumped after a diagnostic so mastery (read from localStorage boosts) recomputes.
  const [masteryKey, setMasteryKey] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchReviewer(workspaceId),
      listWorkspaces().catch(() => []),
      listDocuments(workspaceId).catch(() => [] as DocumentSummary[]),
    ])
      .then(([rev, list, docs]) => {
        if (!alive) return;
        setReviewer(rev);
        setIngest(rev); // seed the store so entering the tutor is instant
        setSummary(list.find((w) => w.id === workspaceId) ?? null);
        setDocuments(docs);
        const primary = docs[0] ?? null;
        setActiveDoc(primary);
        // Offer the diagnostic once, for first-time (learn-mode) documents.
        setShowDiagnostic(!!primary && primary.mode === "learn" && !diagnosticDone(primary.id));
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [workspaceId, setIngest]);

  // Switch which document the lobby (and its launches) targets.
  async function switchToDocument(doc: DocumentSummary) {
    setActiveDoc(doc);
    setShowDiagnostic(doc.mode === "learn" && !diagnosticDone(doc.id));
    try {
      const rev = await fetchReviewer(workspaceId, doc.id);
      setReviewer(rev);
      setIngest(rev);
      setMasteryKey((k) => k + 1);
    } catch {
      /* keep the previous reviewer on failure */
    }
  }

  function selectDocument(docId: string) {
    const doc = documents.find((d) => d.id === docId);
    if (doc && doc.id !== activeDoc?.id) switchToDocument(doc);
  }

  // Optimistic Learn/Review flip from the documents panel (persisted by the
  // panel itself; this just keeps the lobby's view of the doc list in sync).
  function handleModeChange(docId: string, mode: SessionMode) {
    setDocuments((docs) => docs.map((d) => (d.id === docId ? { ...d, mode } : d)));
    if (activeDoc?.id === docId) {
      setActiveDoc((d) => (d ? { ...d, mode } : d));
      setShowDiagnostic(mode === "learn" && !diagnosticDone(docId));
    }
  }

  // A document was just added — refresh the list and switch to it directly
  // (the new doc isn't in `documents` yet, so selectDocument's lookup would miss).
  async function saveTitle() {
    const next = titleDraft.trim();
    if (!next || savingTitle) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      await renameWorkspace(workspaceId, next);
      setSummary((s) => (s ? { ...s, title: next } : s));
      setEditingTitle(false);
    } finally {
      setSavingTitle(false);
    }
  }

  function handleDocumentsChanged(docs: DocumentSummary[], newDocId: string) {
    setDocuments(docs);
    const newDoc = docs.find((d) => d.id === newDocId);
    if (newDoc) switchToDocument(newDoc);
  }

  function handleDocumentDeleted(docId: string) {
    const remaining = documents.filter((d) => d.id !== docId);
    setDocuments(remaining);
    if (activeDoc?.id === docId && remaining[0]) switchToDocument(remaining[0]);
  }

  function handleDocumentRenamed(docId: string, title: string) {
    setDocuments((docs) => docs.map((d) => (d.id === docId ? { ...d, title } : d)));
    if (activeDoc?.id === docId) setActiveDoc((d) => (d ? { ...d, title } : d));
  }

  // Content edits change the reviewer text itself — reload it if the edited
  // document is the one currently driving this lobby's stats/radar.
  async function handleContentEdited(docId: string) {
    if (docId !== activeDoc?.id) return;
    try {
      const rev = await fetchReviewer(workspaceId, docId);
      setReviewer(rev);
      setIngest(rev);
      setMasteryKey((k) => k + 1);
    } catch {
      /* keep the previous reviewer on failure */
    }
  }

  // Append ?doc= so the tutor/exam/review open the selected document.
  const docQuery = activeDoc ? `?doc=${activeDoc.id}` : "";

  function completeDiagnostic() {
    if (activeDoc && typeof window !== "undefined") {
      try {
        localStorage.setItem(diagKey(activeDoc.id), "1");
      } catch {
        /* non-fatal */
      }
    }
    setShowDiagnostic(false);
    setMasteryKey((k) => k + 1); // recompute mastery from the new boosts
  }

  const toc = useMemo(() => reviewer?.table_of_contents ?? [], [reviewer]);
  // masteryKey forces these to recompute after a diagnostic writes new boosts.
  const mastery = useMemo(() => overallMastery(toc), [toc, masteryKey]);
  const chapters = useMemo(() => chapterMastery(toc), [toc, masteryKey]);
  const weak = useMemo(() => needsReview(toc), [toc, masteryKey]);
  const title = summary?.title ?? "Workspace";

  if (status === "loading") {
    return <CenteredMessage>Loading your lobby…</CenteredMessage>;
  }
  if (status === "error") {
    return (
      <CenteredMessage>
        <p className="font-semibold">We couldn&apos;t load this workspace.</p>
        <Link href="/dashboard" className="mt-3 text-sm text-primary hover:underline">
          Back to Dashboard
        </Link>
      </CenteredMessage>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Back + title */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>

        {/* Stats header */}
        <div className="glass flex flex-col items-start justify-between gap-5 rounded-3xl p-6 sm:flex-row sm:items-center">
          <div>
            {editingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                  className="rounded-md border bg-white/60 px-2 py-1 text-2xl font-bold tracking-tight outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={saveTitle}
                  disabled={savingTitle}
                  className="rounded-md p-1.5 text-primary hover:bg-primary/10"
                  title="Save name"
                >
                  {savingTitle ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                </button>
              </div>
            ) : (
              <h1 className="group flex items-center gap-2 text-2xl font-bold tracking-tight">
                {title}
                <button
                  onClick={() => {
                    setTitleDraft(title);
                    setEditingTitle(true);
                  }}
                  className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-white/60 hover:text-foreground group-hover:opacity-100"
                  title="Rename workspace"
                >
                  <Pencil size={14} />
                </button>
              </h1>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {toc.length} chapters · pick up where you left off.
            </p>
            <div className="mt-4 flex gap-5">
              <MiniStat icon={Flame} tint="text-orange-500" label="Concepts" value={`${toc.length}`} />
              <MiniStat
                icon={Target}
                tint="text-emerald-600"
                label="Needs review"
                value={`${weak.length}`}
              />
              <MiniStat
                icon={BookOpen}
                tint="text-violet-600"
                label="Mastery"
                value={`${mastery}%`}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ProgressRing value={mastery} size={104} stroke={9} />
            <span className="text-xs text-muted-foreground">overall mastery</span>
          </div>
        </div>

        {/* Documents in this workspace — visible list, not a dropdown */}
        <div className="mt-6">
          <WorkspaceDocuments
            workspaceId={workspaceId}
            documents={documents}
            activeDocumentId={activeDoc?.id ?? null}
            onSelect={selectDocument}
            onModeChange={handleModeChange}
            onDocumentsChanged={handleDocumentsChanged}
            onDeleted={handleDocumentDeleted}
            onRenamed={handleDocumentRenamed}
            onContentEdited={handleContentEdited}
          />
        </div>

        {/* Optional pre-lesson diagnostic (learn-mode, first visit only) */}
        {showDiagnostic && reviewer && (
          <div className="mt-6">
            <DiagnosticAssessment
              workspaceId={workspaceId}
              reviewer={reviewer}
              documentId={activeDoc?.id}
              onComplete={completeDiagnostic}
            />
          </div>
        )}

        {/* 2-column: weaknesses + radar */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="text-sm font-semibold">Needs review</h2>
            </div>
            {weak.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing flagged yet — you&apos;re on top of it! 🎉
              </p>
            ) : (
              <ul className="space-y-2">
                {weak.map((c, i) => (
                  <motion.li
                    key={c.anchorId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between rounded-xl border border-white/50 bg-white/40 px-3 py-2.5 backdrop-blur-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.strength}% mastered</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        c.strikes >= 3
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-600",
                      )}
                    >
                      {c.strikes} {c.strikes === 1 ? "strike" : "strikes"}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="mb-3 text-sm font-semibold">Strength by chapter</h2>
            <ChapterRadar data={chapters} />
          </div>
        </div>

        {/* Launch buttons */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <LaunchButton
            primary
            icon={Play}
            title="Resume Tutor"
            subtitle="Continue your guided lesson"
            onClick={() => router.push(`/workspace/${workspaceId}${docQuery}`)}
          />
          <LaunchButton
            icon={AlertTriangle}
            title="Review Weaknesses"
            subtitle={weak.length ? `${weak.length} concepts to shore up` : "All clear!"}
            onClick={() => router.push(`/workspace/${workspaceId}/review${docQuery}`)}
          />
          <LaunchButton
            icon={FileQuestion}
            title="Practice Exam"
            subtitle="Timed gauntlet · earn XP"
            onClick={() => router.push(`/workspace/${workspaceId}/exam${docQuery}`)}
          />
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: typeof Flame;
  tint: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className={tint} />
      <div>
        <div className="text-sm font-bold leading-none">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function LaunchButton({
  icon: Icon,
  title,
  subtitle,
  onClick,
  primary,
}: {
  icon: typeof Play;
  title: string;
  subtitle: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5",
        primary
          ? "bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50"
          : "glass hover:shadow-lg hover:shadow-violet-500/15",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          primary ? "bg-white/20" : "bg-primary/10 text-primary",
        )}
      >
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className={cn("truncate text-xs", primary ? "text-white/80" : "text-muted-foreground")}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center text-center text-muted-foreground">
      {children}
    </div>
  );
}
