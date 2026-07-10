"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Timer, Trophy, Zap, X, RotateCcw, Check, Swords } from "lucide-react";
import { fetchReviewer, generateQuiz, listDocuments } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { addXp as profileAddXp, completeQuest, recordActivity } from "@/lib/profile";
import { playDing } from "@/lib/sounds";
import { gradeMath, gradeCode } from "@/lib/quizGrading";
import { RichMarkdown } from "@/components/prism/RichMarkdown";
import type { DocumentSummary, Quiz, QuizQuestion } from "@/types/prism";
import { cn } from "@/lib/utils";

type Phase = "loading" | "active" | "results" | "error";

const SECONDS_PER_Q = 25;
const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

function isCorrect(q: QuizQuestion, given: string) {
  if (q.type === "math") return gradeMath(q, given);
  if (q.type === "code") return gradeCode(q, given);
  return norm(given) === norm(q.answer);
}

export function PracticeExamArena({
  workspaceId,
  documentId,
  chapterAnchorId,
  chapterTitle,
}: {
  workspaceId: string;
  documentId?: string;
  /** Scopes the exam to one chapter ("boss battle") instead of the whole
   *  document — set together, from a Boss Battle prompt's link. */
  chapterAnchorId?: string;
  chapterTitle?: string;
}) {
  const isBossBattle = Boolean(chapterAnchorId);
  const awardXp = useWorkspaceStore((s) => s.awardXp);
  const studyMode = useWorkspaceStore((s) => s.studyMode);
  const storeActiveDoc = useWorkspaceStore((s) => s.activeDocumentId);

  const [phase, setPhase] = useState<Phase>("loading");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  // Which document this exam is scoped to (others are skipped).
  const [docId, setDocId] = useState<string | undefined>(documentId ?? undefined);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_Q);
  const xpAwardedRef = useRef(false);

  // Load the workspace's documents once, to power the "which document" picker
  // and resolve a default scope (explicit prop → active doc → primary).
  useEffect(() => {
    let alive = true;
    listDocuments(workspaceId)
      .then((docs) => {
        if (!alive) return;
        setDocuments(docs);
        setDocId((cur) => cur ?? documentId ?? storeActiveDoc ?? docs[0]?.id);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [workspaceId, documentId, storeActiveDoc]);

  // (Re)generate the exam for the selected document.
  useEffect(() => {
    let alive = true;
    setPhase("loading");
    xpAwardedRef.current = false;
    fetchReviewer(workspaceId, docId)
      .then((reviewer) =>
  generateQuiz(
          workspaceId,
          { scope: chapterAnchorId ?? "all", question_count: 8, study_focus: studyMode },
          reviewer,
          docId,
        ),
      )
      .then((quiz: Quiz) => {
        if (!alive) return;
        const objective = quiz.questions.filter((q) => q.type !== "short_answer");
        setQuestions(objective.length >= 3 ? objective : quiz.questions);
        // Reset run state for the (possibly re-picked) document.
        setIndex(0);
        setGiven(null);
        setScore(0);
        setCombo(0);
        setBestCombo(0);
        setCorrectCount(0);
        setTimeLeft(SECONDS_PER_Q);
        setPhase("active");
      })
      .catch(() => alive && setPhase("error"));
    return () => {
      alive = false;
    };
  }, [workspaceId, studyMode, docId, chapterAnchorId]);

  const current = questions[index];
  const answered = given !== null;

  const advance = useCallback(() => {
    setGiven(null);
    setTimeLeft(SECONDS_PER_Q);
    setIndex((i) => {
      if (i + 1 >= questions.length) {
        setPhase("results");
        return i;
      }
      return i + 1;
    });
  }, [questions.length]);

  const answer = useCallback(
    (value: string) => {
      if (answered || !current) return;
      setGiven(value);
      const ok = isCorrect(current, value);
      if (ok) {
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setBestCombo((b) => Math.max(b, nextCombo));
        setCorrectCount((c) => c + 1);
        setScore((s) => s + 100 * nextCombo); // combo multiplier
        playDing();
      } else {
        setCombo(0);
      }
      setTimeout(advance, 1300);
    },
    [answered, current, combo, advance],
  );

  // Per-question countdown; timeout counts as a miss.
  useEffect(() => {
    if (phase !== "active" || answered) return;
    if (timeLeft <= 0) {
      answer(" __timeout__"); // never matches → miss
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 0.1), 100);
    return () => clearTimeout(t);
  }, [phase, answered, timeLeft, answer]);

  // Award XP once on finish.
  useEffect(() => {
    if (phase === "results" && !xpAwardedRef.current) {
      xpAwardedRef.current = true;
      const payout = correctCount * 15 + bestCombo * 5;
      awardXp(payout);
      profileAddXp(payout);
      recordActivity();
      completeQuest("exam");
    }
  }, [phase, correctCount, bestCombo, awardXp]);

  const docPicker =
    documents.length > 1 ? (
      <select
        value={docId ?? ""}
        onChange={(e) => setDocId(e.target.value)}
        className="glass max-w-[45%] truncate rounded-lg px-2 py-1 text-xs font-medium outline-none"
        title="Which document to be examined on (others are skipped)"
      >
        {documents.map((d) => (
          <option key={d.id} value={d.id}>
            {d.title}
          </option>
        ))}
      </select>
    ) : null;

  if (phase === "loading") {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-5">
        {docPicker}
        <Centered>Preparing your exam…</Centered>
      </div>
    );
  }
  if (phase === "error") {
    return (
      <Centered>
        <p className="font-semibold">Couldn&apos;t start the exam.</p>
        <Link href={`/workspace/${workspaceId}/overview`} className="mt-3 text-sm text-primary hover:underline">
          Back to Lobby
        </Link>
      </Centered>
    );
  }

  if (phase === "results") {
    const total = questions.length;
    const accuracy = total ? Math.round((correctCount / total) * 100) : 0;
    const grade = accuracy >= 80 ? "A" : accuracy >= 60 ? "B" : accuracy >= 40 ? "C" : "—";
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass w-full max-w-md rounded-3xl p-8 text-center"
        >
          <div
            className={cn(
              "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white",
              isBossBattle ? "from-amber-400 to-orange-500" : "from-violet-500 to-fuchsia-500",
            )}
          >
            {isBossBattle ? <Swords size={26} /> : <Trophy size={26} />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isBossBattle ? `Boss defeated · ${chapterTitle}` : "Exam complete"}
          </h1>
          <div className="my-5 text-5xl font-bold">
            <span className="prism-text">{score.toLocaleString()}</span>
            <span className="ml-1 text-base font-medium text-muted-foreground">pts</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Best combo" value={`×${bestCombo}`} />
            <Stat label="Grade" value={grade} />
          </div>
          <p className="mt-4 text-xs font-semibold text-emerald-600">
            +{correctCount * 15 + bestCombo * 5} XP earned
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="glass inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <RotateCcw size={15} /> Retry
            </button>
            <Link
              href={`/workspace/${workspaceId}/overview`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25"
            >
              Back to Lobby
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // active
  const timePct = (timeLeft / SECONDS_PER_Q) * 100;
  const verdict = answered ? (isCorrect(current, given!) ? "correct" : "wrong") : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-6">
      {/* top bar */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/workspace/${workspaceId}/overview`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <X size={16} /> Exit
        </Link>
        {isBossBattle ? (
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-orange-500">
            <Swords size={13} /> {chapterTitle}
          </div>
        ) : (
          docPicker
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Zap size={15} className="fill-violet-500 text-violet-500" />
            {score.toLocaleString()}
          </div>
          <AnimatePresence>
            {combo >= 2 && (
              <motion.div
                key={combo}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-sm font-bold text-orange-500"
              >
                <Flame size={14} /> ×{combo}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* progress + timer */}
      <div className="mb-6">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span className="flex items-center gap-1">
            <Timer size={12} /> {Math.ceil(timeLeft)}s
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-500/10">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-100 ease-linear",
              timeLeft < 6
                ? "bg-red-500"
                : "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400",
            )}
            style={{ width: `${timePct}%` }}
          />
        </div>
      </div>

      {/* question — keyed remount on advance (no exit wait, avoids Framer stall) */}
      <div className="flex flex-1 flex-col justify-center">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        >
          <RichMarkdown text={current.prompt} className="mb-6 text-center text-lg font-semibold" />
          <ArenaAnswers question={current} given={given} verdict={verdict} onAnswer={answer} />
        </motion.div>
      </div>
    </div>
  );
}

function ArenaAnswers({
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

  // fill in the blank / math / code — same free-text shape, math and code get
  // monospace styling and a grading-aware answer readout.
  const isMonospace = question.type === "math" || question.type === "code";
  const placeholder =
    question.type === "math"
      ? question.answer_format === "numeric"
        ? "Type a number…"
        : "Type your answer…"
      : question.type === "code"
        ? "Type the exact output or missing line…"
        : "Type your answer…";
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
        placeholder={placeholder}
        className={cn(
          "glass w-full max-w-sm rounded-xl px-4 py-3 text-center text-sm outline-none",
          isMonospace && "font-mono",
          verdict === "correct" && "!border-emerald-400 ring-2 ring-emerald-400/50",
          verdict === "wrong" && "!border-red-400 ring-2 ring-red-400/50",
        )}
      />
      {answered ? (
        <p className="text-sm text-muted-foreground">
          Answer:{" "}
          <span
            className={cn(
              "font-semibold text-foreground",
              isMonospace && "rounded bg-black/5 px-1 py-0.5 font-mono",
            )}
          >
            {question.answer}
          </span>
        </p>
      ) : (
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 disabled:opacity-40"
        >
          Submit
        </button>
      )}
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl py-3">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center text-muted-foreground">
      {children}
    </div>
  );
}
