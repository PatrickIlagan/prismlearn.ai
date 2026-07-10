"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, Sparkles, RotateCcw, Download, Meh, ThumbsUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { generateQuiz } from "@/lib/api";
import { exportQuizPdf } from "@/lib/exportPdf";
import { playDing } from "@/lib/sounds";
import { boostConcept } from "@/lib/mastery";
import { addXp as profileAddXp, completeQuest, recordActivity } from "@/lib/profile";
import type { Quiz, QuizQuestion } from "@/types/prism";
import { cn } from "@/lib/utils";

type Phase = "config" | "loading" | "active" | "done";

/** Stable reference so the selector never returns a fresh [] (avoids
 *  useSyncExternalStore's "Maximum update depth exceeded" loop). */
const EMPTY_TOC: never[] = [];

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");

/** Grade an objective question client-side; short-answer is self-assessed. */
function isCorrect(q: QuizQuestion, given: string): boolean {
  if (q.type === "short_answer") return given === "self:correct";
  return norm(given) === norm(q.answer);
}

/** The confidence/correctness mismatch is itself useful feedback — fights
 *  the "illusion of competence" (feeling like you know something vs.
 *  actually knowing it) better than a bare right/wrong ever does. */
function confidenceInsight(confidence: "confident" | "unsure", correct: boolean): string {
  if (confidence === "confident" && correct) return "You were sure — and you were right.";
  if (confidence === "confident" && !correct) return "You were sure, but that's not it — this one's worth a closer look.";
  if (confidence === "unsure" && correct) return "You weren't sure, but you got it — nice.";
  return "You weren't sure, and that's okay — now you know.";
}

