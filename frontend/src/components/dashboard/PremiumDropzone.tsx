"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, Link2, Loader2, FileUp } from "lucide-react";
import { ingestFile, ingestYoutube, type IngestResult } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";

const MAX_UPLOAD_MB = 25; // keep in sync with backend settings.max_upload_mb

export function PremiumDropzone() {
  const router = useRouter();
  const setIngest = useWorkspaceStore((s) => s.setIngest);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const run = useCallback(
    async (action: () => Promise<IngestResult>) => {
      setBusy(true);
      setError(null);
      try {
        const result = await action();
        setIngest(result.reviewer);
        router.push(`/workspace/${result.workspace_id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setBusy(false);
      }
    },
    [router, setIngest],
  );

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        const code = rejections[0].errors[0]?.code;
        setError(
          code === "file-too-large"
            ? `That file is too large (max ${MAX_UPLOAD_MB} MB).`
            : "Unsupported file. Please upload a .pdf or .pptx.",
        );
        return;
      }
      if (accepted[0]) run(() => ingestFile(accepted[0]));
    },
    [run],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
    },
    maxFiles: 1,
    maxSize: MAX_UPLOAD_MB * 1024 * 1024,
    noClick: busy,
    disabled: busy,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "glass relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-all duration-200",
          isDragActive
            ? "border-primary ring-4 ring-primary/25"
            : "border-violet-300/50 hover:border-primary/50",
          busy && "pointer-events-none opacity-80",
        )}
      >
        <input {...getInputProps()} />

        {/* drag-active spectral wash */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-400/15 via-fuchsia-400/10 to-cyan-400/15"
            />
          )}
        </AnimatePresence>

        <motion.div
          animate={
            busy
              ? {}
              : isDragActive
                ? { y: -8, scale: 1.15, rotate: [0, -6, 6, 0] }
                : { y: 0, scale: 1, rotate: 0 }
          }
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className={cn(
            "relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-white/50",
            isDragActive
              ? "from-violet-500/30 to-fuchsia-500/30 text-primary"
              : "from-violet-500/15 to-fuchsia-500/15 text-primary",
          )}
        >
          {busy ? (
            <Loader2 size={26} className="animate-spin" />
          ) : isDragActive ? (
            <FileUp size={26} />
          ) : (
            <UploadCloud size={26} />
          )}
        </motion.div>

        <p className="relative z-10 font-semibold">
          {busy
            ? "Processing your source…"
            : isDragActive
              ? "Drop to start learning"
              : "Drop a document, or click to browse"}
        </p>
        <p className="relative z-10 mt-1 text-sm text-muted-foreground">
          {busy
            ? "Extracting text and building your Master Reviewer."
            : `PDF or PPTX · YouTube below · max ${MAX_UPLOAD_MB} MB / 20 pages / 30 min`}
        </p>

        {!busy && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className="relative z-10 mt-4 rounded-lg border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-white/80"
          >
            Browse files
          </button>
        )}
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
        <div className="glass flex flex-1 items-center gap-2 rounded-xl px-3">
          <Link2 size={16} className="text-muted-foreground" />
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="…or paste a YouTube URL"
            disabled={busy}
            className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !youtubeUrl.trim()}
          className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 disabled:opacity-40 disabled:shadow-none"
        >
          Ingest
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
