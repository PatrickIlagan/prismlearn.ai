"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Presentation, Video, Globe, Play, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "./ProgressRing";
import { workspaceProgress } from "@/lib/progress";
import { deleteWorkspace, renameWorkspace } from "@/lib/api";
import type { WorkspaceSummary } from "@/types/prism";
import { cn } from "@/lib/utils";

const SOURCE = {
  pdf: { icon: FileText, label: "PDF", tile: "from-rose-400/20 to-red-500/20 text-rose-500" },
  pptx: { icon: Presentation, label: "Slides", tile: "from-amber-400/20 to-orange-500/20 text-amber-600" },
  youtube: { icon: Video, label: "Video", tile: "from-sky-400/20 to-blue-500/20 text-sky-600" },
  website: { icon: Globe, label: "Article", tile: "from-emerald-400/20 to-teal-500/20 text-emerald-600" },
} as const;

export function WorkspaceCard({
  ws,
  onDeleted,
  onRenamed,
}: {
  ws: WorkspaceSummary;
  onDeleted?: (id: string) => void;
  onRenamed?: (id: string, title: string) => void;
}) {
  const meta = SOURCE[ws.sourceType];
  const Icon = meta.icon;
  const progress = workspaceProgress(ws.id);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(ws.title);
  const [busy, setBusy] = useState(false);

  async function saveRename() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === ws.title) {
      setEditing(false);
      setTitle(ws.title);
      return;
    }
    setBusy(true);
    try {
      await renameWorkspace(ws.id, trimmed);
      onRenamed?.(ws.id, trimmed);
      setEditing(false);
    } catch {
      setTitle(ws.title);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${ws.title}"? This removes all its documents and flashcards.`)) {
      return;
    }
    setBusy(true);
    try {
      await deleteWorkspace(ws.id);
      onDeleted?.(ws.id);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="group glass relative flex flex-col rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/15">
      {/* Hover actions */}
      <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          disabled={busy}
          title="Rename workspace"
          className="rounded-md bg-white/70 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-white hover:text-foreground disabled:opacity-40"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          title="Delete workspace"
          className="rounded-md bg-white/70 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>

      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-white/50",
            meta.tile,
          )}
        >
          <Icon size={20} />
        </div>
        <ProgressRing value={progress} size={48} />
      </div>

      {editing ? (
        <div className="mt-4 flex items-center gap-1">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") {
                setTitle(ws.title);
                setEditing(false);
              }
            }}
            disabled={busy}
            className="min-w-0 flex-1 rounded-md border border-primary/40 bg-white/70 px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button onClick={saveRename} disabled={busy} className="shrink-0 p-1 text-emerald-600">
            <Check size={15} />
          </button>
          <button
            onClick={() => {
              setTitle(ws.title);
              setEditing(false);
            }}
            disabled={busy}
            className="shrink-0 p-1 text-muted-foreground"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <h3 className="mt-4 truncate font-semibold transition-colors group-hover:text-primary">
          {ws.title}
        </h3>
      )}
      <p className="mt-0.5 text-xs text-muted-foreground">
        {meta.label} · {ws.conceptCount} concepts · {progress}% mastered
      </p>

      <Link href={`/workspace/${ws.id}/overview`} className="mt-4">
        <Button variant="outline" size="sm" className="w-full gap-1.5">
          <Play size={14} /> Resume Learning
        </Button>
      </Link>
    </div>
  );
}
