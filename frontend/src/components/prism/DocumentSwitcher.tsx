"use client";

import { useRef, useState } from "react";
import { FileText, Plus, Loader2, GraduationCap, RefreshCw, Link2, Upload, X } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import {
  fetchReviewer,
  ingestFile,
  ingestYoutube,
  listDocuments,
  setDocumentMode,
  type IngestResult,
} from "@/lib/api";
import type { DocumentSummary, SessionMode } from "@/types/prism";
import { cn } from "@/lib/utils";

/**
 * Lists the documents in a workspace and lets the student switch between them,
 * flip each document's Learn/Review mode, and add another source. Switching a
 * document loads its reviewer and resumes that document's own saved session.
 */
export function DocumentSwitcher({ workspaceId }: { workspaceId: string }) {
  const documents = useWorkspaceStore((s) => s.documents);
  const activeDocumentId = useWorkspaceStore((s) => s.activeDocumentId);
  const setIngest = useWorkspaceStore((s) => s.setIngest);
  const setActiveDocument = useWorkspaceStore((s) => s.setActiveDocument);
  const resumeSession = useWorkspaceStore((s) => s.resumeSession);
  const setWorkspaceDocuments = useWorkspaceStore((s) => s.setWorkspaceDocuments);

  const [switching, setSwitching] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<SessionMode>("learn");
  const [url, setUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function switchTo(doc: DocumentSummary) {
    if (doc.id === activeDocumentId || switching) return;
    setSwitching(doc.id);
    try {
      const reviewer = await fetchReviewer(workspaceId, doc.id);
      setIngest(reviewer);
      setActiveDocument(doc.id, doc.mode);
      resumeSession(doc.id);
    } finally {
      setSwitching(null);
    }
  }

  async function toggleMode(doc: DocumentSummary) {
    const next: SessionMode = doc.mode === "learn" ? "review" : "learn";
    // Optimistic update.
    setWorkspaceDocuments(documents.map((d) => (d.id === doc.id ? { ...d, mode: next } : d)));
    if (doc.id === activeDocumentId) setActiveDocument(doc.id, next);
    try {
      await setDocumentMode(workspaceId, doc.id, next);
    } catch {
      // Revert on failure.
      setWorkspaceDocuments(documents.map((d) => (d.id === doc.id ? { ...d, mode: doc.mode } : d)));
      if (doc.id === activeDocumentId) setActiveDocument(doc.id, doc.mode);
    }
  }

  async function afterAdd(result: IngestResult) {
    const docs = await listDocuments(workspaceId);
    setWorkspaceDocuments(docs);
    // Switch to the freshly added document.
    setIngest(result.reviewer);
    setActiveDocument(result.document_id, result.mode);
    resumeSession(result.document_id);
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
    <div className="px-2 pb-2">
      <div className="mb-1 flex items-center justify-between px-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <FileText size={15} /> Documents
          <span className="text-xs text-muted-foreground">({documents.length})</span>
        </span>
        <button
          onClick={() => setShowAdd((v) => !v)}
          disabled={adding}
          title="Add a document or link to this workspace"
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          {adding ? (
            <Loader2 size={13} className="animate-spin" />
          ) : showAdd ? (
            <X size={13} />
          ) : (
            <Plus size={13} />
          )}{" "}
          Add
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          hidden
          onChange={onAddFile}
        />
      </div>

      {/* Add panel: file upload OR a YouTube link, with a study mode for the new doc */}
      {showAdd && (
        <div className="mb-2 space-y-2 rounded-lg border border-white/60 bg-white/40 p-2.5">
          <div className="flex gap-1">
            {(["learn", "review"] as SessionMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setAddMode(m)}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1 text-[11px] font-medium capitalize transition-colors",
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
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-violet-300/70 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
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
          {addError && <p className="text-[11px] text-destructive">{addError}</p>}
        </div>
      )}

      <ul className="space-y-0.5">
        {documents.map((doc) => {
          const active = doc.id === activeDocumentId;
          const ModeIcon = doc.mode === "learn" ? GraduationCap : RefreshCw;
          return (
            <li
              key={doc.id}
              className={cn(
                "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
                active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <button onClick={() => switchTo(doc)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                {switching === doc.id ? (
                  <Loader2 size={13} className="shrink-0 animate-spin" />
                ) : (
                  <FileText size={13} className={cn("shrink-0", active && "text-primary")} />
                )}
                <span className="truncate">{doc.title}</span>
              </button>
              <button
                onClick={() => toggleMode(doc)}
                title={`Mode: ${doc.mode} — click to switch`}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                  doc.mode === "learn"
                    ? "bg-violet-500/15 text-violet-600"
                    : "bg-cyan-500/15 text-cyan-600",
                )}
              >
                <ModeIcon size={11} /> {doc.mode === "learn" ? "Learn" : "Review"}
              </button>
            </li>
          );
        })}
        {documents.length === 0 && (
          <li className="px-2 py-1 text-xs text-muted-foreground">No documents yet.</li>
        )}
      </ul>
    </div>
  );
}
