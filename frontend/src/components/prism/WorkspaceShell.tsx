"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as ResizablePanels from "react-resizable-panels";
import { BookOpen, Sparkles, Brain, Menu, Loader2, AlertTriangle } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { fetchReviewer, listDocuments } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { MobileTab } from "@/types/prism";
import { SidebarAccordion } from "./SidebarAccordion";
import { DocumentViewer } from "./DocumentViewer";
import { LumiChatUI } from "./LumiChatUI";
import { InteractiveQuizModal } from "./InteractiveQuizModal";
import { LevelUpBurst } from "./LevelUpBurst";
import { cn } from "@/lib/utils";

const { Group, Panel, Separator } = ResizablePanels;

const MOBILE_TABS: { id: MobileTab; label: string; icon: typeof BookOpen }[] = [
  { id: "reviewer", label: "Reviewer", icon: BookOpen },
  { id: "chat", label: "Lumi", icon: Sparkles },
  { id: "assessments", label: "Assess", icon: Brain },
  { id: "menu", label: "Menu", icon: Menu },
];

export function WorkspaceShell({
  workspaceId,
  workspaceTitle,
}: {
  workspaceId: string;
  workspaceTitle: string;
}) {
  const setIngest = useWorkspaceStore((s) => s.setIngest);
  const resumeSession = useWorkspaceStore((s) => s.resumeSession);
  const setWorkspaceDocuments = useWorkspaceStore((s) => s.setWorkspaceDocuments);
  const setActiveDocument = useWorkspaceStore((s) => s.setActiveDocument);
  const [mobileTab, setMobileTab] = useState<MobileTab>("reviewer");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    (async () => {
      try {
        const docs = await listDocuments(workspaceId);
        if (!alive) return;
        setWorkspaceDocuments(docs);
        // Primary document = newest; a switcher can change the active one later.
        const active = docs[0] ?? null;
        const sessionKey = active?.id ?? workspaceId;

        const state = useWorkspaceStore.getState();
        // Reuse the reviewer already in the store only if it's the active doc
        // (fresh upload → navigate). Otherwise fetch the active doc's reviewer.
        if (!state.ingest || state.activeDocumentId !== active?.id) {
          const reviewer = await fetchReviewer(workspaceId, active?.id);
          if (!alive) return;
          setIngest(reviewer);
        }
        if (active) setActiveDocument(active.id, active.mode);
        // Rehydrate this document's saved transcript/progress after any reset.
        resumeSession(sessionKey);
        setStatus("ready");
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [workspaceId, setIngest, resumeSession, setWorkspaceDocuments, setActiveDocument]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-gradient-to-br from-violet-50 via-white to-slate-50 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} /> Loading your study guide…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-gradient-to-br from-violet-50 via-white to-slate-50 px-6 text-center">
        <AlertTriangle className="text-amber-500" size={28} />
        <div>
          <p className="font-semibold">We couldn&apos;t load this workspace.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Its study guide isn&apos;t available in this session. Try re-uploading the source.
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      {/* Assessment overlay (opened from the sidebar) */}
      <InteractiveQuizModal />
      {/* Level-up celebration on chapter mastery */}
      <LevelUpBurst />

      {/* ---------- Desktop: resizable 3-pane ---------- */}
      <div className="hidden h-full p-3 md:block">
        <Group orientation="horizontal" className="h-full gap-2">
          <Panel defaultSize="20%" minSize="15%" maxSize="30%">
            <div className="glass h-full overflow-hidden rounded-2xl">
              <SidebarAccordion workspaceTitle={workspaceTitle} workspaceId={workspaceId} />
            </div>
          </Panel>
          <Separator className="w-1.5 cursor-col-resize rounded-full bg-transparent transition-colors hover:bg-primary/30" />
          <Panel defaultSize="52%" minSize="35%">
            <div className="glass-pane h-full overflow-hidden rounded-2xl">
              <DocumentViewer />
            </div>
          </Panel>
          <Separator className="w-1.5 cursor-col-resize rounded-full bg-transparent transition-colors hover:bg-primary/30" />
          <Panel defaultSize="28%" minSize="22%" maxSize="40%">
            <div className="glass h-full overflow-hidden rounded-2xl">
              <LumiChatUI workspaceId={workspaceId} />
            </div>
          </Panel>
        </Group>
      </div>

      {/* ---------- Mobile: single pane + bottom nav ---------- */}
      <div className="flex h-full flex-col md:hidden">
        <div className="min-h-0 flex-1">
          {mobileTab === "reviewer" && <DocumentViewer />}
          {mobileTab === "chat" && <LumiChatUI workspaceId={workspaceId} />}
          {(mobileTab === "assessments" || mobileTab === "menu") && (
            <SidebarAccordion workspaceTitle={workspaceTitle} workspaceId={workspaceId} />
          )}
        </div>
        <nav className="glass grid grid-cols-4">
          {MOBILE_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors",
                mobileTab === id ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
