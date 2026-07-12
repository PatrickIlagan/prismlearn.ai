"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Mirrors the pricing beats in the promo video: Free / Pro $10mo / Enterprise. */
const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Everything you need to start learning smarter.",
    features: [
      "3 active workspaces",
      "PDF, slides, YouTube & web ingestion",
      "Guided lessons with Lumi",
      "Quizzes, mini-games & XP",
    ],
    cta: "Get started",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$10",
    period: "/month",
    tagline: "For students who want the full mastery engine.",
    features: [
      "Unlimited workspaces",
      "Boss battles & practice exams",
      "Flashcards with spaced repetition",
      "Mastery analytics across subjects",
      "Priority ingestion",
    ],
    cta: "Go Pro",
    href: "/sign-up",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    tagline: "For schools, cohorts, and teams at scale.",
    features: [
      "Dedicated model deployments (Gemma on AMD)",
      "SSO & admin controls",
      "Class-level progress dashboards",
      "Volume pricing",
    ],
    cta: "Talk to us",
    href: "/sign-up",
    highlight: false,
  },
];

export function PricingSection() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {PLANS.map((plan, i) => (
        <motion.div
          key={plan.name}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
          className={cn(
            "glass relative flex flex-col rounded-3xl p-7",
            plan.highlight && "shadow-xl shadow-violet-500/15 ring-2 ring-primary/60 lg:-mt-3 lg:mb-3",
          )}
        >
          {plan.highlight && (
            <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white shadow-md">
              <Sparkles size={11} /> Most popular
            </span>
          )}
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {plan.name}
          </h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
            <span className="text-sm text-muted-foreground">{plan.period}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check size={11} />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <Link href={plan.href} className="mt-7">
            <Button
              size="lg"
              variant={plan.highlight ? "default" : "outline"}
              className="w-full gap-2"
            >
              {plan.cta} <ArrowRight size={16} />
            </Button>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
