"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { RotateCw, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 90;

/**
 * Study the deck in-app: one card at a time, tap to flip, drag (or the arrow
 * buttons) to move between cards. A left/right swipe past the threshold
 * advances with a directional fly-out; a light drag springs back.
 */
export function FlashcardSwiper() {
  const open = useWorkspaceStore((s) => s.flashcardsOpen);
  const setOpen = useWorkspaceStore((s) => s.setFlashcardsOpen);
  const flashcards = useWorkspaceStore((s) => s.flashcards);
  const requestScrollTo = useWorkspaceStore((s) => s.requestScrollTo);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Reset to the first card whenever the deck is (re)opened.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setFlipped(false);
    }
  }, [open]);

  const total = flashcards.length;
  const current = flashcards[index];

  function go(delta: 1 | -1) {
    setDirection(delta);
    setFlipped(false);
    setIndex((i) => Math.max(0, Math.min(total - 1, i + delta)));
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x <= -SWIPE_THRESHOLD && index < total - 1) go(1);
    else if (info.offset.x >= SWIPE_THRESHOLD && index > 0) go(-1);
  }

  function jumpToSource() {
    if (current?.anchorId) {
      requestScrollTo(current.anchorId, "purple");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers size={17} className="text-primary" />
            Flashcards{total > 0 ? ` — ${index + 1} of ${total}` : ""}
          </DialogTitle>
        </DialogHeader>

        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Layers size={22} />
            No flashcards yet — generate a deck from the sidebar.
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative h-64 w-full max-w-sm" style={{ perspective: 1200 }}>
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={current.id}
                  custom={direction}
                  initial={{ x: direction * 60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -direction * 60, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragEnd={handleDragEnd}
                  onClick={() => setFlipped((f) => !f)}
                  className="absolute inset-0 cursor-pointer"
                >
                  {/* Flip container */}
                  <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="relative h-full w-full"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* Front */}
                    <div
                      className="glass absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl p-6 text-center"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Question
                      </span>
                      <p className="text-base font-medium leading-snug">{current.front}</p>
                      <span className="mt-1 text-[11px] text-muted-foreground">
                        Tap to flip
                      </span>
                    </div>
                    {/* Back */}
                    <div
                      className="glass absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-emerald-300/50 bg-emerald-50/40 p-6 text-center"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                        Answer
                      </span>
                      <p className="text-sm leading-relaxed text-foreground/90">{current.back}</p>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-4 flex w-full items-center justify-between gap-2">
              <button
                onClick={() => go(-1)}
                disabled={index === 0}
                className="glass flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"
                aria-label="Previous card"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFlipped((f) => !f)}
                  className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                >
                  <RotateCw size={13} /> Flip
                </button>
                {current?.anchorId && (
                  <button
                    onClick={jumpToSource}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Jump to source →
                  </button>
                )}
              </div>

              <button
                onClick={() => go(1)}
                disabled={index === total - 1}
                className="glass flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"
                aria-label="Next card"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Progress dots */}
            <div className="mt-4 flex max-w-full flex-wrap justify-center gap-1">
              {flashcards.map((c, i) => (
                <span
                  key={c.id}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    i === index ? "bg-primary" : "bg-muted-foreground/25",
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
