"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { listWorkspaces } from "@/lib/api";
import type { WorkspaceSummary } from "@/types/prism";
import { StatsBento } from "./StatsBento";
import { PremiumDropzone } from "./PremiumDropzone";
import { WorkspaceGrid } from "./WorkspaceGrid";
import { DailyQuests } from "./DailyQuests";
import { ProfileCard } from "./ProfileCard";
import { StudyNextCard } from "./StudyNextCard";

export function DashboardHome() {
  const { user } = useUser();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null);

  useEffect(() => {
    let alive = true;
    listWorkspaces()
      .then((ws) => alive && setWorkspaces(ws))
      .catch(() => alive && setWorkspaces([]));
    return () => {
      alive = false;
    };
  }, []);

  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-6xl px-1 pb-10 sm:px-2">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, <span className="prism-text">{firstName}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick up where you left off, or turn a new source into a guided lesson.
        </p>
      </header>

      <StudyNextCard workspaces={workspaces} />
      <ProfileCard />
      <StatsBento workspaces={workspaces} />

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <PremiumDropzone />
        <DailyQuests />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground/80">Recent workspaces</h2>
        </div>
        <WorkspaceGrid workspaces={workspaces} onWorkspacesChange={setWorkspaces} />
      </section>
    </div>
  );
}
