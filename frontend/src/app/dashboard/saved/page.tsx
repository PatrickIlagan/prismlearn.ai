"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, MessageCircle, HelpCircle, Layers, Tag, Trash2, ArrowRight } from "lucide-react";
import { listSaved, removeSaved, type SavedItem, type SavedItemType } from "@/lib/savedItems";
import { cn } from "@/lib/utils";

const TYPE_META: Record<SavedItemType, { label: string; icon: typeof Bookmark; tint: string }> = {
  question: { label: "Quiz question", icon: HelpCircle, tint: "bg-amber-100 text-amber-700" },
  lumi: { label: "Lumi explanation", icon: MessageCircle, tint: "bg-violet-100 text-violet-700" },
  flashcard: { label: "Flashcard", icon: Layers, tint: "bg-sky-100 text-sky-700" },
  concept: { label: "Concept", icon: Tag, tint: "bg-emerald-100 text-emerald-700" },
};

/** Unified review page for everything bookmarked across the app. Pure
 *  localStorage — works identically signed-in or in demo mode. */
export default function SavedPage() {
  const [items, setItems] = useState<SavedItem[] | null>(null);

  useEffect(() => {
    setItems(listSaved());
  }, []);

  function remove(id: string) {
    removeSaved(id);
    setItems(listSaved());
  }

  return (
    <div className="mx-auto max-w-4xl px-1 pb-10 sm:px-2">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Bookmark size={22} className="text-primary" /> Saved for review
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you bookmarked — questions, explanations, and concepts — in one place.
        </p>
      </header>

      {items === null ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <Bookmark size={28} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground/70">Nothing saved yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Tap the bookmark icon on a quiz answer or one of Lumi&apos;s explanations and it
            will show up here for later review.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => {
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      meta.tint,
                    )}
                  >
                    <Icon size={10} /> {meta.label}
                  </span>
                  <button
                    onClick={() => remove(item.id)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground/60 transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label="Remove from saved"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="mt-2 text-sm font-medium leading-snug">{item.title}</p>
                {item.body && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                )}
                {item.workspaceId && (
                  <Link
                    href={`/workspace/${item.workspaceId}/overview`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Open workspace <ArrowRight size={11} />
                  </Link>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
