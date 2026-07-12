"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  Check,
  Flame,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The feature bento, NativBuild-style: every card demonstrates its claim with
 * a working micro-interaction instead of describing it — a streaming reply
 * with a live ms counter, a citation pulse, a flippable Gemma flashcard, an
 * SSRF scanner rejecting private IPs, a clickable XP bar, and a
 * delete-means-delete dissolve. All client-side, all loop or respond to
 * clicks, zero backend.
 */

const card = "glass rounded-2xl p-6 text-left overflow-hidden";

const cardIn = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, delay, ease: "easeOut" as const },
});

/* ---------- 1. Latency: streaming tokens + live ms counter ---------- */

const REPLY_TOKENS =
  "Mitosis is how one cell copies itself into two identical daughter cells — think of it as the cell's photocopier.".split(" ");
const STREAM_TOTAL_MS = 860;

function LatencyCard({ delay }: { delay: number }) {
  const [ms, setMs] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) {
      const pause = setTimeout(() => {
        setMs(0);
        setTokens(0);
        setRunning(true);
      }, 3200);
      return () => clearTimeout(pause);
    }
    const start = performance.now();
    let raf: number;
    const tick = () => {
      const elapsed = performance.now() - start;
      setMs(Math.min(Math.round(elapsed), STREAM_TOTAL_MS));
      setTokens(Math.min(Math.floor((elapsed / STREAM_TOTAL_MS) * REPLY_TOKENS.length), REPLY_TOKENS.length));
      if (elapsed < STREAM_TOTAL_MS) raf = requestAnimationFrame(tick);
      else setRunning(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return (
    <motion.div {...cardIn(delay)} className={card}>
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Zap size={19} />
        </div>
        <span className="rounded-full bg-foreground/5 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-foreground/70">
          {ms} ms
        </span>
      </div>
      <h3 className="font-semibold">Ask. It answers in under a second.</h3>
      <div className="mt-3 rounded-xl border border-white/60 bg-white/50 p-3">
        <p className="text-[11px] font-medium text-muted-foreground">&gt; explain mitosis simply</p>
        <p className="mt-1.5 min-h-[54px] text-xs leading-relaxed text-foreground/80">
          {REPLY_TOKENS.slice(0, tokens).join(" ")}
          {running && <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-primary align-middle" />}
        </p>
      </div>
      <p className="mt-2.5 text-[11px] text-muted-foreground">
        gpt-oss-120b · Fireworks AI · AMD Instinct™ GPUs
      </p>
    </motion.div>
  );
}

/* ---------- 2. Grounded RAG: answer cites the exact source line ---------- */

function RagCard({ delay }: { delay: number }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div {...cardIn(delay)} className={card}>
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <BrainCircuit size={19} />
      </div>
      <h3 className="font-semibold">Every answer comes from your document</h3>
      <div className="mt-3 space-y-1.5 rounded-xl border border-white/60 bg-white/50 p-3">
        <div className="h-1.5 w-full rounded-full bg-foreground/10" />
        <motion.div
          animate={{
            backgroundColor: pulse ? "rgba(16,185,129,0.35)" : "rgba(16,185,129,0.15)",
          }}
          transition={{ duration: 0.8 }}
          className="rounded-md px-1.5 py-1"
        >
          <div className="h-1.5 w-11/12 rounded-full bg-emerald-600/40" />
        </motion.div>
        <div className="h-1.5 w-4/5 rounded-full bg-foreground/10" />
      </div>
      <div className="mt-2 flex items-start gap-1.5 text-xs text-foreground/80">
        <motion.span
          animate={{ scale: pulse ? 1.15 : 1 }}
          transition={{ duration: 0.5 }}
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] font-bold text-emerald-600"
        >
          1
        </motion.span>
        <span>
          &ldquo;…produces <b>two identical daughter cells</b>&rdquo; — cited from page 12, not from the
          internet.
        </span>
      </div>
    </motion.div>
  );
}

/* ---------- 3. Gemma flashcard: click (or wait) to flip ---------- */

function GemmaCard({ delay }: { delay: number }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setFlipped((f) => !f), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div {...cardIn(delay)} className={card}>
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles size={19} />
      </div>
      <h3 className="font-semibold">Flashcards by Gemma 3 27B</h3>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="mt-3 block w-full"
        style={{ perspective: 800 }}
        aria-label="Flip flashcard"
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative h-24 w-full"
        >
          <div
            style={{ backfaceVisibility: "hidden" }}
            className="absolute inset-0 flex items-center justify-center rounded-xl border border-violet-200 bg-violet-50/80 px-4 text-center text-sm font-semibold text-foreground/85"
          >
            What organelle makes ATP?
          </div>
          <div
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/90 px-4 text-center text-sm font-semibold text-white"
          >
            The mitochondria — the cell&apos;s power plant.
          </div>
        </motion.div>
      </button>
      <p className="mt-2.5 text-[11px] text-muted-foreground">
        Google DeepMind&apos;s Gemma 3 27B tried first on every deck, auto-fallback to gpt-oss-120b.
        Tap to flip.
      </p>
    </motion.div>
  );
}

/* ---------- 4. SSRF scanner: rejects private IPs on a loop ---------- */

