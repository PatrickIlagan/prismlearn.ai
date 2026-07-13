"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Check, BookOpen, Play } from "lucide-react";
import { enterDemoMode } from "@/lib/demoMode";
import { Button } from "@/components/ui/button";
import { MascotLumi } from "@/components/prism/MascotLumi";
import { FluidBlob } from "@/components/prism/FluidBlob";
import { HeroPrompt } from "@/components/landing/HeroPrompt";
import { LiveLesson } from "@/components/landing/LiveLesson";
import { ProcessShowcase } from "@/components/landing/ProcessShowcase";
import { WorkspacePreview } from "@/components/landing/WorkspacePreview";
import { InteractiveBento } from "@/components/landing/InteractiveBento";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
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

/** Explicit stack keywords — the strip under the hero judges skim first. */
const STACK = [
  { label: "gpt-oss-120b", sub: "OpenAI open-weight tutor" },
  { label: "Gemma 3 27B", sub: "Google DeepMind flashcards" },
  { label: "Fireworks AI", sub: "Serverless inference" },
  { label: "AMD Instinct™", sub: "GPU compute" },
];

export default function LandingPage() {
  const router = useRouter();

  function startDemo() {
    enterDemoMode();
    router.push("/dashboard");
  }

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

      <nav className="glass sticky top-3 z-50 mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl border border-white/60 bg-white/55 px-5 py-3 shadow-lg shadow-violet-500/5 backdrop-blur-xl sm:w-[92%]">
        <div className="flex items-center gap-2">
          <MascotLumi size={30} />
          <span className="text-lg font-bold tracking-tight">
            Prism<span className="prism-text">Learning</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a href="#pricing" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block">
            Pricing
          </a>
          <a href="#faq" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block">
            FAQ
          </a>
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* ---------- 1. Hero — asymmetric split: pitch left, the product
           playing itself on the right (no centered badge-headline-buttons
           formula) ---------- */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-left"
          >
            <p className="mb-4 text-sm font-semibold text-primary">
              Not a chatbot. An agentic AI tutor.
            </p>
            <h1 className="text-balance text-5xl font-bold leading-[1.04] tracking-tight sm:text-6xl">
              Lumi doesn&apos;t just chat —{" "}
              <span className="prism-text">it drives the document</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Drop in a PDF, slide deck, or lecture. Lumi turns it into a living lesson and then
              <span className="font-medium text-foreground/80"> operates it for you</span> —
              scrolling to each concept, glowing what you&apos;ve mastered, unlocking chapters,
              and turning paragraphs into games as you learn.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
              className="mt-8"
            >
              <HeroPrompt />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
              className="mt-5 flex flex-wrap items-center gap-3"
            >
              <Link href="/sign-up">
                <Button size="lg" className="gap-2">
                  Start learning <ArrowRight size={18} />
                </Button>
              </Link>
              <button
                type="button"
                onClick={startDemo}
                className="group inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/50 px-5 py-2.5 text-sm font-semibold text-primary backdrop-blur-sm transition hover:border-primary/50 hover:bg-white/70"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 transition group-hover:bg-primary/20">
                  <Play size={10} className="ml-0.5" />
                </span>
                Try the demo — no account
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            <LiveLesson />
          </motion.div>
        </div>

        {/* stack strip — the exact model/compute keywords, above the fold */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
        >
          {STACK.map((item) => (
            <div
              key={item.label}
              className="glass rounded-2xl border border-white/60 px-5 py-3 text-center backdrop-blur-sm"
            >
              <p className="text-sm font-bold tracking-tight text-foreground/70">{item.label}</p>
              <p className="text-[11px] text-muted-foreground/70">{item.sub}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ---------- How it works (auto-playing process walkthrough) ---------- */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <motion.div {...fadeUp} className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From source to mastery in <span className="prism-text">four steps</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            No prompt engineering, no setup. Drop a file and Lumi takes it from there.
          </p>
        </motion.div>
        <ProcessShowcase />
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

      {/* ---------- The real product (faithful workspace UI preview) ---------- */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <motion.div {...fadeUp} className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            This is what studying <span className="prism-text">looks like now</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Chapter rail on the left, your living document in the middle, Lumi on the right —
            teaching, quizzing, and unlocking as you go.
          </p>
        </motion.div>
        <WorkspacePreview />
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

      {/* ---------- 4. The Engine Room & Safety — every card is a working
           micro-demo, not a description ---------- */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <motion.div {...fadeUp} className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Enterprise speed. <span className="prism-text">Zero compromises.</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Don&apos;t take our word for it — these cards are live. Click around.
          </p>
        </motion.div>
        <InteractiveBento />
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="relative z-10 mx-auto max-w-5xl scroll-mt-24 px-6 py-20">
        <motion.div {...fadeUp} className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple pricing, <span className="prism-text">serious learning</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start free. Upgrade when the mastery engine has you hooked.
          </p>
        </motion.div>
        <PricingSection />
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="relative z-10 mx-auto max-w-4xl scroll-mt-24 px-6 py-20">
        <motion.div {...fadeUp} className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Questions, <span className="prism-text">answered</span>
          </h2>
        </motion.div>
        <FaqSection />
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
