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
            "prose prose-lg prose-slate max-w-none rounded-lg p-2.5 leading-relaxed prose-p:leading-relaxed prose-strong:text-foreground",
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
          className="prose prose-lg prose-slate max-w-none prose-p:leading-relaxed prose-strong:text-foreground"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.markdown}</ReactMarkdown>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── cloze (fill the blank) ────────────────────────────────────────────────────
type ClozePart = { type: "text"; value: string } | { type: "blank"; answer: string; index: number };

// A blank must be a term, not a passage — live docs surfaced blocks whose only
// bold span was a full sentence, producing one giant context-free blank.
const MAX_BLANK_CHARS = 36;
const MAX_BLANK_WORDS = 4;

function usableBlanks(candidates: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    const t = c.trim();
    if (!t || t.length > MAX_BLANK_CHARS || t.split(/\s+/).length > MAX_BLANK_WORDS) continue;
    const key = norm(t);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** When a block has no usable bold terms, blank its most distinctive words
 *  instead of giving up (or worse, blanking the whole block). */
function fallbackBlanks(plain: string): string[] {
  const words = Array.from(new Set(plain.match(/[A-Za-z][A-Za-z-]{6,}/g) ?? []));
  return words.sort((a, b) => b.length - a.length).slice(0, 2);
}

/** Deterministic shuffle (FNV-ish hash walk) so each blank's options keep a
 *  stable order across re-renders instead of jumping around. */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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
  const blanks = useMemo(() => {
    const primary = usableBlanks(
      payload?.blanks?.length ? payload.blanks : boldTerms(block.markdown),
    );
    return primary.length ? primary : usableBlanks(fallbackBlanks(block.plain));
  }, [payload, block.markdown, block.plain]);
  // Choices per blank, best pool first: payload.choices (practice mode passes
  // the document's key concepts, so a concept blank gets concept distractors),
  // then the block's own terms, then distinctive words. Typing exact terms was
  // too hard in live testing — a dropdown keeps it a recall check, not a
  // spelling test.
  const choicePool = useMemo(
    () =>
      usableBlanks([
        ...(payload?.choices ?? []),
        ...blanks,
        ...boldTerms(block.markdown),
        ...fallbackBlanks(block.plain),
      ]),
    [payload?.choices, blanks, block.markdown, block.plain],
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
    <div className="rounded-xl border border-violet-300/50 bg-violet-50/40 p-3 text-base leading-loose backdrop-blur-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
        ✍️ Fill in the blanks
      </p>
      <p className="leading-loose text-foreground/90">
        {parts.map((p, i) =>
          p.type === "text" ? (
            <span key={i}>{p.value}</span>
          ) : (
            <ClozeSelect
              key={i}
              answer={p.answer}
              index={p.index}
              pool={choicePool}
              disabled={solved}
              onChange={(v) => update(p.index, v)}
            />
          ),
        )}
      </p>
    </div>
  );
}

function ClozeSelect({
  answer,
  index,
  pool,
  disabled,
  onChange,
}: {
  answer: string;
  index: number;
  pool: string[];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const [val, setVal] = useState("");
  const correct = norm(val) === norm(answer);
  const options = useMemo(() => {
    // Seed by blank position too — repeated answers ("cell" ×4) would
    // otherwise produce four identical dropdowns.
    const distractors = seededShuffle(
      pool.filter((p) => norm(p) !== norm(answer)),
      `${answer}:${index}`,
    ).slice(0, 3);
    return seededShuffle([answer, ...distractors], `${answer}:${index}:order`);
  }, [answer, index, pool]);

  return (
    <select
      value={val}
      disabled={disabled}
      onChange={(e) => {
        setVal(e.target.value);
        onChange(e.target.value);
      }}
      className={cn(
        "mx-0.5 inline-block max-w-[220px] cursor-pointer rounded-md border-b-2 bg-white/70 px-1.5 py-0.5 text-center text-base outline-none transition-colors",
        val.length === 0
          ? "border-violet-400 text-muted-foreground"
          : correct
            ? "border-emerald-500 text-emerald-700"
            : "border-amber-400",
      )}
    >
      <option value="" disabled>
        choose…
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// ── spot the lie ──────────────────────────────────────────────────────────────
// When the trigger didn't supply a lie (practice mode), we don't inject a
// generic third-person sentence ("Everything described here…" reads as
// commentary about the paragraph, not part of it — a dead giveaway in live
// testing). Instead we corrupt one of the block's OWN sentences in place with
// a meaning-flipping swap, so the lie is written in the document's voice and
// spotting it requires actually knowing the content.
const LIE_SWAPS: [RegExp, string][] = [
  [/\bidentical\b/i, "unrelated"],
  [/\balways\b/i, "never"],
  [/\bnever\b/i, "always"],
  [/\bincreases?\b/i, "decreases"],
  [/\bdecreases?\b/i, "increases"],
  [/\bmore\b/i, "less"],
  [/\bfaster\b/i, "slower"],
  [/\bbefore\b/i, "after"],
  [/\ball\b/i, "no"],
  [/\btwo\b/i, "seven"],
  [/\bproduces?\b/i, "eliminates"],
  [/\bstores?\b/i, "discards"],
  [/\brequires?\b/i, "forbids"],
  [/\bcan\b(?!not)/i, "cannot"],
  [/\bis\b(?! not)/i, "is not"],
  [/\bare\b(?! not)/i, "are not"],
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

/** Find a sentence a swap applies to (rotating the starting sentence by seed
 *  so different blocks corrupt different spots) and flip its meaning. Swaps
 *  are ordered most-specific first; the generic is/are negations at the end
 *  guarantee nearly every real paragraph yields a corruption. */
function corruptSentence(
  sentences: string[],
  seed: number,
): { idx: number; lie: string } | null {
  for (const [re, repl] of LIE_SWAPS) {
    for (let k = 0; k < sentences.length; k++) {
      const idx = (seed + k) % sentences.length;
      if (re.test(sentences[idx])) return { idx, lie: sentences[idx].replace(re, repl) };
    }
  }
  return null;
}

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
  const sentences = useMemo(() => {
    const real = splitSentences(block.plain);
    if (payload?.lie) {
      // Tutor-authored lie: insert it where the model said.
      const at = Math.min(payload.lie_index ?? Math.floor(real.length / 2), real.length);
      const withLie = [...real];
      withLie.splice(at, 0, payload.lie);
      return withLie.map((text, i) => ({ text, isLie: i === at, i }));
    }
    // No authored lie (practice mode): corrupt one real sentence in place.
    const corrupted = corruptSentence(real, hashString(block.id));
    if (corrupted) {
      return real.map((text, i) => ({
        text: i === corrupted.idx ? corrupted.lie : text,
        isLie: i === corrupted.idx,
        i,
      }));
    }
    // Nothing swappable (rare) — flag the last sentence as a doubled version
    // of itself, which at least stays in the paragraph's own voice.
    const lastIdx = real.length - 1;
    return real.map((text, i) => ({
      text: i === lastIdx ? `${text} This has since been proven false.` : text,
      isLie: i === lastIdx,
      i,
    }));
  }, [block.plain, block.id, payload?.lie, payload?.lie_index]);

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
    <div className="rounded-xl border border-amber-300/60 bg-amber-50/40 p-3 text-base backdrop-blur-sm">
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
    <div className="rounded-xl border border-sky-300/60 bg-sky-50/40 p-3 text-base backdrop-blur-sm">
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
