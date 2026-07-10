"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder, useAnimationControls } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GripVertical, Sparkles } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { boldTerms, splitSentences } from "@/lib/canvas";
import type { BlockMode, CanvasBlock, GamePayload } from "@/types/prism";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * A single paragraph of the Active Learning Canvas. Lumi mutates its `mode` via
 * the store; on success it plays a green-glow "pop" (Framer Motion) and reverts
 * to plain reading.
 */
export function InteractiveBlock({
  block,
  mode,
  payload,
}: {
  block: CanvasBlock;
  mode: BlockMode;
  payload?: GamePayload;
}) {
  const completeBlockGame = useWorkspaceStore((s) => s.completeBlockGame);
  const controls = useAnimationControls();
  const [solved, setSolved] = useState(false);

  function celebrate() {
    if (solved) return;
    setSolved(true);
    // Fire the green-glow "pop" (don't await the promise — Framer's animation
    // promise can stall if the node reconciles, which would block the revert).
    controls.start({
      scale: [1, 1.03, 1],
      boxShadow: [
        "0 0 0 0 rgba(16,185,129,0)",
        "0 0 0 4px rgba(16,185,129,0.35)",
        "0 0 0 6px rgba(16,185,129,0)",
      ],
      backgroundColor: ["rgba(16,185,129,0)", "rgba(16,185,129,0.12)", "rgba(16,185,129,0)"],
      transition: { duration: 0.9, ease: "easeInOut" },
    });
    // Revert to plain reading once the celebration has played.
    setTimeout(() => completeBlockGame(block.id), 950);
  }

  return (
    <motion.div
      data-block-id={block.id}
      animate={controls}
      className={cn("rounded-lg", mode !== "read" && "px-1 py-1")}
    >
      {mode === "read" && <ReadBlock block={block} />}
      {mode === "cloze" && <ClozeBlock block={block} payload={payload} onSolved={celebrate} solved={solved} />}
      {mode === "spot_the_lie" && (
        <SpotTheLieBlock block={block} payload={payload} onSolved={celebrate} solved={solved} />
      )}
      {mode === "order" && <OrderBlock payload={payload} onSolved={celebrate} solved={solved} />}
    </motion.div>
  );
}

