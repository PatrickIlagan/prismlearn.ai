"use client";

import Link from "next/link";
import { FileText, Presentation, Video, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "./ProgressRing";
import { workspaceProgress } from "@/lib/progress";
import type { WorkspaceSummary } from "@/types/prism";
import { cn } from "@/lib/utils";

const SOURCE = {
  pdf: { icon: FileText, label: "PDF", tile: "from-rose-400/20 to-red-500/20 text-rose-500" },
  pptx: { icon: Presentation, label: "Slides", tile: "from-amber-400/20 to-orange-500/20 text-amber-600" },
  youtube: { icon: Video, label: "Video", tile: "from-sky-400/20 to-blue-500/20 text-sky-600" },
} as const;

export function WorkspaceCard({ ws }: { ws: WorkspaceSummary }) {
  const meta = SOURCE[ws.sourceType];
  const Icon = meta.icon;
  const progress = workspaceProgress(ws.id);

  return (
    <div className="group glass flex flex-col rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/15">
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

      <h3 className="mt-4 truncate font-semibold transition-colors group-hover:text-primary">
        {ws.title}
      </h3>
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
