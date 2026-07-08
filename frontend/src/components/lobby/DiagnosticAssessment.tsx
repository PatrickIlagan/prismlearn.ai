"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Check, X, ChevronRight, Rocket } from "lucide-react";
import { generateQuiz } from "@/lib/api";
import { boostConcept } from "@/lib/mastery";
import { playDing } from "@/lib/sounds";
import type { IngestPayload, QuizQuestion } from "@/types/prism";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
// Enough to push a concept clear of the "needs review" threshold.
const KNOWN_BOOST = 60;

function isCorrect(q: QuizQuestion, given: string): boolean {
  return norm(given) === norm(q.answer);
}

/**
 * Optional pre-lesson diagnostic. Generates a short objective quiz across the
 * document; every concept the student answers correctly is boosted so it drops
 * out of "needs review" — the tutor then focuses on what they don't yet know.
 */
export function DiagnosticAssessment({
  workspaceId,
  reviewer,
  documentId,
  onComplete,
}: {
  workspaceId: string;
  reviewer: IngestPayload;
  documentId?: string;
  onComplete: () => void;
}) {
  const conceptCount = reviewer.table_of_contents.length;
  const target = Math.min(Math.max(conceptCount, 3), 6);

  const [phase, setPhase] = useState<"intro" | "loading" | "active" | "done" | "error">("intro");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<string | null>(null);
  const [knownAnchors, setKnownAnchors] = useState<Set<string>>(new Set());
  const [correctCount, setCorrectCount] = useState(0);

  async function start() {
    setPhase("loading");
    try {
      const quiz = await generateQuiz(
        workspaceId,
        { scope: "all", question_count: target, study_focus: "comprehensive" },
        reviewer,
        documentId,
      );
      // Objective questions only — they auto-grade for a fast diagnostic.
      const objective = quiz.questions.filter((q) => q.type !== "short_answer");
      if (objective.length === 0) {
        setPhase("error");
        return;
      }
      setQuestions(objective);
      setPhase("active");
    } catch {
      setPhase("error");
    }
  }

  const current = questions[index];

  function answer(value: string) {
    if (given !== null || !current) return;
    setGiven(value);
    if (isCorrect(current, value)) {
      setCorrectCount((c) => c + 1);
      playDing();
      if (current.anchor_id) {
        boostConcept(current.anchor_id, KNOWN_BOOST);
        setKnownAnchors((s) => new Set(s).add(current.anchor_id!));
      }
    }
    setTimeout(() => {
      if (index + 1 >= questions.length) setPhase("done");
      else {
        setIndex((i) => i + 1);
        setGiven(null);
      }
    }, 900);
  }

  function finish() {
    onComplete(); // let the lobby recompute mastery from the new boosts
  }

  // ---------- INTRO ----------
  if (phase === "intro") {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles size={19} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Already know some of this?</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Take a quick {target}-question diagnostic. We&apos;ll mark what you&apos;ve got down so
              Lumi skips ahead to what you don&apos;t.
            </p>
            <button
              onClick={start}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40"
            >
              Start diagnostic <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- LOADING ----------
  if (phase === "loading") {
    return (
      <div className="glass flex items-center justify-center gap-3 rounded-2xl p-8 text-sm text-muted-foreground">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent"
        />
        Building your diagnostic…
      </div>
    );
  }

  // ---------- ERROR ----------
  if (phase === "error") {
    return (
      <div className="glass rounded-2xl p-5 text-sm">
        <p className="text-muted-foreground">Couldn&apos;t build a diagnostic right now.</p>
        <button onClick={finish} className="mt-2 text-primary hover:underline">
          Continue to the lobby →
        </button>
      </div>
    );
  }

  // ---------- DONE ----------
  if (phase === "done") {
    const known = knownAnchors.size;
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <Rocket size={20} />
        </div>
        <p className="text-2xl font-bold">
          <span className="prism-text">{correctCount}</span>
          <span className="text-base font-medium text-muted-foreground"> / {questions.length}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {known > 0
            ? `You already know ${known} concept${known > 1 ? "s" : ""} — marked as mastered so Lumi focuses on the rest.`
            : "No problem — Lumi will teach this from the ground up."}
        </p>
        <button
          onClick={finish}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25"
        >
          Continue
        </button>
      </div>
    );
  }

  // ---------- ACTIVE ----------
  const options =
    current.type === "true_false" ? ["True", "False"] : current.options;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Diagnostic · {index + 1} of {questions.length}
        </span>
        <button onClick={finish} className="hover:text-foreground hover:underline">
          Skip diagnostic
        </button>
      </div>
      <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
        >
          <p className="mb-3 text-sm font-medium">{current.prompt}</p>
          {current.type === "fill_blank" ? (
            <FillBlank disabled={given !== null} onSubmit={answer} />
          ) : (
            <div className="space-y-2">
              {options.map((opt) => {
                const chosen = given === opt;
                const correct = norm(opt) === norm(current.answer);
                return (
                  <button
                    key={opt}
                    onClick={() => answer(opt)}
                    disabled={given !== null}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      given === null && "hover:border-primary/50 hover:bg-muted",
                      given !== null && correct && "border-emerald-400 bg-emerald-50",
                      chosen && !correct && "border-red-400 bg-red-50",
                    )}
                  >
                    {opt}
                    {given !== null && correct && <Check size={15} className="text-emerald-600" />}
                    {chosen && !correct && <X size={15} className="text-red-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FillBlank({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (v: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && text.trim()) onSubmit(text);
      }}
      className="flex gap-2"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer…"
        className="flex-1 rounded-lg border bg-white/50 px-3 py-2 text-sm outline-none backdrop-blur-sm focus:ring-2 focus:ring-primary/40"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="rounded-lg bg-gradient-to-b from-violet-500 to-violet-600 px-4 text-sm font-medium text-white disabled:opacity-40"
      >
        Check
      </button>
    </form>
  );
}