// ── read ─────────────────────────────────────────────────────────────────────
// Feature 1 (ELI5 slider): a block that was "the currently visible one" when the
// slider moved carries a rewritten override — crossfade to it instead of the
// original markdown, and back again if the slider returns to Academic.
function ReadBlock({ block }: { block: CanvasBlock }) {
  const override = useWorkspaceStore((s) => s.blockComplexity[block.id]);
  const textComplexity = useWorkspaceStore((s) => s.textComplexity);
  const isSimplifying = useWorkspaceStore((s) => Boolean(s.simplifyingBlockIds[block.id]));
  // Must match the CURRENT slider level, not just "any cached rewrite exists"
  // — otherwise a block still shows its old Standard rewrite (or vice versa)
  // under the new level's badge while the real rewrite for this level is
  // still in flight, which reads as a mismatched/stale simplification.
  const showOverride = override && override.level > 0 && override.level === textComplexity;
  const showLoading = !showOverride && textComplexity > 0 && isSimplifying;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {showLoading ? (
        <motion.div
          key="simplify-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-2 rounded-lg p-2.5"
          aria-label="Rewriting this section…"
        >
          <div className="h-3 w-3/4 animate-pulse rounded-full bg-foreground/10" />
          <div className="h-3 w-full animate-pulse rounded-full bg-foreground/10" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-foreground/10" />
        </motion.div>
      ) : showOverride ? (
        <motion.div
          key={`simplified-${override.level}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className={cn(
            "prose prose-sm prose-slate max-w-none rounded-lg p-2.5 text-sm leading-relaxed prose-p:leading-relaxed prose-strong:text-foreground",
            override.level === 2
              ? "border border-fuchsia-300/50 bg-fuchsia-50/50 text-foreground/90"
              : "text-foreground/90",
          )}
        >
          {override.level === 2 && (
            <p className="not-prose mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-fuchsia-600">
              <Sparkles size={12} /> ELI5
            </p>
          )}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{override.text}</ReactMarkdown>
        </motion.div>
      ) : (
        <motion.div
          key="original"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-strong:text-foreground"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.markdown}</ReactMarkdown>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── cloze (fill the blank) ────────────────────────────────────────────────────
type ClozePart = { type: "text"; value: string } | { type: "blank"; answer: string; index: number };

function buildClozeParts(text: string, blanks: string[]): ClozePart[] {
  const parts: ClozePart[] = [];
  let remaining = text;
  let index = 0;
  while (remaining.length) {
    let best = -1;
    let bestLen = 0;
    for (const b of blanks) {
      const pos = remaining.toLowerCase().indexOf(b.toLowerCase());
      if (pos !== -1 && (best === -1 || pos < best)) {
        best = pos;
        bestLen = b.length;
      }
    }
    if (best === -1) {
      parts.push({ type: "text", value: remaining });
      break;
    }
    if (best > 0) parts.push({ type: "text", value: remaining.slice(0, best) });
    parts.push({ type: "blank", answer: remaining.substr(best, bestLen), index: index++ });
    remaining = remaining.slice(best + bestLen);
  }
  return parts;
}

function ClozeBlock({
  block,
  payload,
  onSolved,
  solved,
}: {
  block: CanvasBlock;
  payload?: GamePayload;
  onSolved: () => void;
  solved: boolean;
}) {
  const blanks = useMemo(
    () => (payload?.blanks?.length ? payload.blanks : boldTerms(block.markdown)),
    [payload, block.markdown],
  );
  const parts = useMemo(() => buildClozeParts(block.plain, blanks), [block.plain, blanks]);
  const total = parts.filter((p) => p.type === "blank").length;
  // Ref (not state) so completion is checked against current values with no
  // stale-closure/timing risk as multiple blanks are filled.
  const valuesRef = useRef<Record<number, string>>({});

  function update(i: number, val: string) {
    valuesRef.current[i] = val;
    const allCorrect =
      total > 0 &&
      parts.every(
        (p) => p.type !== "blank" || norm(valuesRef.current[p.index] ?? "") === norm(p.answer),
      );
    if (allCorrect) onSolved();
  }

  return (
    <div className="rounded-xl border border-violet-300/50 bg-violet-50/40 p-3 text-sm leading-loose backdrop-blur-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
        ✍️ Fill in the blanks
      </p>
      <p className="leading-loose text-foreground/90">
        {parts.map((p, i) =>
          p.type === "text" ? (
            <span key={i}>{p.value}</span>
          ) : (
            <ClozeInput
              key={i}
              answer={p.answer}
              disabled={solved}
              onChange={(v) => update(p.index, v)}
            />
          ),
        )}
      </p>
    </div>
  );
}

function ClozeInput({
  answer,
  disabled,
  onChange,
}: {
  answer: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const [val, setVal] = useState("");
  const correct = norm(val) === norm(answer);
  return (
    <input
      value={val}
      disabled={disabled}
      onChange={(e) => {
        setVal(e.target.value);
        onChange(e.target.value);
      }}
      placeholder="…"
      style={{ width: `${Math.max(answer.length, 4) * 0.72 + 1.5}em` }}
      className={cn(
        "mx-0.5 inline-block rounded-md border-b-2 bg-white/70 px-1.5 py-0.5 text-center text-sm outline-none transition-colors",
        val.length === 0
          ? "border-violet-400"
          : correct
            ? "border-emerald-500 text-emerald-700"
            : "border-amber-400",
      )}
    />
  );
}

// ── spot the lie ──────────────────────────────────────────────────────────────
function SpotTheLieBlock({
  block,
  payload,
  onSolved,
  solved,
}: {
  block: CanvasBlock;
  payload?: GamePayload;
  onSolved: () => void;
  solved: boolean;
}) {
  const lie = payload?.lie ?? "In fact, this process happens entirely at random with no real structure.";
  const sentences = useMemo(() => {
    const real = splitSentences(block.plain);
    const at = Math.min(payload?.lie_index ?? Math.floor(real.length / 2), real.length);
    const withLie = [...real];
    withLie.splice(at, 0, lie);
    return withLie.map((text, i) => ({ text, isLie: text === lie, i }));
  }, [block.plain, lie, payload?.lie_index]);

  const [wrongPick, setWrongPick] = useState<number | null>(null);

  function pick(s: { isLie: boolean; i: number }) {
    if (solved) return;
    if (s.isLie) onSolved();
    else {
      setWrongPick(s.i);
      setTimeout(() => setWrongPick(null), 600);
    }
  }

  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50/40 p-3 text-sm backdrop-blur-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-600">
        🕵️ Spot the lie — click the false statement
      </p>
      <p className="leading-relaxed">
        {sentences.map((s) => (
          <motion.span
            key={s.i}
            onClick={() => pick(s)}
            animate={wrongPick === s.i ? { x: [0, -5, 5, -3, 3, 0] } : {}}
            className={cn(
              "cursor-pointer rounded px-0.5 transition-colors hover:bg-amber-200/60",
              wrongPick === s.i && "bg-red-200/70 text-red-700",
            )}
          >
            {s.text}{" "}
          </motion.span>
        ))}
      </p>
    </div>
  );
}

// ── drag to order ─────────────────────────────────────────────────────────────
function shuffled(items: string[]): string[] {
  if (items.length < 2) return items;
  let out = items;
  // reshuffle until it differs from the correct order
  for (let tries = 0; tries < 8 && out.join("|") === items.join("|"); tries++) {
    out = [...items].sort(() => Math.random() - 0.5);
  }
  return out;
}

function OrderBlock({
  payload,
  onSolved,
  solved,
}: {
  payload?: GamePayload;
  onSolved: () => void;
  solved: boolean;
}) {
  const correct = useMemo(() => payload?.steps ?? [], [payload]);
  const [items, setItems] = useState<string[]>(() => shuffled(correct));

  useEffect(() => {
    if (!solved && correct.length > 0 && items.join("|") === correct.join("|")) onSolved();
  }, [items, correct, solved, onSolved]);

  if (correct.length === 0) return null;

  return (
    <div className="rounded-xl border border-sky-300/60 bg-sky-50/40 p-3 text-sm backdrop-blur-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-sky-600">
        🔀 Put the steps in order — drag to rearrange
      </p>
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
        {items.map((item, i) => {
          const inPlace = solved || item === correct[i];
          return (
            <Reorder.Item
              key={item}
              value={item}
              className={cn(
                "flex cursor-grab items-center gap-2 rounded-lg border bg-white/70 px-3 py-2 backdrop-blur-sm active:cursor-grabbing",
                inPlace ? "border-emerald-400/70" : "border-white/60",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  inPlace ? "bg-emerald-500 text-white" : "bg-sky-500/15 text-sky-600",
                )}
              >
                {i + 1}
              </span>
              <span className="flex-1">{item}</span>
              <GripVertical size={15} className="text-muted-foreground/60" />
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    </div>
  );
}
