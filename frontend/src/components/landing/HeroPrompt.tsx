"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Link2, Upload } from "lucide-react";

const EXAMPLES = [
  "Paste a YouTube lecture…",
  "Drop in a PDF chapter…",
  "Add a link to an article…",
  "Upload tomorrow's slide deck…",
];

/**
 * A decorative-but-real "prompt bar" for the hero — mirrors the actual
 * composer styling from LumiChatUI/PremiumDropzone (glass pill, gradient
 * send button) so the hero visually promises exactly what signing up gets
 * you. Submitting (or just clicking in) routes to sign-up, since ingestion
 * itself requires an account.
 */
export function HeroPrompt() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setExampleIndex((i) => (i + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(id);
  }, []);

  function go() {
    router.push("/sign-up");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      className="glass mx-auto flex w-full max-w-xl items-center gap-2 rounded-2xl p-2 pl-4 shadow-lg shadow-violet-500/10"
    >
      <Upload size={17} className="shrink-0 text-muted-foreground" />
      <Link2 size={17} className="shrink-0 text-muted-foreground" />
      <div className="relative flex-1 text-left">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={go}
          className="w-full bg-transparent py-2.5 text-sm outline-none"
        />
        {!value && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center overflow-hidden py-2.5 text-sm text-muted-foreground/70">
            <AnimatePresence mode="wait">
              <motion.span
                key={exampleIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {EXAMPLES[exampleIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        )}
      </div>
      <button
        type="submit"
        aria-label="Start learning"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40"
      >
        <ArrowUp size={17} />
      </button>
    </form>
  );
}
