"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { MermaidDiagram } from "./MermaidDiagram";
import { InteractiveBlock } from "./InteractiveBlock";
import type { BlockGameState, CanvasChapter } from "@/types/prism";
import { cn } from "@/lib/utils";

/**
 * The Active Learning Canvas (center pane).
 *
 * Renders the reviewer as unlockable chapters (fog of war) instead of a wall of
 * markdown. Each visible chapter maps its blocks to InteractiveBlocks that Lumi
 * can mutate into mini-games. Locked chapters are blurred behind a padlock until
 * the store unlocks them.
 */
export function DocumentViewer() {
  const chapters = useWorkspaceStore((s) => s.chapters);
  const unlockedAnchors = useWorkspaceStore((s) => s.unlockedAnchors);
  const blockGames = useWorkspaceStore((s) => s.blockGames);
  const scrollTarget = useWorkspaceStore((s) => s.scrollTarget);
  const activeHighlight = useWorkspaceStore((s) => s.activeHighlight);
  const highlightTone = useWorkspaceStore((s) => s.highlightTone);
  const clearScrollTarget = useWorkspaceStore((s) => s.clearScrollTarget);
  const rootRef = useRef<HTMLDivElement>(null);

  // Agentic viewport control: scroll to the AI-requested anchor.
  useEffect(() => {
    if (!scrollTarget || !rootRef.current) return;
    const el = rootRef.current.querySelector<HTMLElement>(`#${CSS.escape(scrollTarget)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    clearScrollTarget();
  }, [scrollTarget, clearScrollTarget]);

  // Apply/remove the glow highlight on the active chapter heading.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const glow = ["prism-glow-purple", "prism-glow-mint"];
    root.querySelectorAll(".prism-glow-purple, .prism-glow-mint").forEach((n) =>
      n.classList.remove(...glow),
    );
    if (activeHighlight) {
      const el = root.querySelector(`#${CSS.escape(activeHighlight)}`);
      el?.classList.add(highlightTone === "mint" ? "prism-glow-mint" : "prism-glow-purple");
    }
  }, [activeHighlight, highlightTone, chapters]);

  if (chapters.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading your study guide…
      </div>
    );
  }

  return (
    <div ref={rootRef} className="h-full overflow-y-auto px-6 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {chapters.map((chapter) => (
          <ChapterSection
            key={chapter.anchorId}
            chapter={chapter}
            locked={!unlockedAnchors.includes(chapter.anchorId)}
            blockGames={blockGames}
          />
        ))}
      </div>
    </div>
  );
}

function ChapterSection({
  chapter,
  locked,
  blockGames,
}: {
  chapter: CanvasChapter;
  locked: boolean;
  blockGames: Record<string, BlockGameState>;
}) {
  const Heading = chapter.level <= 1 ? "h1" : "h2";
  const completeBlockGame = useWorkspaceStore((s) => s.completeBlockGame);

  return (
    <section className="relative">
      {/* anchor target for scroll + glow */}
      <span id={chapter.anchorId} className="block scroll-mt-6" />

      <div className={cn("transition-all duration-500", locked && "pointer-events-none select-none")}>
        <Heading
          className={cn(
            "font-semibold tracking-tight",
            chapter.level <= 1 ? "text-2xl" : "text-xl",
            locked && "blur-[6px]",
          )}
        >
          {chapter.title}
        </Heading>

        <div className={cn("mt-3 space-y-3", locked && "blur-md")}>
          {chapter.blocks.map((block) => {
            const game = blockGames[block.id];
            if (block.kind === "mermaid") {
              const hotspot =
                game?.mode === "hotspot" && game.payload?.target
                  ? { target: game.payload.target, onSolved: () => completeBlockGame(block.id) }
                  : undefined;
              return (
                <MermaidDiagram
                  key={block.id}
                  code={extractMermaid(block.markdown)}
                  hotspot={hotspot}
                />
              );
            }
            return (
              <InteractiveBlock
                key={block.id}
                block={block}
                mode={game?.mode ?? "read"}
                payload={game?.payload as never}
              />
            );
          })}
        </div>
      </div>

      {/* Fog-of-war padlock overlay */}
      {locked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
        >
          <div className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-foreground/80 shadow-lg">
            <Lock size={15} className="text-primary" /> Locked
          </div>
          <p className="max-w-[16rem] text-center text-xs text-muted-foreground">
            Keep learning with Lumi to unlock this chapter.
          </p>
        </motion.div>
      )}
    </section>
  );
}

function extractMermaid(markdown: string): string {
  return markdown
    .replace(/^```mermaid\s*/i, "")
    .replace(/```$/, "")
    .trim();
}
