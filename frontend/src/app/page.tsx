import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MascotLumi } from "@/components/prism/MascotLumi";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-100 via-white to-slate-50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <MascotLumi size={32} />
          <span className="text-lg font-bold">PrismLearning.AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles size={13} /> Agentic learning, grounded in your sources
        </div>
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          Turn any document into a{" "}
          <span className="bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">
            guided lesson
          </span>
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
        </div>
      </section>
    </main>
  );
}
