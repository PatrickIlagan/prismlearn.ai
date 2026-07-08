"use client";

import { useRef, useState } from "react";
import {
  FileText,
  Video,
  Presentation,
  Plus,
  Loader2,
  GraduationCap,
  RefreshCw,
  Link2,
  Upload,
  X,
} from "lucide-react";
import {
  ingestFile,
  ingestYoutube,
  listDocuments,
  setDocumentMode,
  type IngestResult,
} from "@/lib/api";
import type { DocumentSummary, SessionMode } from "@/types/prism";
import { cn } from "@/lib/utils";

const SOURCE_ICON: Record<DocumentSummary["sourceType"], typeof FileText> = {
  pdf: FileText,
  pptx: Presentation,
  youtube: Video,
};

/**
 * Visible grid of every document in the workspace (not tucked behind a
 * dropdown) — shows source type, concept count, and Learn/Review mode, lets
 * you pick which one is active, flip its mode, and add another source
 * (file or YouTube link) right from the lobby.
 */
export function WorkspaceDocuments({
  workspaceId,
  documents,
  activeDocumentId,
  onSelect,
  onModeChange,
  onDocumentsChanged,
}: {
  workspaceId: string;
  documents: DocumentSummary[];
  activeDocumentId: string | null;
  onSelect: (docId: string) => void;
  onModeChange: (docId: string, mode: SessionMode) => void;
  onDocumentsChanged: (docs: DocumentSummary[], newDocId: string) => void;
}) {
  const [switching, setSwitching] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<SessionMode>("learn");
  const [url, setUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSelect(doc: DocumentSummary) {
    if (doc.id === activeDocumentId || switching) return;
    setSwitching(doc.id);
    try {
      onSelect(doc.id);
    } finally {
      setSwitching(null);
    }
  }

  async function toggleMode(doc: DocumentSummary, e: React.MouseEvent) {
    e.stopPropagation();
    const next: SessionMode = doc.mode === "learn" ? "review" : "learn";
    onModeChange(doc.id, next); // optimistic, parent owns the list
    try {
      await setDocumentMode(workspaceId, doc.id, next);
    } catch {
      onModeChange(doc.id, doc.mode); // revert
    }
  }

  async function afterAdd(result: IngestResult) {
    const docs = await listDocuments(workspaceId);
    onDocumentsChanged(docs, result.document_id);
    setShowAdd(false);
    setUrl("");
  }

  async function onAddFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAdding(true);
    setAddError(null);
    try {
      const result = await ingestFile(file, { workspaceId, mode: addMode });
      await afterAdd(result);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Couldn't add that file.");
    } finally {
      setAdding(false);
    }
  }

  async function onAddUrl() {
    const link = url.trim();
    if (!link || adding) return;
    setAdding(true);
    setAddError(null);
    try {
      const result = await ingestYoutube(link, { workspaceId, mode: addMode });
      await afterAdd(result);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Couldn't add that link.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FileText size={16} className="text-primary" />
          Documents in this workspace
          <span className="text-xs font-normal text-muted-foreground">({documents.length})</span>
        </h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          disabled={adding}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          {adding ? (
            <Loader2 size={13} className="animate-spin" />
          ) : showAdd ? (
            <X size={13} />
          ) : (
            <Plus size={13} />
          )}{" "}
          Add document
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          hidden
          onChange={onAddFile}
        />
      </div>

      {showAdd && (
        <div className="mb-4 space-y-2 rounded-xl border border-white/60 bg-white/40 p-3">
          <div className="flex gap-1">
            {(["learn", "review"] as SessionMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setAddMode(m)}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1 text-xs font-medium capitalize transition-colors",
                  addMode === m
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-white/60 text-muted-foreground hover:bg-white/60",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={adding}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-violet-300/70 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
          >
            <Upload size={13} /> Upload PDF / PPTX
          </button>
          <div className="flex items-center gap-1 rounded-md border border-white/60 bg-white/50 px-2">
            <Link2 size={13} className="shrink-0 text-muted-foreground" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAddUrl()}
              disabled={adding}
              placeholder="Paste a YouTube URL"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-xs outline-none placeholder:text-muted-foreground/70"
            />
            <button
              onClick={onAddUrl}
              disabled={adding || !url.trim()}
              className="shrink-0 text-xs font-medium text-primary disabled:opacity-40"
            >
              Add
            </button>
          </div>
          {addError && <p className="text-xs text-destructive">{addError}</p>}
        </div>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {documents.map((doc) => {
          const Icon = SOURCE_ICON[doc.sourceType] ?? FileText;
          const active = doc.id === activeDocumentId;
          const ModeIcon = doc.mode === "learn" ? GraduationCap : RefreshCw;
          return (
            <div
              key={doc.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(doc)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleSelect(doc)}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-primary/60 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 ring-1 ring-primary/30"
                  : "border-white/50 bg-white/40 hover:border-primary/30 hover:bg-white/60",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {switching === doc.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Icon size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.conceptCount} concepts · {doc.sourceType}
                </p>
              </div>
              <button
                onClick={(e) => toggleMode(doc, e)}
                title={`Mode: ${doc.mode} — click to switch`}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors",
                  doc.mode === "learn"
                    ? "bg-violet-500/15 text-violet-600 hover:bg-violet-500/25"
                    : "bg-cyan-500/15 text-cyan-600 hover:bg-cyan-500/25",
                )}
              >
                <ModeIcon size={11} /> {doc.mode === "learn" ? "Learn" : "Review"}
              </button>
            </div>
          );
        })}
        {documents.length === 0 && (
          <p className="col-span-2 py-3 text-center text-xs text-muted-foreground">
            No documents yet — add one above.
          </p>
        )}
      </div>
    </div>
  );
}
