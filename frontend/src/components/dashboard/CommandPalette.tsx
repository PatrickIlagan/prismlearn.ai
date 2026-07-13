"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  FileText,
  Presentation,
  Video,
  Globe,
  Home,
  BarChart3,
  Settings,
  UploadCloud,
  Play,
  Swords,
  AlertTriangle,
  Bookmark,
} from "lucide-react";
import { listWorkspaces } from "@/lib/api";
import type { WorkspaceSummary } from "@/types/prism";

const SOURCE_ICON = { pdf: FileText, pptx: Presentation, youtube: Video, website: Globe } as const;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);

  useEffect(() => {
    if (open) listWorkspaces().then(setWorkspaces).catch(() => setWorkspaces([]));
  }, [open]);

  function go(path: string) {
    onOpenChange(false);
    router.push(path);
  }

  if (!open) return null;

  const itemClass =
    "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/80 aria-selected:bg-primary/10 aria-selected:text-foreground";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/25 p-4 pt-[14vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
      >
        <Command
          loop
          onKeyDown={(e) => {
            if (e.key === "Escape") onOpenChange(false);
          }}
        >
          <div className="flex items-center gap-2 border-b border-white/40 px-3.5">
            <Search size={16} className="text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Search all workspaces…"
              className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground/70"
            />
            <kbd className="rounded border border-white/60 bg-white/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Esc
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Actions on the most recent workspace — deterministic routing,
                so every entry works in demo mode too. */}
            {workspaces[0] && (
              <Command.Group
                heading="Actions"
                className="px-1 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground [&_[cmdk-group-items]]:mt-1"
              >
                <Command.Item
                  value="resume tutor continue lesson"
                  className={itemClass}
                  onSelect={() => go(`/workspace/${workspaces[0].id}`)}
                >
                  <Play size={16} /> Resume tutor
                  <span className="ml-auto truncate text-xs text-muted-foreground">
                    {workspaces[0].title}
                  </span>
                </Command.Item>
                <Command.Item
                  value="practice exam timed quiz"
                  className={itemClass}
                  onSelect={() => go(`/workspace/${workspaces[0].id}/exam`)}
                >
                  <Swords size={16} /> Start practice exam
                </Command.Item>
                <Command.Item
                  value="review weaknesses weak concepts"
                  className={itemClass}
                  onSelect={() => go(`/workspace/${workspaces[0].id}/review`)}
                >
                  <AlertTriangle size={16} /> Review weaknesses
                </Command.Item>
                <Command.Item
                  value="saved bookmarks review items"
                  className={itemClass}
                  onSelect={() => go("/dashboard/saved")}
                >
                  <Bookmark size={16} /> Saved for review
                </Command.Item>
              </Command.Group>
            )}

            <Command.Group
              heading="Navigate"
              className="px-1 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground [&_[cmdk-group-items]]:mt-1"
            >
              <Command.Item className={itemClass} onSelect={() => go("/dashboard")}>
                <Home size={16} /> Home
              </Command.Item>
              <Command.Item className={itemClass} onSelect={() => go("/dashboard/workspaces")}>
                <UploadCloud size={16} /> My Workspaces
              </Command.Item>
              <Command.Item className={itemClass} onSelect={() => go("/dashboard/analytics")}>
                <BarChart3 size={16} /> Analytics
              </Command.Item>
              <Command.Item className={itemClass} onSelect={() => go("/dashboard/settings")}>
                <Settings size={16} /> Settings
              </Command.Item>
            </Command.Group>

            {workspaces.length > 0 && (
              <Command.Group
                heading="Workspaces"
                className="px-1 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground [&_[cmdk-group-items]]:mt-1"
              >
                {workspaces.map((w) => {
                  const Icon = SOURCE_ICON[w.sourceType];
                  return (
                    <Command.Item
                      key={w.id}
                      value={`${w.title} ${w.sourceType}`}
                      className={itemClass}
                      onSelect={() => go(`/workspace/${w.id}/overview`)}
                    >
                      <Icon size={16} className="text-muted-foreground" />
                      <span className="truncate">{w.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {w.conceptCount} concepts
                      </span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
