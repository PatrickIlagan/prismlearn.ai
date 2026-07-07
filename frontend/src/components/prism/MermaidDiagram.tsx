"use client";

import { useEffect, useRef, useState } from "react";

let mermaidInitialized = false;
let idSeed = 0;

/** Renders a Mermaid code block into an interactive SVG diagram. */
export function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mermaid = (await import("mermaid")).default;
      if (!mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          themeVariables: { primaryColor: "#F5F3FF", primaryBorderColor: "#7C3AED" },
        });
        mermaidInitialized = true;
      }
      try {
        const { svg } = await mermaid.render(`mermaid-${idSeed++}`, code.trim());
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Diagram failed to render");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <pre className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        {code}
      </pre>
    );
  }

  return <div ref={containerRef} className="my-4 flex justify-center overflow-x-auto" />;
}
