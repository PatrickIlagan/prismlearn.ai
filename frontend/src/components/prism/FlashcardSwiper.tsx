"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { RotateCw, ChevronLeft, ChevronRight, Layers, X, Check, Zap, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { isDue, reviewCard, type Recall } from "@/lib/spacedRepetition";
import { addXp as profileAddXp, recordActivity } from "@/lib/profile";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 90;

const RECALL_BUTTONS: { recall: Recall; label: string; icon: typeof X; className: string }[] = [
  { recall: "again", label: "Forgot", icon: X, className: "text-red-500 hover:bg-red-500/10" },
  { recall: "hard", label: "Hard", icon: Zap, className: "text-amber-500 hover:bg-amber-500/10" },
  { recall: "good", label: "Good", icon: Check, className: "text-emerald-500 hover:bg-emerald-500/10" },
  { recall: "easy", label: "Easy", icon: Star, className: "text-violet-500 hover:bg-violet-500/10" },
];

/**
 * Study the deck in-app: one card at a time, tap to flip, drag (or the arrow
 * buttons) to move between cards. A left/right swipe past the threshold
 * advances with a directional fly-out; a light drag springs back.
 *
 * Defaults to only the cards actually due today (spaced repetition — see
 * lib/spacedRepetition.ts) rather than the whole deck every time, so
 * reviewing is a short, focused, daily habit instead of a wall of cards.
 * Rating recall after flipping reschedules that card; "All cards" toggles
 * back to browsing the full deck without affecting scheduling.
 */
export function FlashcardSwiper() {
  const open = useWorkspaceStore((s) => s.flashcardsOpen);
  const setOpen = useWorkspaceStore((s) => s.setFlashcardsOpen);
  const flashcards = useWorkspaceStore((s) => s.flashcards);
  const requestScrollTo = useWorkspaceStore((s) => s.requestScrollTo);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showAll, setShowAll] = useState(false);
  // Bumped after every reviewCard() call to force isDue()/dueCount() to
  // re-read localStorage — due-ness isn't reactive state on its own.
  const [scheduleTick, setScheduleTick] = useState(0);

  // Reset to the first (due) card whenever the deck is (re)opened.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setFlipped(false);
      setShowAll(false);
    }
  }, [open]);

  const dueIds = useMemo(
    () => new Set(flashcards.filter((c) => isDue(c.id)).map((c) => c.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flashcards, scheduleTick],
  );
  const dueCount = dueIds.size;
  const deck = showAll ? flashcards : flashcards.filter((c) => dueIds.has(c.id));
  const total = deck.length;
  const current = deck[index];

  function go(delta: 1 | -1) {
    setDirection(delta);
    setFlipped(false);
    setIndex((i) => Math.max(0, Math.min(total - 1, i + delta)));
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x <= -SWIPE_THRESHOLD && index < total - 1) go(1);
    else if (info.offset.x >= SWIPE_THRESHOLD && index > 0) go(-1);
  }

  function rate(recall: Recall) {
    if (!current) return;
    reviewCard(current.id, recall);
    setScheduleTick((t) => t + 1);
    profileAddXp(recall === "again" ? 2 : 5);
    recordActivity();
    if (index < total - 1) go(1);
    else {
      setDirection(1);
      setFlipped(false);
      // Was on the last card — rating it may shrink the due deck (this
      // render's `deck`/`total` are now stale), so step back one rather
      // than trust a length that's about to change underneath us.
      setIndex((i) => Math.max(0, i - 1));
    }
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
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span className="flex items-center gap-2">
              <Layers size={17} className="text-primary" />
              Flashcards{total > 0 ? ` — ${index + 1} of ${total}` : ""}
            </span>
            {flashcards.length > 0 && (
              <button
                onClick={() => {
                  setShowAll((v) => !v);
                  setIndex(0);
                  setFlipped(false);
                }}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                {showAll ? `Show due only (${dueCount})` : `All cards (${flashcards.length})`}
              </button>
            )}
          </DialogTitle>
        </DialogHeader>

        {flashcards.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Layers size={22} />
            No flashcards yet — generate a deck from the sidebar.
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Check size={22} className="text-emerald-500" />
            All caught up — nothing due today.
            <button
              onClick={() => setShowAll(true)}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              Browse all {flashcards.length} cards anyway →
            </button>
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

            {/* Recall rating — only once the answer's been seen. Rating
                reschedules the card (spaced repetition) and auto-advances,
                so reviewing "due" cards is a fast, one-tap-per-card flow. */}
            {flipped ? (
              <div className="mt-4 grid w-full max-w-sm grid-cols-4 gap-1.5">
                {RECALL_BUTTONS.map(({ recall, label, icon: Icon, className }) => (
                  <button
                    key={recall}
                    onClick={() => rate(recall)}
                    className={cn(
                      "glass flex flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-medium transition-colors",
                      className,
                    )}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            ) : (
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
            )}

            {/* Progress dots */}
            <div className="mt-4 flex max-w-full flex-wrap justify-center gap-1">
              {deck.map((c, i) => (
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
