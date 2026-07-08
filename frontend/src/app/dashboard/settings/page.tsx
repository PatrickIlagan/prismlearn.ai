"use client";

import { useUser } from "@clerk/nextjs";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { StudyMode } from "@/types/prism";
import { cn } from "@/lib/utils";

const MODES: { value: StudyMode; label: string; desc: string }[] = [
  { value: "technical", label: "Technical", desc: "Definitions, formulas, precise terms." },
  { value: "conceptual", label: "Conceptual", desc: "Analogies, intuition, the big picture." },
  { value: "comprehensive", label: "Comprehensive", desc: "A balance of both." },
];

export default function SettingsPage() {
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName;
  const email = user?.primaryEmailAddress?.emailAddress;
  const studyMode = useWorkspaceStore((s) => s.studyMode);
  const setStudyMode = useWorkspaceStore((s) => s.setStudyMode);
  const ttsEnabled = useWorkspaceStore((s) => s.ttsEnabled);
  const toggleTts = useWorkspaceStore((s) => s.toggleTts);

  return (
    <div className="mx-auto max-w-3xl px-1 pb-10 sm:px-2">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personalize how Lumi teaches you.</p>
      </header>

      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold">Account</h2>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-semibold text-white">
            {(displayName || email || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
      </div>

      <div className="glass mt-4 rounded-2xl p-5">
        <h2 className="text-sm font-semibold">Default study mode</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setStudyMode(m.value)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                studyMode === m.value
                  ? "border-primary/50 bg-primary/10 ring-1 ring-primary/20"
                  : "border-white/50 bg-white/40 hover:bg-white/70",
              )}
            >
              <p className="text-sm font-medium">{m.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="glass mt-4 flex items-center justify-between rounded-2xl p-5">
        <div>
          <h2 className="text-sm font-semibold">Text-to-speech</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Let Lumi read lessons aloud during tutoring.
          </p>
        </div>
        <button
          onClick={toggleTts}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            ttsEnabled ? "bg-primary" : "bg-muted-foreground/30",
          )}
          aria-label="Toggle text-to-speech"
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
              ttsEnabled ? "left-[22px]" : "left-0.5",
            )}
          />
        </button>
      </div>
    </div>
  );
}
