"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Presentation, Video, Loader2 } from "lucide-react";
import { listWorkspaces } from "@/lib/api";
import type { WorkspaceSummary } from "@/types/prism";

const ICONS = {
  pdf: FileText,
  pptx: Presentation,
  youtube: Video,
} as const;

function WorkspaceCard({ ws }: { ws: WorkspaceSummary }) {
  const Icon = ICONS[ws.sourceType];
  return (
    <Link
      href={`/workspace/${ws.id}`}
      className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon size={20} />
      </div>
      <h3 className="font-semibold group-hover:text-primary">{ws.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{ws.conceptCount} concepts</p>
    </Link>
  );
}

export function WorkspaceGrid() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listWorkspaces()
      .then((ws) => alive && setWorkspaces(ws))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Failed to load."));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return <p className="mt-8 text-sm text-destructive">{error}</p>;
  }

  if (workspaces === null) {
    return (
      <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading your workspaces…
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <p className="mt-8 text-sm text-muted-foreground">
        No workspaces yet — upload a source above to create your first one.
      </p>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((ws) => (
        <WorkspaceCard key={ws.id} ws={ws} />
      ))}
    </div>
  );
}
