"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Lock,
  Check,
  Zap,
  BrainCircuit,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MascotLumi } from "@/components/prism/MascotLumi";
import { FluidBlob } from "@/components/prism/FluidBlob";
import { HeroPrompt } from "@/components/landing/HeroPrompt";
import { RANKS } from "@/lib/rank";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const rankContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const rankItem = {
  hidden: { opacity: 0, x: -24, scale: 0.85 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
  },
};

const AGENTIC_POINTS = [
  "Chapters blur behind a padlock until you've proven mastery",
  "Answering right glows the concept mint and scrolls Lumi's focus there",
  "Blocks mutate into mini-games — cloze, spot-the-lie, drag-to-reorder",
];

const BENTO = [
  {
    key: "latency",
    icon: Zap,
    title: "Sub-second latency",
    body: "Tutor replies land in about a second, ingestion in a few — all served by Fireworks AI, running on AMD Instinct GPUs. No local generation, no other provider.",
    span: "lg:col-span-2",
  },
  {
    key: "rag",
    icon: BrainCircuit,
    title: "Grounded RAG",
    body: "Every answer is drawn only from the document you gave Lumi — no hallucinated facts, no outside knowledge sneaking in.",
    span: "",
  },
  {
    key: "ssrf",
    icon: ShieldCheck,
    title: "SSRF-guarded web ingestion",
    body: "Pasting a website link resolves and validates the host before fetching — private, loopback, and link-local addresses are rejected, re-checked on every redirect hop, not just the original URL.",
    span: "",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* floating spectral orbs — static in the hero, continuously morphing/
          drifting further down the page for a "fluid glass" feel while scrolling */}
      <div className="prism-orb -left-24 -top-24 h-80 w-80 bg-violet-400/40" />
      <div className="prism-orb right-0 top-10 h-72 w-72 bg-fuchsia-300/40" />
      <div className="prism-orb bottom-0 left-1/3 h-72 w-72 bg-cyan-300/30" />
      <FluidBlob className="left-[-6%] top-[120vh] h-96 w-96 bg-violet-400/30" duration={18} hueShift />
      <FluidBlob className="right-[-8%] top-[165vh] h-80 w-80 bg-cyan-300/30" duration={22} delay={2} hueShift />
      <FluidBlob className="left-[10%] top-[230vh] h-72 w-72 bg-fuchsia-300/25" duration={20} delay={1} hueShift />

      <nav className="relative z-10 mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3 glass sm:mx-auto sm:w-[92%]">
        <div className="flex items-center gap-2">
          <MascotLumi size={30} />
          <span className="text-lg font-bold tracking-tight">
            Prism<span className="prism-text">Learning</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* ---------- 1. Hero ---------- */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-24 pb-20 text-center sm:pt-28">
        {/* Floating mock chat bubble — decorative, bobs infinitely to make the
            hero feel alive. Hidden on small screens (no room to float). */}
        <motion.div
          className="glass absolute right-[4%] top-16 hidden w-56 rounded-2xl p-3 text-left shadow-lg shadow-violet-500/10 lg:block"
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: [0, -14, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: 0.4 },
            y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 },
          }}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <MascotLumi size={16} /> Lumi
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Nice — that&apos;s correct! Chapter 2 just unlocked. Ready to keep going?
          </p>
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
            <Check size={10} /> +15 XP
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/50 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
            <Sparkles size={13} /> Agentic learning, grounded in your sources
          </div>
          <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Turn any document into a{" "}
            <span className="prism-text">guided lesson</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Upload a PDF, slide deck, YouTube video, or website link. Lumi builds a study guide
            and teaches it to you step-by-step — scrolling, highlighting, and quizzing as you go.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="mt-9"
        >
          <HeroPrompt />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
          className="mt-5 flex items-center justify-center gap-3"
        >
          <Link href="/sign-up">
            <Button size="lg" className="gap-2">
              Start learning <ArrowRight size={18} />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* ---------- 2. The Agentic Canvas (split: text left, mockup right) ---------- */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Stop reading. <span className="prism-text">Start interacting.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Our Agentic UI doesn&apos;t just chat. It physically manipulates your document.
              Watch the fog of war lift as you prove your mastery.
            </p>
            <ul className="mt-7 space-y-3.5">
              {AGENTIC_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check size={12} />
                  </span>
                  <span className="text-foreground/80">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0.5, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="glass grid gap-5 rounded-3xl p-6 sm:grid-cols-[1fr_1.6fr] sm:p-7"
          >
            {/* fake chapter sidebar */}
            <div className="space-y-2">
              {[
                { title: "1. Cell structure", locked: false },
                { title: "2. Mitosis phases", locked: false },
                { title: "3. Meiosis", locked: true },
                { title: "4. Genetic drift", locked: true },
              ].map((ch) => (
                <div
                  key={ch.title}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium",
                    ch.locked
                      ? "text-muted-foreground/60"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {ch.locked ? <Lock size={12} /> : <Check size={12} />}
                  {ch.title}
                </div>
              ))}
            </div>
            {/* fake reading pane */}
            <div className="space-y-3 text-left">
              <div className="h-3 w-2/3 rounded-full bg-primary/25" />
              <div className="h-2 w-full rounded-full bg-foreground/10" />
              <div className="h-2 w-11/12 rounded-full bg-foreground/10" />
              <div className="h-2 w-4/5 rounded-full bg-foreground/10" />
              <div className="mt-4 h-2 w-full rounded-full bg-foreground/10 blur-[1px]" />
              <div className="h-2 w-3/4 rounded-full bg-foreground/10 blur-[1px]" />
              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/70">
                <Lock size={11} /> Unlocks after Chapter 2
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- 3. The RPG Engine (rising staircase, not a flat grid) ---------- */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <motion.div {...fadeUp} className="mx-auto mb-16 max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Level up your <span className="prism-text">mind</span>.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Daily streaks, targeted quests, and a 5-tier mastery system. Studying finally feels
            like a game.
          </p>
        </motion.div>

        <motion.div
          variants={rankContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-wrap items-end justify-center gap-4"
        >
          {RANKS.map((rank, i) => {
            const Icon = rank.icon;
            return (
              <motion.div
                key={rank.name}
                variants={rankItem}
                style={{ marginBottom: i * 16 }}
                className="glass w-32 rounded-2xl p-5 text-center sm:w-36"
              >
                <div
                  className={cn(
                    "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-white/50",
                    rank.tile,
                  )}
                >
                  <Icon size={22} />
                </div>
                <p className="font-semibold">{rank.name}</p>
                <p className="text-xs text-muted-foreground">Level {rank.minLevel}+</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ---------- 4. The Engine Room & Safety (heading is a bento cell, not a header row) ---------- */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-4 lg:grid-cols-3 lg:grid-rows-2" style={{ perspective: 1200 }}>
          <motion.div
            {...fadeUp}
            className="glass flex flex-col justify-center rounded-2xl p-7 lg:row-span-2"
          >
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Enterprise speed. <span className="prism-text">Zero compromises.</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Powered by Fireworks AI on AMD Instinct GPUs. Guarded by strict SSRF protection and
              zero-retention architecture.
            </p>
          </motion.div>

          {BENTO.map(({ key, icon: Icon, title, body, span }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
              whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
              style={{ transformStyle: "preserve-3d" }}
              className={cn("glass rounded-2xl p-6 text-left", span)}
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={19} />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- 5. Final CTA ---------- */}
      <section className="relative z-10 mx-auto max-w-3xl overflow-visible px-6 py-24 text-center">
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/20 blur-[100px]"
          animate={{
            scale: [1, 1.18, 1],
            filter: ["hue-rotate(0deg)", "hue-rotate(20deg)", "hue-rotate(-14deg)", "hue-rotate(0deg)"],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div {...fadeUp}>
          <MascotLumi size={44} className="mx-auto" />
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to step inside the <span className="prism-text">Prism</span>?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Free to start. No credit card, just a source and a few minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Get Started <ArrowRight size={18} />
              </Button>
            </Link>
            <a
              href="https://github.com/PatrickIlagan/prismlearn.ai/tree/feature/prism-ui-overhaul/documentation"
              target="_blank"
              rel="noreferrer"
            >
              <Button size="lg" variant="outline" className="gap-2">
                <BookOpen size={17} /> View Documentation
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Every generation call runs through Fireworks AI on AMD compute — stated
          here, unauthenticated, so it's visible on the public landing page. */}
      <footer className="relative z-10 mx-auto max-w-4xl px-6 pb-10 text-center">
        <p className="text-xs text-muted-foreground">
          All AI generation runs on{" "}
          <a
            href="https://fireworks.ai"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Fireworks AI
          </a>
          , powered by{" "}
          <a
            href="https://fireworks.ai/partners/amd"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            AMD Instinct GPUs
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
