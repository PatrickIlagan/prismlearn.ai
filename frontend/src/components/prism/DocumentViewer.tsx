"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Lock, GraduationCap, Baby, Gamepad2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Slider } from "@/components/ui/slider";
import { COMPLEXITY_LABELS, type ComplexityLevel } from "@/lib/textComplexity";
import { MermaidDiagram } from "./MermaidDiagram";
import { InteractiveBlock } from "./InteractiveBlock";
import type { BlockGameState, BlockMode, CanvasChapter } from "@/types/prism";
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
  const setVisibleBlockId = useWorkspaceStore((s) => s.setVisibleBlockId);
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

  // Feature 1 (ELI5 slider): track whichever block is closest to the viewport
  // center — that's the "currently visible" block the slider acts on.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || chapters.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const centerY = root.getBoundingClientRect().top + root.clientHeight / 2;
        let best: Element | null = null;
        let bestDist = Infinity;
        for (const e of visible) {
          const elCenter = e.boundingClientRect.top + e.boundingClientRect.height / 2;
          const dist = Math.abs(elCenter - centerY);
          if (dist < bestDist) {
            bestDist = dist;
            best = e.target;
          }
        }
        const id = best?.getAttribute("data-block-id");
        if (id) setVisibleBlockId(id);
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    const blockEls = root.querySelectorAll<HTMLElement>("[data-block-id]");
    blockEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [chapters, setVisibleBlockId]);

  if (chapters.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading your study guide…
      </div>
    );
  }

  return (
    <div ref={rootRef} className="h-full overflow-y-auto px-6 py-6 md:px-8">
      <div className="mx-auto max-w-3xl">
        <ComplexityToolbar />
        <div className="space-y-6">
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
    </div>
  );
}

// ── Feature 1: ELI5 reading-level slider ────────────────────────────────────
const COMPLEXITY_ICON = [GraduationCap, GraduationCap, Baby] as const;
const COMPLEXITY_TINT = [
  "text-foreground/70",
  "text-primary",
  "text-fuchsia-600",
] as const;

function ComplexityToolbar() {
  const textComplexity = useWorkspaceStore((s) => s.textComplexity);
  const setTextComplexity = useWorkspaceStore((s) => s.setTextComplexity);
  const pendingCount = useWorkspaceStore(
    (s) => Object.keys(s.simplifyingBlockIds).length,
  );
  const Icon = COMPLEXITY_ICON[textComplexity];

  return (
    <div className="glass sticky top-0 z-10 mb-5 flex items-center gap-3 rounded-xl px-4 py-2.5">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Reading level</span>
      <Slider
        value={[textComplexity]}
        min={0}
        max={2}
        step={1}
        onValueChange={([v]) => setTextComplexity(v as ComplexityLevel)}
        className="max-w-[160px]"
      />
      <span
        className={cn(
          "flex shrink-0 items-center gap-1.5 text-xs font-semibold transition-colors",
          COMPLEXITY_TINT[textComplexity],
        )}
      >
        <Icon size={14} />
        {COMPLEXITY_LABELS[textComplexity]}
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {pendingCount > 0 && (
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            Rewriting…
          </span>
        )}
        <PracticeToggle />
      </div>
    </div>
  );
}

// ── Practice mode: turn the document into a game gauntlet on demand ─────────
// The tutor still triggers games organically mid-lesson; this is the student-
// initiated version — one game per unlocked chapter, type rotated (hotspot
// where the chapter has a diagram), all through the same mutateBlockToGame /
// completeBlockGame path (XP and chapter mastery included). Exiting reverts
// any un-played game blocks back to plain text.
const PRACTICE_ROTATION: BlockMode[] = ["cloze", "spot_the_lie", "order"];

function PracticeToggle() {
  const chapters = useWorkspaceStore((s) => s.chapters);
  const unlockedAnchors = useWorkspaceStore((s) => s.unlockedAnchors);
  const activeGameCount = useWorkspaceStore((s) => Object.keys(s.blockGames).length);
  const mutateBlockToGame = useWorkspaceStore((s) => s.mutateBlockToGame);
  const clearBlockGames = useWorkspaceStore((s) => s.clearBlockGames);
  const [on, setOn] = useState(false);

  // Solving every practice game ends the session naturally.
  const active = on && activeGameCount > 0;

  function startPractice() {
    let i = 0;
    chapters.forEach((ch) => {
      if (!unlockedAnchors.includes(ch.anchorId)) return;
      const mermaid = ch.blocks.find((b) => b.kind === "mermaid");
      if (mermaid) {
        const labels = Array.from(mermaid.markdown.matchAll(/\[([^\][]+)\]/g), (m) =>
          m[1].trim(),
        );
        if (labels.length) {
          mutateBlockToGame(ch.anchorId, "hotspot", { target: labels[1] ?? labels[0] });
          return;
        }
      }
      const type = PRACTICE_ROTATION[i++ % PRACTICE_ROTATION.length];
      mutateBlockToGame(
        ch.anchorId,
        type,
        type === "order" ? { steps: chapters.map((c) => c.title) } : undefined,
      );
    });
    setOn(true);
  }

  function exitPractice() {
    clearBlockGames();
    setOn(false);
  }

  if (chapters.length === 0) return null;

  return (
    <button
      type="button"
      onClick={active ? exitPractice : startPractice}
      title={
        active
          ? "Revert remaining games back to reading"
          : "Turn every unlocked chapter into a mini-game"
      }
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-primary text-white shadow-md shadow-violet-500/25"
          : "bg-primary/10 text-primary hover:bg-primary/20",
      )}
    >
      <Gamepad2 size={13} />
      {active ? "Exit practice" : "Practice"}
    </button>
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
                <div key={block.id} data-block-id={block.id}>
                  <MermaidDiagram code={extractMermaid(block.markdown)} hotspot={hotspot} />
                </div>
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
