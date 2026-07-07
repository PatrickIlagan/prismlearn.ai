"use client";

import { useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { MermaidDiagram } from "./MermaidDiagram";
import { cn } from "@/lib/utils";

/**
 * Center pane. Renders the INGEST markdown (raw <span id> anchors preserved via
 * rehype-raw) and reacts to the agentic pipeline: when the store's scrollTarget
 * changes, it scrolls that anchor into view and applies a glowing highlight.
 */
export function DocumentViewer() {
  const ingest = useWorkspaceStore((s) => s.ingest);
  const scrollTarget = useWorkspaceStore((s) => s.scrollTarget);
  const activeHighlight = useWorkspaceStore((s) => s.activeHighlight);
  const highlightTone = useWorkspaceStore((s) => s.highlightTone);
  const clearScrollTarget = useWorkspaceStore((s) => s.clearScrollTarget);
  const rootRef = useRef<HTMLDivElement>(null);

  // Agentic viewport control: scroll to the AI-requested anchor.
  useEffect(() => {
    if (!scrollTarget || !rootRef.current) return;
    const el = rootRef.current.querySelector<HTMLElement>(`#${CSS.escape(scrollTarget)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    clearScrollTarget();
  }, [scrollTarget, clearScrollTarget]);

  // Apply/remove the glow class on the active anchor as the store changes.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const glowClasses = ["prism-glow-purple", "prism-glow-mint"];
    root.querySelectorAll(".prism-glow-purple, .prism-glow-mint").forEach((n) =>
      n.classList.remove(...glowClasses),
    );
    if (activeHighlight) {
      const el = root.querySelector(`#${CSS.escape(activeHighlight)}`);
      el?.classList.add(highlightTone === "mint" ? "prism-glow-mint" : "prism-glow-purple");
    }
  }, [activeHighlight, highlightTone, ingest]);

  const content = useMemo(() => ingest?.markdown_content ?? "", [ingest]);

  if (!ingest) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading your study guide…
      </div>
    );
  }

  return (
    <div ref={rootRef} className="h-full overflow-y-auto px-8 py-6">
      <article
        className={cn(
          "prose prose-slate max-w-3xl",
          "prose-headings:scroll-mt-24 prose-headings:font-semibold",
          "prose-h1:text-2xl prose-h2:text-xl",
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-mermaid/.exec(className ?? "");
              if (match) return <MermaidDiagram code={String(children)} />;
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