export function InteractiveQuizModal() {
  const open = useWorkspaceStore((s) => s.quizOpen);
  const setOpen = useWorkspaceStore((s) => s.setQuizOpen);
  const toc = useWorkspaceStore((s) => s.ingest?.table_of_contents ?? EMPTY_TOC);
  const ingest = useWorkspaceStore((s) => s.ingest);
  const studyMode = useWorkspaceStore((s) => s.studyMode);
  const requestScrollTo = useWorkspaceStore((s) => s.requestScrollTo);
  const awardXp = useWorkspaceStore((s) => s.awardXp);

  const [phase, setPhase] = useState<Phase>("config");
  const [scope, setScope] = useState("all");
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // An answer the student has picked/submitted but not yet confirmed a
  // confidence level for — grading (and reveal) is deferred until they do.
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"confident" | "unsure" | null>(null);
  const xpAwardedRef = useRef(false);

  function reset() {
    setPhase("config");
    setQuiz(null);
    setIndex(0);
    setGiven("");
    setRevealed(false);
    setScore(0);
    setSkipped(0);
    setError(null);
    setPendingAnswer(null);
    setConfidence(null);
    xpAwardedRef.current = false;
  }

  // XP payout once per quiz, when results are shown — mirrors the Practice
  // Exam Arena / Weakness Review payout pattern so this shows up on the
  // dashboard the same way those do.
  useEffect(() => {
    if (phase === "done" && quiz && !xpAwardedRef.current) {
      xpAwardedRef.current = true;
      const payout = score * 10;
      awardXp(payout);
      profileAddXp(payout);
      recordActivity();
      if (payout > 0) completeQuest("quiz");
    }
  }, [phase, quiz, score, awardXp]);

  function close() {
    setOpen(false);
    // Delay reset so it doesn't flicker during the close animation.
    setTimeout(reset, 200);
  }

  async function handleGenerate() {
    if (!ingest) return;
    setPhase("loading");
    setError(null);
    try {
      const q = await generateQuiz(
        "current",
        { scope, question_count: count, study_focus: studyMode },
        ingest,
      );
      setQuiz(q);
      setPhase("active");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the quiz.");
      setPhase("config");
    }
  }

  const current = quiz?.questions[index];

  /** The actual grading + reveal, run once a confidence level is confirmed
   *  (or immediately for short-answer's second self-assessment stage, which
   *  never goes through the confidence gate — confidence was already
   *  captured before the model answer was shown). */
  function grade(answer: string) {
    if (!current) return;

    if (current.type === "short_answer") {
      if (answer === "self:pending") {
        if (revealed) return;
        setGiven("self:pending");
        setRevealed(true); // reveal without scoring
        return;
      }
      setGiven(answer);
      if (answer === "self:correct") {
        setScore((s) => s + 1);
        playDing();
        if (current.anchor_id) boostConcept(current.anchor_id, 10);
      }
      return;
    }

    if (revealed) return;
    setGiven(answer);
    setRevealed(true);
    if (isCorrect(current, answer)) {
      setScore((s) => s + 1);
      playDing();
      if (current.anchor_id) boostConcept(current.anchor_id, 10);
    }
  }

  /** What QuestionBody actually calls. Defers to a confidence check before
   *  grading — except short-answer's post-reveal self-assessment
   *  (self:correct/self:wrong), which bypasses it entirely. */
  function check(answer: string) {
    if (!current || revealed) return;
    if (current.type === "short_answer" && answer !== "self:pending") {
      grade(answer);
      return;
    }
    setPendingAnswer(answer);
  }

  function confirmConfidence(level: "confident" | "unsure") {
    setConfidence(level);
    if (pendingAnswer !== null) {
      grade(pendingAnswer);
      setPendingAnswer(null);
    }
  }

  function next() {
    if (!quiz) return;
    setPendingAnswer(null);
    setConfidence(null);
    if (index + 1 >= quiz.questions.length) {
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
      setGiven("");
      setRevealed(false);
    }
  }

  /** Skip the current question without answering (no score, counts as seen). */
  function skip() {
    setSkipped((n) => n + 1);
    next();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            {phase === "done" ? "Quiz Results" : quiz?.title ?? "Generate a Quiz"}
          </DialogTitle>
        </DialogHeader>

        {/* ---------- CONFIG ---------- */}
        {phase === "config" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full rounded-lg border bg-white/50 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all">Entire document</option>
                {toc.map((c) => (
                  <option key={c.anchor_id} value={c.anchor_id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Questions: {count}
              </label>
              <input
                type="range"
                min={3}
                max={10}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleGenerate} disabled={!ingest}>
              Generate Quiz
            </Button>
          </div>
        )}

        {/* ---------- LOADING ---------- */}
        {phase === "loading" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
            />
            <p className="text-sm text-muted-foreground">Building your questions…</p>
          </div>
        )}

        {/* ---------- ACTIVE ---------- */}
        {phase === "active" && current && quiz && (
          <div>
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Question {index + 1} of {quiz.questions.length}
              </span>
              <span className="uppercase tracking-wide">{current.type.replace("_", " ")}</span>
            </div>
            <div className="mb-1 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((index + 1) / quiz.questions.length) * 100}%` }}
              />
            </div>

            <AnimatePresence mode="wait">
              {pendingAnswer !== null ? (
                <motion.div
                  key={`${current.id}-confidence`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: "spring", stiffness: 220, damping: 24 }}
                  className="py-3"
                >
                  <p className="mb-4 font-medium">{current.prompt}</p>
                  <div className="glass rounded-xl p-4 text-center">
                    <p className="mb-3 text-sm text-muted-foreground">
                      How confident are you in that answer?
                    </p>
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => confirmConfidence("unsure")}
                        className="glass flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500/10"
                      >
                        <Meh size={16} /> Not sure
                      </button>
                      <button
                        onClick={() => confirmConfidence("confident")}
                        className="glass flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10"
                      >
                        <ThumbsUp size={16} /> Confident
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: "spring", stiffness: 220, damping: 24 }}
                  className="py-3"
                >
                  <p className="mb-4 font-medium">{current.prompt}</p>
                  <QuestionBody
                    question={current}
                    given={given}
                    revealed={revealed}
                    onAnswer={check}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {revealed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={cn(
                  "mt-3 rounded-lg border p-3 text-sm",
                  isCorrect(current, given)
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-amber-300 bg-amber-50 text-amber-900",
                )}
              >
                <p className="font-medium">
                  {isCorrect(current, given) ? "Correct!" : `Answer: ${current.answer}`}
                </p>
                {current.explanation && <p className="mt-1 opacity-80">{current.explanation}</p>}
                {confidence && (
                  <p className="mt-1.5 text-xs italic opacity-70">
                    {confidenceInsight(confidence, isCorrect(current, given))}
                  </p>
                )}
                {current.anchor_id && (
                  <button
                    onClick={() => {
                      requestScrollTo(current.anchor_id!, "purple");
                      close();
                    }}
                    className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Review this concept →
                  </button>
                )}
              </motion.div>
            )}

            <div className="mt-4 flex items-center justify-between">
              {!revealed ? (
                <button
                  onClick={skip}
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  I know this — skip →
                </button>
              ) : (
                <span />
              )}
              {revealed && (
                <Button onClick={next}>
                  {index + 1 >= quiz.questions.length ? "See Results" : "Next"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ---------- DONE ---------- */}
        {phase === "done" && quiz && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="text-4xl font-bold text-primary">
              {score}/{quiz.questions.length}
            </div>
            <p className="text-sm text-muted-foreground">
              {score === quiz.questions.length
                ? "Perfect score — you've mastered this!"
                : score >= quiz.questions.length / 2
                  ? "Nice work! Review the misses and try again."
                  : "Keep going — revisit the highlighted concepts and retry."}
            </p>
            {skipped > 0 && (
              <p className="text-xs text-muted-foreground">
                {skipped} question{skipped > 1 ? "s" : ""} skipped
              </p>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => exportQuizPdf(quiz.title, quiz)}
              >
                <Download size={15} /> Export PDF
              </Button>
              <Button variant="outline" className="gap-2" onClick={reset}>
                <RotateCcw size={15} /> New Quiz
              </Button>
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function QuestionBody({
  question,
  given,
  revealed,
  onAnswer,
}: {
  question: QuizQuestion;
  given: string;
  revealed: boolean;
  onAnswer: (answer: string) => void;
}) {
  const [text, setText] = useState("");

  // --- MCQ / True-False: option buttons ---
  if (question.type === "mcq" || question.type === "true_false") {
    const options = question.type === "true_false" ? ["True", "False"] : question.options;
    return (
      <div className="space-y-2">
        {options.map((opt) => {
          const chosen = given === opt;
          const correct = norm(opt) === norm(question.answer);
          return (
            <motion.button
              key={opt}
              onClick={() => onAnswer(opt)}
              disabled={revealed}
              animate={revealed && chosen && !correct ? { x: [0, -6, 6, -4, 4, 0] } : {}}
              transition={{ x: { type: "tween", duration: 0.4, ease: "easeInOut" } }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                !revealed && "hover:border-primary/50 hover:bg-muted",
                revealed && correct && "border-emerald-400 bg-emerald-50",
                revealed && chosen && !correct && "border-red-400 bg-red-50",
              )}
            >
              {opt}
              {revealed && correct && <Check size={16} className="text-emerald-600" />}
              {revealed && chosen && !correct && <X size={16} className="text-red-500" />}
            </motion.button>
          );
        })}
      </div>
    );
  }

  // --- Fill in the blank: text input ---
  if (question.type === "fill_blank") {
    return (
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={revealed}
          placeholder="Type your answer…"
          onKeyDown={(e) => e.key === "Enter" && text.trim() && onAnswer(text)}
          className="flex-1 rounded-lg border bg-white/50 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        {!revealed && (
          <Button onClick={() => text.trim() && onAnswer(text)} disabled={!text.trim()}>
            Check
          </Button>
        )}
      </div>
    );
  }

  // --- Short answer: reveal model answer, then self-assess ---
  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={revealed}
        rows={3}
        placeholder="Write your answer, then reveal the model answer…"
        className="w-full resize-none rounded-lg border bg-white/50 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
      {!revealed ? (
        <Button variant="outline" className="w-full" onClick={() => onAnswer("self:pending")}>
          Reveal model answer
        </Button>
      ) : given === "self:pending" ? (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-1.5" onClick={() => onAnswer("self:wrong")}>
            <X size={14} /> I missed it
          </Button>
          <Button className="flex-1 gap-1.5" onClick={() => onAnswer("self:correct")}>
            <Check size={14} /> I got it
          </Button>
        </div>
      ) : null}
    </div>
  );
}
