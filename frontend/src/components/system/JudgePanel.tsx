"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Crosshair, Gamepad2, ListOrdered, Search, Unlock } from "lucide-react";
import { isDemoMode } from "@/lib/demoMode";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";

/**
 * Demo-mode-only "Judge controls": force-triggers each mini-game type on
 * demand so a reviewer can see the whole game engine in seconds instead of
 * reaching each game organically through tutoring. Renders nothing outside
 * demo mode — a signed-in student never sees it.
 *
 * Cloze and spot-the-lie self-generate their payloads from the block text;
 * reorder gets the curriculum's chapter titles as its steps, and hotspot
 * targets a real node label parsed out of the chapter's Mermaid diagram.
 */

const EMPTY: never[] = [];

export function JudgePanel() {
  const [demo, setDemo] = useState(false);
  const [open, setOpen] = useState(true);
  const [hint, setHint] = useState<string | null>(null);

  const chapters = useWorkspaceStore((s) => s.chapters ?? EMPTY);
  const mutateBlockToGame = useWorkspaceStore((s) => s.mutateBlockToGame);
  const unlockAllChapters = useWorkspaceStore((s) => s.unlockAllChapters);

  useEffect(() => {
    setDemo(isDemoMode());
  }, []);

  // The chapter whose Mermaid diagram powers the hotspot game, plus a real
  // node label from it (2nd label if possible — the root node is too easy).
  const hotspotTarget = useMemo(() => {
    for (const ch of chapters) {
      const mermaid = ch.blocks.find((b) => b.kind === "mermaid");
      if (!mermaid) continue;
      const labels = Array.from(mermaid.markdown.matchAll(/\[([^\][]+)\]/g), (m) =>
        m[1].trim(),
      );
      if (labels.length) {
        return { anchorId: ch.anchorId, label: labels[1] ?? labels[0] };
      }
    }
    return null;
  }, [chapters]);

  if (!demo || chapters.length === 0) return null;

  const firstAnchor = chapters[0].anchorId;
  const chapterTitles = chapters.map((c) => c.title);

  function flash(message: string) {
    setHint(message);
    setTimeout(() => setHint((h) => (h === message ? null : h)), 6000);
  }

  const actions = [
    {
      label: "Cloze",
      icon: Gamepad2,
      run: () => {
        mutateBlockToGame(firstAnchor, "cloze");
        flash("Fill in the blanked-out terms in the highlighted block.");
      },
    },
    {
      label: "Spot the lie",
      icon: Search,
      run: () => {
        mutateBlockToGame(chapters[1]?.anchorId ?? firstAnchor, "spot_the_lie");
        flash("One sentence in the highlighted block is false — click it.");
      },
    },
    {
      label: "Reorder",
      icon: ListOrdered,
      run: () => {
        mutateBlockToGame(chapters[2]?.anchorId ?? firstAnchor, "order", {
          steps: chapterTitles,
        });
        flash("Drag the curriculum steps back into order.");
      },
    },
    ...(hotspotTarget
      ? [
          {
            label: "Hotspot",
            icon: Crosshair,
            run: () => {
              mutateBlockToGame(hotspotTarget.anchorId, "hotspot", {
                target: hotspotTarget.label,
                hint: `Find and tap "${hotspotTarget.label}"`,
              });
              flash(`Click "${hotspotTarget.label}" in the diagram.`);
            },
          },
        ]
      : []),
    {
      label: "Unlock all",
      icon: Unlock,
      run: () => {
        unlockAllChapters();
        flash("Fog of war lifted — every chapter is readable.");
      },
    },
  ];

  return (
    <div className="fixed bottom-16 right-4 z-[9997] w-56">
      <div className="glass overflow-hidden rounded-2xl border border-violet-200 shadow-lg">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-primary"
        >
          <span className="flex items-center gap-1.5">
            <Gamepad2 size={13} /> Judge controls
          </span>
          <ChevronDown
            size={14}
            className={cn("transition-transform duration-200", open && "rotate-180")}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="space-y-1 px-2.5 pb-2.5">
                <p className="px-1 pb-1 text-[10px] leading-snug text-muted-foreground">
                  Force-trigger any mini-game right in the document — no need to earn it
                  through the lesson.
                </p>
                {actions.map(({ label, icon: Icon, run }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={run}
                    className="flex w-full items-center gap-2 rounded-lg bg-white/50 px-2.5 py-1.5 text-left text-xs font-medium text-foreground/80 transition hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon size={13} className="shrink-0 text-primary/70" />
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {hint && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass mt-2 rounded-xl border border-violet-200 px-3 py-2 text-[11px] font-medium text-foreground/80 shadow-md"
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
