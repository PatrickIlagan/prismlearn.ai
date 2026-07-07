"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Link2, Loader2 } from "lucide-react";
import { ingestFile, ingestYoutube } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { IngestResult } from "@/lib/api";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.pptx";
const MAX_UPLOAD_MB = 25; // keep in sync with backend settings.max_upload_mb

export function UploadZone() {
  const router = useRouter();
  const setIngest = useWorkspaceStore((s) => s.setIngest);
  const inputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  async function run(action: () => Promise<IngestResult>) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      // Seed the store so the workspace renders instantly on arrival.
      setIngest(result.reviewer);
      router.push(`/workspace/${result.workspace_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const ok = /\.(pdf|pptx)$/i.test(file.name);
    if (!ok) {
      setError("Unsupported file. Please upload a .pdf or .pptx.");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`That file is too large (max ${MAX_UPLOAD_MB} MB).`);
      return;
    }
    run(() => ingestFile(file));
  }

  return (
    <div className="mt-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-primary/10" : "border-primary/30 bg-primary/5",
          busy && "pointer-events-none opacity-70",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="mb-3 animate-spin text-primary" size={32} />
            <p className="font-medium">Processing your source…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Extracting text and building your Master Reviewer.
            </p>
          </>
        ) : (
          <>
            <UploadCloud className="mb-3 text-primary" size={32} />
            <p className="font-medium">Drop your syllabus, presentation, or video here to begin.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Supports .pdf, .pptx, and YouTube URLs · max 20 pages / 30 min
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* YouTube URL */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const url = youtubeUrl.trim();
          if (url && !busy) run(() => ingestYoutube(url));
        }}
        className="mt-3 flex items-center gap-2"
      >
        <div className="flex flex-1 items-center gap-2 rounded-xl border bg-background px-3">
          <Link2 size={16} className="text-muted-foreground" />
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="…or paste a YouTube URL"
            disabled={busy}
            className="flex-1 bg-transparent py-2 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !youtubeUrl.trim()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Ingest
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
