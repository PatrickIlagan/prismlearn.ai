"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Brain, Download, Settings2, Loader2, Layers } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { exportFlashcardsPdf } from "@/lib/exportPdf";
import { generateFlashcards } from "@/lib/api";
import type { StudyMode } from "@/types/prism";
import { cn } from "@/lib/utils";
import { DocumentSwitcher } from "./DocumentSwitcher";

const STUDY_MODES: { value: StudyMode; label: string }[] = [
  { value: "technical", label: "Technical" },
  { value: "conceptual", label: "Conceptual" },
  { value: "comprehensive", label: "Comprehensive" },
];

/** Stable reference so the selector never returns a fresh [] (avoids
 *  useSyncExternalStore's "getServerSnapshot infinite loop"). */
const EMPTY_TOC: never[] = [];

export function SidebarAccordion({
  workspaceTitle,
  workspaceId,
}: {
  workspaceTitle: string;
  workspaceId: string;
}) {
  const toc = useWorkspaceStore((s) => s.ingest?.table_of_contents ?? EMPTY_TOC);
  const flashcards = useWorkspaceStore((s) => s.flashcards);
  const hasCards = flashcards.length > 0;
  const setQuizOpen = useWorkspaceStore((s) => s.setQuizOpen);
  const setFlashcardsOpen = useWorkspaceStore((s) => s.setFlashcardsOpen);
  const mergeFlashcards = useWorkspaceStore((s) => s.mergeFlashcards);
  const activeDocumentId = useWorkspaceStore((s) => s.activeDocumentId);
  const hasDoc = toc.length > 0;
  const requestScrollTo = useWorkspaceStore((s) => s.requestScrollTo);
  const studyMode = useWorkspaceStore((s) => s.studyMode);
  const setStudyMode = useWorkspaceStore((s) => s.setStudyMode);
  const ttsEnabled = useWorkspaceStore((s) => s.ttsEnabled);
  const toggleTts = useWorkspaceStore((s) => s.toggleTts);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function handleGenerateFlashcards() {
    setGenerating(true);
    setGenError(null);
    try {
      const cards = await generateFlashcards(
        workspaceId,
        { scope: "all", count: 10, study_focus: studyMode },
        activeDocumentId ?? undefined,
      );
      mergeFlashcards(cards.map((c) => ({ id: c.id, front: c.front, back: c.back, anchorId: c.anchorId })));
      setFlashcardsOpen(true);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Couldn't generate flashcards.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/40 p-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
            <ArrowLeft size={16} /> Back to Dashboard
          </Button>
        </Link>
        <p className="mt-2 px-2 text-sm font-semibold">{workspaceTitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <DocumentSwitcher workspaceId={workspaceId} />

        <Accordion type="multiple" defaultValue={["curriculum", "assessments"]}>
          <AccordionItem value="curriculum">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <BookOpen size={15} /> Curriculum
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-0.5">
                {toc.map((c) => (
                  <li key={c.anchor_id}>
                    <button
                      onClick={() => requestScrollTo(c.anchor_id, "purple")}
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {c.title}
                    </button>
                  </li>
                ))}
                {toc.length === 0 && (
                  <li className="px-2 py-1 text-xs text-muted-foreground">No chapters yet.</li>
                )}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="assessments">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <Brain size={15} /> Assessments
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-0.5 text-sm text-muted-foreground">
                <li>
                  <button
                    onClick={() => setFlashcardsOpen(true)}
                    disabled={!hasCards}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <Layers size={13} /> Flashcard Deck ({flashcards.length})
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleGenerateFlashcards}
                    disabled={!hasDoc || generating}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    {generating ? <Loader2 size={13} className="animate-spin" /> : "✨"} Generate
                    Flashcards
                  </button>
                </li>
                {genError && <li className="px-2 text-xs text-destructive">{genError}</li>}
                <li>
                  <button
                    onClick={() => setQuizOpen(true)}
                    disabled={!hasDoc}
                    className="w-full rounded-md px-2 py-1 text-left transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    ✨ Generate Quiz
                  </button>
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="settings">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <Settings2 size={15} /> Settings
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 px-2 py-1">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Study Mode</p>
                  <div className="flex flex-wrap gap-1">
                    {STUDY_MODES.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setStudyMode(m.value)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-xs transition-colors",
                          studyMode === m.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Audio / TTS</span>
                  <input type="checkbox" checked={ttsEnabled} onChange={toggleTts} className="accent-primary" />
                </label>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="border-t border-white/40 p-3">
        <Button
          className="w-full gap-2"
          disabled={!hasCards}
          onClick={() => exportFlashcardsPdf(workspaceTitle, flashcards)}
        >
          <Download size={16} /> Export PDF{hasCards ? ` (${flashcards.length})` : ""}
        </Button>
        {!hasCards && (
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Complete a concept with Lumi to earn flashcards to export.
          </p>
        )}
      </div>
    </div>
  );
}
