"use client";

import { useEffect, useState } from "react";
import { listWorkspaces } from "@/lib/api";
import type { WorkspaceSummary } from "@/types/prism";
import { WorkspaceGrid } from "@/components/dashboard/WorkspaceGrid";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null);

  useEffect(() => {
    listWorkspaces()
      .then(setWorkspaces)
      .catch(() => setWorkspaces([]));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-1 pb-10 sm:px-2">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Workspaces</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every study environment you&apos;ve created.
        </p>
      </header>
      <WorkspaceGrid workspaces={workspaces} onWorkspacesChange={setWorkspaces} />
    </div>
  );
}
