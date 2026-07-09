"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchReviewer, updateDocumentContent } from "@/lib/api";
import type { DocumentSummary } from "@/types/prism";

/**
 * Lets the student directly edit what Lumi teaches from: the document's
 * title and the raw Master Reviewer markdown (the same text rendered in the
 * reader pane, including the "# <span id=\"concept_x\">Title</span>" anchors
 * that define chapters — the backend re-derives the table of contents from
 * whatever headings are still present after saving).
 */
export function EditDocumentContentModal({
  workspaceId,
  doc,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  doc: DocumentSummary;
  onClose: () => void;
  onSaved: (updated: DocumentSummary) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchReviewer(workspaceId, doc.id)
      .then((reviewer) => {
        if (alive) setContent(reviewer.markdown_content);
      })
      .catch(() => alive && setError("Couldn't load this document's content."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, doc.id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateDocumentContent(workspaceId, doc.id, {
        title: title.trim() || doc.title,
        markdownContent: content,
      });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border bg-white/50 px-3 py-2 text-sm outline-none backdrop-blur-sm focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Content Lumi teaches from
            </label>
            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-lg border bg-white/30 text-sm text-muted-foreground">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="w-full resize-y rounded-lg border bg-white/50 px-3 py-2 font-mono text-xs leading-relaxed outline-none backdrop-blur-sm focus:ring-2 focus:ring-primary/40"
              />
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Keep headings in the{" "}
              <code className="rounded bg-muted px-1">{'# <span id="concept_x">Title</span>'}</code>{" "}
              format so they stay as chapters.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || loading}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
