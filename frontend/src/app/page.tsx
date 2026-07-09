import Link from "next/link";
import { ArrowRight, Sparkles, ScanText, MessagesSquare, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MascotLumi } from "@/components/prism/MascotLumi";

const FEATURES = [
  { icon: ScanText, title: "Ingest anything", body: "PDFs, slide decks, and YouTube videos become a structured study guide." },
  { icon: MessagesSquare, title: "Learn with Lumi", body: "An agentic tutor that scrolls, highlights, and quizzes you step by step." },
  { icon: BrainCircuit, title: "Grounded in your sources", body: "Every answer is drawn only from what you uploaded — no hallucinations." },
];

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

      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center sm:py-28">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/50 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
          <Sparkles size={13} /> Agentic learning, grounded in your sources
        </div>
        <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Turn any document into a{" "}
          <span className="prism-text">guided lesson</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Upload a PDF, slide deck, or YouTube video. Lumi builds a study guide and teaches it to
          you step-by-step — scrolling, highlighting, and quizzing as you go.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
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

        {/* feature strip */}
        <div className="mt-20 grid gap-4 sm:grid-cols-3">
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
