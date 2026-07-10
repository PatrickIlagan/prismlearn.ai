"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/**
 * Shared markdown renderer for AI-generated text (tutor chat, quiz/exam
 * prompts): adds bold/italic/lists (GFM), LaTeX math ($inline$ / $$block$$
 * via remark-math + rehype-katex), single-newline line breaks (remark-breaks,
 * so plain "\n" behaves like the old whitespace-pre-line did), and
 * syntax-highlighted fenced code blocks. Without this, model output like
 * "**bold**" or "$x^2$" shows up as literal asterisks/dollar signs.
 */
export function RichMarkdown({
  text,
  className,
  size = "lg",
}: {
  text: string;
  className?: string;
  /** Tailwind Typography size variant. @tailwindcss/typography's prose scale
   *  is independent of the app's text-* utility scale (its own fixed rem
   *  values), so this needs its own bump to match the rest of the app's
   *  larger default font sizing. "lg" is the default now. */
  size?: "sm" | "base" | "lg";
}) {
  return (
    <div
      className={cn(
        "prose prose-slate max-w-none prose-p:leading-relaxed",
        size === "sm" ? "prose-sm" : size === "lg" ? "prose-lg" : "prose-base",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code(props) {
            const { className: codeClassName, children, ...rest } = props;
            const match = /language-(\w+)/.exec(codeClassName || "");
            if (!match) {
              return (
                <code
                  className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em]"
                  {...rest}
                >
                  {children}
                </code>
              );
            }
            return (
              <SyntaxHighlighter
                language={match[1]}
                style={oneLight}
                customStyle={{ borderRadius: 8, fontSize: "0.82em", margin: "0.5em 0" }}
                wrapLongLines
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