const SSRF_ATTEMPTS = [
  { url: "http://169.254.169.254/meta", ok: false },
  { url: "https://en.wikipedia.org/wiki/Cell", ok: true },
  { url: "http://127.0.0.1:8080/admin", ok: false },
  { url: "https://ocw.mit.edu/biology", ok: true },
];

function SsrfCard({ delay }: { delay: number }) {
  const [idx, setIdx] = useState(0);
  const [verdict, setVerdict] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVerdict(true), 900);
    const next = setTimeout(() => {
      setVerdict(false);
      setIdx((i) => (i + 1) % SSRF_ATTEMPTS.length);
    }, 2600);
    return () => {
      clearTimeout(show);
      clearTimeout(next);
    };
  }, [idx]);

  const attempt = SSRF_ATTEMPTS[idx];

  return (
    <motion.div {...cardIn(delay)} className={card}>
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ShieldCheck size={19} />
      </div>
      <h3 className="font-semibold">Hostile links never get in</h3>
      <div className="mt-3 rounded-xl border border-white/60 bg-white/50 p-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 14 }}
            animate={verdict && !attempt.ok ? { opacity: 1, x: [0, -5, 5, -3, 3, 0] } : { opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ x: { type: "tween", duration: 0.4 } }}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate font-mono text-[11px] text-foreground/70">{attempt.url}</span>
            {verdict ? (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 16 }}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  attempt.ok ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600",
                )}
              >
                {attempt.ok ? <Check size={10} /> : <X size={10} />}
                {attempt.ok ? "ALLOWED" : "BLOCKED"}
              </motion.span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  scanning…
                </motion.span>
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="mt-2.5 text-[11px] text-muted-foreground">
        Private, loopback & link-local addresses rejected — re-checked on every redirect hop.
      </p>
    </motion.div>
  );
}

/* ---------- 5. Mastery engine: click to earn XP, level up ---------- */

function MasteryCard({ delay }: { delay: number }) {
  const [xp, setXp] = useState(35);
  const [level, setLevel] = useState(1);
  const [burst, setBurst] = useState(0);

  function answer() {
    setXp((prev) => {
      const next = prev + 25;
      if (next >= 100) {
        setLevel((l) => l + 1);
        setBurst((b) => b + 1);
        return next - 100;
      }
      return next;
    });
  }

  return (
    <motion.div {...cardIn(delay)} className={cn(card, "lg:col-span-2")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trophy size={19} />
          </div>
          <h3 className="font-semibold">Progress that feels like a game</h3>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Streaks, quests, spaced-repetition flashcards, boss battles, practice exams with KaTeX
            math and real code. Try it — answer correctly:
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600">
          <Flame size={13} /> 6-day streak
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={answer}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:scale-[1.03] active:scale-95"
        >
          Answer correctly (+25 XP)
        </button>
        <div className="min-w-[180px] flex-1">
          <div className="mb-1 flex justify-between text-[11px] font-medium text-muted-foreground">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={level}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="font-semibold text-primary"
              >
                Level {level}
              </motion.span>
            </AnimatePresence>
            <span>{xp} / 100 XP</span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-foreground/10">
            <motion.div
              animate={{ width: `${xp}%` }}
              transition={{ type: "spring", stiffness: 160, damping: 22 }}
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
            />
          </div>
        </div>
        <AnimatePresence>
          {burst > 0 && (
            <motion.span
              key={burst}
              initial={{ scale: 0.4, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
            >
              <Sparkles size={12} /> Level up!
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ---------- 6. Zero retention: delete means delete ---------- */

function RetentionCard({ delay }: { delay: number }) {
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (!deleted) return;
    const id = setTimeout(() => setDeleted(false), 3000);
    return () => clearTimeout(id);
  }, [deleted]);

  return (
    <motion.div {...cardIn(delay)} className={cn(card, "lg:col-span-3")}>
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trash2 size={19} />
          </div>
          <h3 className="font-semibold">Delete means delete</h3>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
            Your documents teach you — they don&apos;t train anyone&apos;s model. Raw files never
            touch a storage bucket, inference is zero-retention, and removing a workspace takes
            its content with it. Try the button.
          </p>
          <p className="mt-2.5 flex items-center gap-1 text-[11px] text-muted-foreground/70">
            <RotateCcw size={10} /> resets in a moment — it&apos;s just a demo
          </p>
        </div>
        <div className="min-h-[110px] rounded-xl border border-white/60 bg-white/50 p-3.5">
          {deleted ? (
            <motion.div
              key="gone"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-[86px] flex-col items-center justify-center gap-1.5 text-emerald-600"
            >
              <Check size={20} />
              <span className="text-[11px] font-semibold">
                Nothing retained. Not even for training.
              </span>
            </motion.div>
          ) : (
            <motion.div key="doc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
              {[100, 92, 78, 60].map((w, i) => (
                <motion.div
                  key={w}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="h-1.5 rounded-full bg-foreground/10"
                  style={{ width: `${w}%` }}
                />
              ))}
              <button
                type="button"
                onClick={() => setDeleted(true)}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-500/20"
              >
                <Trash2 size={11} /> Delete workspace
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- grid ---------- */

export function InteractiveBento() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <LatencyCard delay={0} />
      <RagCard delay={0.08} />
      <GemmaCard delay={0.16} />
      <SsrfCard delay={0.08} />
      <MasteryCard delay={0.16} />
      <RetentionCard delay={0.24} />
    </div>
  );
}
