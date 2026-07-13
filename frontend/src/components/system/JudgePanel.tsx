"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Crosshair, Gamepad2, ListOrdered, RotateCcw, Search, Unlock } from "lucide-react";
import { isDemoMode } from "@/lib/demoMode";
import { boldTerms, extractOrderedSteps } from "@/lib/canvas";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";

/**
 * Demo-mode-only "Judge controls": force-triggers each mini-game type on
 * demand so a reviewer can see the whole game engine in seconds instead of
 * reaching each game organically through tutoring. Renders nothing outside
 * demo mode — a signed-in student never sees it. Bottom-LEFT and collapsed by
 * default: bottom-right overlapped the chat composer in live testing.
 *
 * Cloze gets the document's concept pool for its dropdowns; spot-the-lie
 * corrupts a real sentence client-side; reorder only appears when a chapter
 * has a genuine numbered step list (the game replaces that block, hiding the
 * answer); hotspot targets a real node label from a Mermaid diagram.
 */

const EMPTY: never[] = [];

export function JudgePanel() {
  const [demo, setDemo] = useState(false);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const chapters = useWorkspaceStore((s) => s.chapters ?? EMPTY);
  const mutateBlockToGame = useWorkspaceStore((s) => s.mutateBlockToGame);
  const spawnPracticeGames = useWorkspaceStore((s) => s.spawnPracticeGames);
  const unlockAllChapters = useWorkspaceStore((s) => s.unlockAllChapters);
  const telemetry = useWorkspaceStore((s) => s.tutorTelemetry);

  useEffect(() => {
    setDemo(isDemoMode());
  }, []);

  /** Wipe every piece of demo progress — chat sessions, mastery boosts, SRS
   *  schedule, XP/streak profile, diagnostic flags — then reload fresh. Demo
   *  visitors are anonymous, so only the anon-scoped keys are touched. */
  function resetDemo() {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith("prism_session_") || key?.startsWith("prism_reviewer_")) {
          sessionStorage.removeItem(key);
        }
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (
          key?.endsWith("_anon") ||
          key?.startsWith("prism_diag_done_") ||
          key === "prism_workspaces"
        ) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      /* storage unavailable — reload still resets in-memory state */
    }
    window.location.reload();
  }

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
  // Document-wide concept pool for cloze dropdowns (same as practice mode).
  const conceptPool = chapters.flatMap((c) =>
    c.blocks.flatMap((b) => (b.kind === "text" ? boldTerms(b.markdown) : [])),
  );
  // Reorder only exists where a chapter has a real numbered step list.
  const orderChapter = chapters.find((c) =>
    c.blocks.some((b) => b.kind === "text" && extractOrderedSteps(b.markdown).length > 0),
  );

  function flash(message: string) {
    setHint(message);
    setTimeout(() => setHint((h) => (h === message ? null : h)), 6000);
  }

  const actions = [
    {
      label: "Cloze",
      icon: Gamepad2,
      run: () => {
        mutateBlockToGame(firstAnchor, "cloze", { choices: conceptPool });
        flash("Fill each blank from its dropdown of the document's key concepts.");
      },
    },
    {
      label: "Spot the lie",
      icon: Search,
      run: () => {
        mutateBlockToGame(chapters[1]?.anchorId ?? firstAnchor, "spot_the_lie");
        flash("One sentence in the highlighted block has been altered — click it.");
      },
    },
    ...(orderChapter
      ? [
          {
            label: "Reorder",
            icon: ListOrdered,
            run: () => {
              spawnPracticeGames([orderChapter.anchorId]);
              flash("Drag the steps back into their real order.");
            },
          },
        ]
      : []),
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
    <div className="fixed bottom-4 left-4 z-[9997] hidden w-56 md:block">
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

                {/* Response telemetry — measured client-side per tutor turn */}
                <div className="mt-1.5 space-y-0.5 rounded-lg bg-white/40 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
                  <p className="font-semibold uppercase tracking-wide text-foreground/60">
                    Inference telemetry
                  </p>
                  <p>
                    Model:{" "}
                    <span className="font-medium text-foreground/80">
                      {telemetry?.live ? "gpt-oss-120b" : "sample data (no AI call)"}
                    </span>
                  </p>
                  <p>
                    Serving:{" "}
                    <span className="font-medium text-foreground/80">
                      {telemetry?.live ? "Fireworks AI · AMD Instinct™" : "built-in demo fixtures"}
                    </span>
                  </p>
                  {telemetry ? (
                    <>
                      <p>
                        Latency:{" "}
                        <span className="font-medium text-foreground/80">
                          {telemetry.latencyMs} ms
                        </span>{" "}
                        · {telemetry.live ? "live" : "sample"}
                      </p>
                      <p>
                        UI action:{" "}
                        <span className="font-medium text-foreground/80">{telemetry.command}</span>
                      </p>
                      {telemetry.anchorId && (
                        <p>
                          Cited anchor:{" "}
                          <span className="font-medium text-foreground/80">
                            {telemetry.anchorId}
                          </span>
                        </p>
                      )}
                      {telemetry.isCorrect !== null && (
                        <p>
                          Evaluation:{" "}
                          <span className="font-medium text-foreground/80">
                            {telemetry.isCorrect ? "correct → mastery up" : "incorrect → strike"}
                          </span>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="italic">Send Lumi a message to capture a turn.</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={resetDemo}
                  className="flex w-full items-center gap-2 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20"
                >
                  <RotateCcw size={13} className="shrink-0" />
                  Reset demo state
                </button>
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
