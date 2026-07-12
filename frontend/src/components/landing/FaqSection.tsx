"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What AI models power PrismLearning?",
    a: "Tutoring, ingestion, and quiz generation run on OpenAI's open-weight gpt-oss-120b, served by Fireworks AI on AMD Instinct GPUs. Flashcard generation tries Google DeepMind's Gemma 3 27B first on every request, with an automatic fallback to gpt-oss-120b. Enterprise deployments can run Gemma self-hosted on AMD Developer Cloud.",
  },
  {
    q: "Do I need an account to try it?",
    a: "No — hit \"try the demo\" above and you're inside the product with sample workspaces in one click, no sign-up, no credit card. The demo runs on sample data and nothing is saved. The full app is live too: sign up free to upload your own documents, keep your progress, streaks, and mastery across sessions.",
  },
  {
    q: "What can I upload?",
    a: "PDFs, PowerPoint decks, YouTube lectures (via transcript), and website links. Lumi turns any of them into a chaptered study guide with key concepts and a quiz bank.",
  },
  {
    q: "How is this different from just asking ChatGPT?",
    a: "Lumi is grounded only in the document you upload — no outside knowledge sneaking in, no hallucinated facts. And instead of a chat window, the document itself is the interface: chapters stay fogged until you prove mastery, blocks mutate into mini-games, and boss battles gate your progress.",
  },
  {
    q: "Is my data used to train models?",
    a: "No. Your documents are used only to teach you. Inference runs through Fireworks AI's zero-retention serving, and you can delete a workspace — content included — at any time.",
  },
  {
    q: "How much does it cost?",
    a: "Free to start, no credit card. Pro is $10/month for unlimited workspaces, practice exams, spaced-repetition flashcards, and mastery analytics. Enterprise pricing is custom.",
  },
];

export function FaqSection() {
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {FAQS.map((item, i) => (
        <motion.details
          key={item.q}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
          className="group glass rounded-2xl px-5 py-4"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground/90 [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown
              size={16}
              className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
        </motion.details>
      ))}
    </div>
  );
}
