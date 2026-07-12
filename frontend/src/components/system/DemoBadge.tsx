"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FlaskConical, X } from "lucide-react";
import { exitDemoMode, isDemoMode } from "@/lib/demoMode";

/** Floating pill shown while the prism_demo cookie is set, so a demo visitor
 *  always knows they're on sample data and has a one-click way out. Cookie is
 *  read in an effect (not during render) to keep hydration deterministic. */
export function DemoBadge() {
  const [demo, setDemo] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setDemo(isDemoMode());
  }, [pathname]);

  if (!demo) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[9998] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-violet-200 bg-white/90 py-1.5 pl-4 pr-2 shadow-lg backdrop-blur">
      <FlaskConical size={14} className="shrink-0 text-primary" />
      <span className="whitespace-nowrap text-xs font-medium text-foreground/80">
        Demo mode — sample data, nothing is saved
      </span>
      <button
        type="button"
        onClick={() => {
          exitDemoMode();
          setDemo(false);
          router.push("/");
        }}
        className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20"
      >
        <X size={12} />
        Exit
      </button>
    </div>
  );
}
