"use client";

import { useEffect, useState } from "react";
import { listWorkspaces } from "@/lib/api";
import type { WorkspaceSummary } from "@/types/prism";
import { StatsBento } from "@/components/dashboard/StatsBento";
import { workspaceProgress } from "@/lib/progress";

export default function AnalyticsPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null);

  useEffect(() => {
    listWorkspaces()
      .then(setWorkspaces)
      .catch(() => setWorkspaces([]));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-1 pb-10 sm:px-2">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your learning at a glance.</p>
      </header>

      <StatsBento workspaces={workspaces} />

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground/80">Mastery by workspace</h2>
        <div className="glass rounded-2xl p-5">
          {workspaces === null ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : workspaces.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No data yet — start a lesson to see your progress.
            </p>
          ) : (
            <ul className="space-y-4">
              {workspaces.map((w) => {
                const pct = workspaceProgress(w.id);
                return (
                  <li key={w.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{w.title}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-violet-500/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
