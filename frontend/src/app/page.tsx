"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  ScanText,
  MessagesSquare,
  BrainCircuit,
  UploadCloud,
  Wand2,
  GraduationCap,
  Trophy,
  Flame,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MascotLumi } from "@/components/prism/MascotLumi";
import { HeroPrompt } from "@/components/landing/HeroPrompt";
import { RANKS } from "@/lib/rank";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: ScanText, title: "Ingest anything", body: "PDFs, slide decks, YouTube videos, or any website link become a structured study guide." },
  { icon: MessagesSquare, title: "Learn with Lumi", body: "An agentic tutor that scrolls, highlights, and quizzes you step by step." },
  { icon: BrainCircuit, title: "Grounded in your sources", body: "Every answer is drawn only from what you uploaded — no hallucinations." },
];

const STEPS = [
  { icon: UploadCloud, title: "Add a source", body: "Drop a PDF or PPTX, or paste a YouTube or website link." },
  { icon: Wand2, title: "Lumi builds your reviewer", body: "A chaptered study guide, structured and ready to teach from." },
  { icon: GraduationCap, title: "Learn it step by step", body: "Chapters unlock as you go; blocks turn into mini-games." },
  { icon: Trophy, title: "Master it", body: "Quizzes, flashcards, and spaced review lock in what you learned." },
];

const ENGAGEMENT = [
  { icon: Trophy, title: "Rank up", body: "Five tiers from Spark to Luminary — your badge changes as you level." },
  { icon: Flame, title: "Keep a streak", body: "A real daily streak and rotating quests, not a fake number." },
  { icon: Target, title: "Track mastery", body: "Per-concept mastery that only rises from real, graded progress." },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* floating spectral orbs */}
      <div className="prism-orb -left-24 -top-24 h-80 w-80 bg-violet-400/40" />
      <div className="prism-orb right-0 top-10 h-72 w-72 bg-fuchsia-300/40" />
      <div className="prism-orb bottom-0 left-1/3 h-72 w-72 bg-cyan-300/30" />

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
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/50 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
          <Sparkles size={13} /> Agentic learning, grounded in your sources
        </div>
        <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Turn any document into a{" "}
          <span className="prism-text">guided lesson</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Upload a PDF, slide deck, YouTube video, or website link. Lumi builds a study guide and
          teaches it to you step-by-step — scrolling, highlighting, and quizzing as you go.
        </p>

        <div className="mt-9">
          <HeroPrompt />
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
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
        </div>
      </section>

      {/* ---------- 2. Features ---------- */}
      <motion.section {...fadeUp} className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you need to actually <span className="prism-text">learn it</span>
          </h2>
          <p className="mt-2 text-muted-foreground">
            Not another summarizer — a closed loop from source to mastery.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="glass rounded-2xl p-5 text-left">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={19} />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ---------- 3. How it works ---------- */}
      <motion.section {...fadeUp} className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            From source to <span className="prism-text">mastery</span>, in four steps
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="glass relative rounded-2xl p-5 text-left">
              <span className="absolute right-4 top-4 text-2xl font-bold text-primary/10">
                {i + 1}
              </span>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={19} />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ---------- 4. Engagement / gamification ---------- */}
      <motion.section {...fadeUp} className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Learning that <span className="prism-text">keeps you coming back</span>
          </h2>
          <p className="mt-2 text-muted-foreground">
            Real progress, not vanity numbers — mastery only rises when you actually earn it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {ENGAGEMENT.map(({ icon: Icon, title, body }) => (
            <div key={title} className="glass rounded-2xl p-5 text-left">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={19} />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        {/* Real rank tiers from the app, not a mockup */}
        <div className="glass mt-4 flex flex-wrap items-center justify-center gap-3 rounded-2xl p-5">
          {RANKS.map((rank, i) => {
            const Icon = rank.icon;
            return (
              <div key={rank.name} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-1.5 text-xs font-semibold ring-1 ring-white/50",
                    rank.tile,
                  )}
                >
                  <Icon size={13} /> {rank.name}
                </div>
                {i < RANKS.length - 1 && (
                  <ArrowRight size={14} className="text-muted-foreground/40" />
                )}
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* ---------- 5. Final CTA ---------- */}
      <motion.section {...fadeUp} className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <div className="glass overflow-hidden rounded-3xl px-8 py-14 text-center">
          <MascotLumi size={44} className="mx-auto" />
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Turn your next reading into a{" "}
            <span className="prism-text">lesson</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Free to start. No credit card, just a source and a few minutes.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Start learning <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>

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
