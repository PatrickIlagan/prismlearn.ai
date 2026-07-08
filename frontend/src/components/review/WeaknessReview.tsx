"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Target, Check, X, ArrowRight, TrendingUp } from "lucide-react";
import { fetchReviewer, generateQuiz } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { boostConcept, conceptStrength, needsReview } from "@/lib/mastery";
import { addXp as profileAddXp, completeQuest, recordActivity } from "@/lib/profile";
import { playDing } from "@/lib/sounds";
import type { IngestPayload, Quiz, QuizQuestion } from "@/types/prism";
import { cn } from "@/lib/utils";

type Phase = "loading" | "active" | "done" | "empty" | "error";

const BOOST_PER_CONCEPT = 30; // enough to clear a 1–2 strike concept
const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const isCorrect = (q: QuizQuestion, given: string) => norm(given) === norm(q.answer);

export function WeaknessReview({
  workspaceId,
  documentId,
}: {
  workspaceId: string;
  documentId?: string;
}) {
  const awardXp = useWorkspaceStore((s) => s.awardXp);
  const studyMode = useWorkspaceStore((s) => s.studyMode);
  const storeActiveDoc = useWorkspaceStore((s) => s.activeDocumentId);
  const docId = documentId ?? storeActiveDoc ?? undefined;

  const [phase, setPhase] = useState<Phase>("loading");
  const [deck, setDeck] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<string | null>(null);
  const [improved, setImproved] = useState<Record<string, string>>({}); // anchor -> title
  const weakTitlesRef = useMemo(() => new Map<string, string>(), []);

  useEffect(() => {
    let alive = true;
    fetchReviewer(workspaceId, docId)
      .then(async (reviewer: IngestPayload) => {
        const weak = needsReview(reviewer.table_of_contents);
        if (weak.length === 0) {
          if (alive) setPhase("empty");
          return;
        }
        const weakAnchors = new Set(weak.map((w) => w.anchorId));
        weak.forEach((w) => weakTitlesRef.set(w.anchorId, w.title));
        const quiz: Quiz = await generateQuiz(
          workspaceId,
          { scope: "all", question_count: 10, study_focus: studyMode },
          reviewer,
          docId,
        );
        const targeted = quiz.questions.filter(
          (q) => q.anchor_id && weakAnchors.has(q.anchor_id),
        );
        if (!alive) return;
        if (targeted.length === 0) {
          setPhase("empty");
        } else {
          setDeck(targeted);
          setPhase("active");
        }
      })
      .catch(() => alive && setPhase("error"));
    return () => {
      alive = false;
    };
  }, [workspaceId, studyMode, docId, weakTitlesRef]);

  const current = deck[index];
  const answered = given !== null;

  const next = useCallback(() => {
    setGiven(null);
    setIndex((i) => {
      if (i + 1 >= deck.length) {
        setPhase("done");
        return i;
      }
      return i + 1;
    });
  }, [deck.length]);

  const answer = useCallback(
    (value: string) => {
      if (answered || !current) return;
      setGiven(value);
      if (isCorrect(current, value) && current.anchor_id) {
        const anchor = current.anchor_id;
        boostConcept(anchor, BOOST_PER_CONCEPT);
        setImproved((m) =>
          m[anchor] ? m : { ...m, [anchor]: weakTitlesRef.get(anchor) ?? "Concept" },
        );
        playDing();
      }
    },
    [answered, current, weakTitlesRef],
  );

  // XP payout once on finish.
  useEffect(() => {
    if (phase === "done") {
      const payout = Object.keys(improved).length * 20;
      awardXp(payout);
      profileAddXp(payout);
      recordActivity();
      if (payout > 0) completeQuest("review");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "loading") return <Centered>Finding your weak spots…</Centered>;
  if (phase === "error") {
    return (
      <Centered>
        <p className="font-semibold">Couldn&apos;t start the review.</p>
        <BackLink workspaceId={workspaceId} />
      </Centered>
    );
  }
  if (phase === "empty") {
    return (
      <Centered>
        <div className="glass max-w-sm rounded-2xl p-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
            <Check size={24} />
          </div>
          <p className="font-semibold">No weak spots right now 🎉</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;re on top of every concept. Keep it up!
          </p>
          <BackLink workspaceId={workspaceId} />
        </div>
      </Centered>
    );
  }

  if (phase === "done") {
    const list = Object.entries(improved);
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass w-full max-w-md rounded-3xl p-8 text-center"
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
            <TrendingUp size={26} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Weak spots shored up</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You strengthened {list.length} {list.length === 1 ? "concept" : "concepts"}.
          </p>
          <ul className="mt-5 space-y-2 text-left">
            {list.map(([anchor, title]) => (
              <li
                key={anchor}
                className="flex items-center justify-between rounded-xl border border-white/50 bg-white/40 px-3 py-2.5 text-sm backdrop-blur-sm"
              >
                <span className="truncate font-medium">{title}</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <TrendingUp size={13} /> {conceptStrength(anchor)}%
                </span>
              </li>
            ))}
          </ul>
          {list.length > 0 && (
            <p className="mt-4 text-xs font-semibold text-emerald-600">
              +{list.length * 20} XP earned
            </p>
          )}
          <BackLink workspaceId={workspaceId} primary />
        </motion.div>
      </div>
    );
  }

  // active
  const verdict = answered ? (isCorrect(current, given!) ? "correct" : "wrong") : null;
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/workspace/${workspaceId}/overview`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <X size={16} /> Exit
        </Link>
        <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
          <Target size={15} /> Review · {index + 1}/{deck.length}
        </div>
      </div>

      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-amber-500/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          animate={{ width: `${((index + 1) / deck.length) * 100}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        >
          <p className="mb-6 text-center text-lg font-semibold">{current.prompt}</p>
          <ReviewAnswers question={current} given={given} verdict={verdict} onAnswer={answer} />

          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mx-auto mt-5 max-w-md rounded-xl border p-3 text-sm",
                verdict === "correct"
                  ? "border-emerald-300 bg-emerald-50/70 text-emerald-900"
                  : "border-amber-300 bg-amber-50/70 text-amber-900",
              )}
            >
              <p className="font-medium">
                {verdict === "correct" ? "Correct!" : `Answer: ${current.answer}`}
              </p>
              {current.explanation && <p className="mt-1 opacity-80">{current.explanation}</p>}
              <button
                onClick={next}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-violet-500 to-violet-600 px-4 py-1.5 text-xs font-medium text-white"
              >
                {index + 1 >= deck.length ? "Finish" : "Next"} <ArrowRight size={13} />
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function ReviewAnswers({
  question,
  given,
  verdict,
  onAnswer,
}: {
  question: QuizQuestion;
  given: string | null;
  verdict: "correct" | "wrong" | null;
  onAnswer: (v: string) => void;
}) {
  const [text, setText] = useState("");
  const answered = given !== null;

  if (question.type === "mcq" || question.type === "true_false") {
    const options = question.type === "true_false" ? ["True", "False"] : question.options;
    return (
      <div className="grid gap-3">
        {options.map((opt) => {
          const chosen = given === opt;
          const correct = norm(opt) === norm(question.answer);
          return (
            <motion.button
              key={opt}
              onClick={() => onAnswer(opt)}
              disabled={answered}
              animate={answered && chosen && !correct ? { x: [0, -6, 6, -4, 4, 0] } : {}}
              transition={{ x: { type: "tween", duration: 0.4, ease: "easeInOut" } }}
              className={cn(
                "glass flex items-center justify-between rounded-xl px-4 py-3.5 text-left text-sm font-medium transition-all",
                !answered && "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/15",
                answered && correct && "!border-emerald-400 ring-2 ring-emerald-400/50",
                answered && chosen && !correct && "!border-red-400 ring-2 ring-red-400/50",
              )}
            >
              {opt}
              {answered && correct && <Check size={16} className="text-emerald-600" />}
              {answered && chosen && !correct && <X size={16} className="text-red-500" />}
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!answered && text.trim()) onAnswer(text);
      }}
      className="flex flex-col items-center gap-3"
    >
      <input
        autoFocus
        value={text}
        disabled={answered}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer…"
        className={cn(
          "glass w-full max-w-sm rounded-xl px-4 py-3 text-center text-sm outline-none",
          verdict === "correct" && "!border-emerald-400 ring-2 ring-emerald-400/50",
          verdict === "wrong" && "!border-red-400 ring-2 ring-red-400/50",
        )}
      />
      {!answered && (
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 disabled:opacity-40"
        >
          Check
        </button>
      )}
    </form>
  );
}

function BackLink({ workspaceId, primary }: { workspaceId: string; primary?: boolean }) {
  return (
    <Link
      href={`/workspace/${workspaceId}/overview`}
      className={cn(
        "mt-6 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium",
        primary
          ? "bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25"
          : "text-primary hover:underline",
      )}
    >
      Back to Lobby
    </Link>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center text-muted-foreground">
      {children}
    </div>
  );
}
