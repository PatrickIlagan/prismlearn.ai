"use client";

import { useEffect, useRef, useState } from "react";

let mermaidInitialized = false;
let idSeed = 0;

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

interface Hotspot {
  /** The node label the student must click. */
  target: string;
  onSolved: () => void;
}

/** Renders a Mermaid code block into an SVG diagram, optionally as a clickable
 *  "hotspot" mini-game where the student must click the correct node. */
export function MermaidDiagram({ code, hotspot }: { code: string; hotspot?: Hotspot }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  // Keep the latest hotspot in a ref so the async render always sees it.
  const hotspotRef = useRef(hotspot);
  hotspotRef.current = hotspot;

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
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        setError(null);
        if (hotspotRef.current) wireHotspot(containerRef.current, hotspotRef.current, setSolved);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Diagram failed to render");
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-render when the code changes or hotspot mode toggles.
  }, [code, hotspot]);

  if (error) {
    return (
      <pre className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        {code}
      </pre>
    );
  }

  return (
    <div>
      {hotspot && !solved && (
        <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-primary">
          🎯 Tap the node that answers Lumi&apos;s question
        </p>
      )}
      <div ref={containerRef} className="my-2 flex justify-center overflow-x-auto" />
    </div>
  );
}

function wireHotspot(
  container: HTMLElement,
  hotspot: Hotspot,
  setSolved: (v: boolean) => void,
) {
  const nodes = container.querySelectorAll<SVGGElement>("g.node");
  const paint = (node: SVGGElement, stroke: string, width: string) =>
    node.querySelectorAll("rect, circle, polygon, path, ellipse").forEach((shape) => {
      shape.setAttribute("stroke", stroke);
      shape.setAttribute("stroke-width", width);
    });

  nodes.forEach((node) => {
    node.style.cursor = "pointer";
    node.style.transition = "opacity 0.2s";
    node.addEventListener("mouseenter", () => (node.style.opacity = "0.75"));
    node.addEventListener("mouseleave", () => (node.style.opacity = "1"));
    node.addEventListener("click", () => {
      const label = norm(node.textContent || "");
      const target = norm(hotspot.target);
      const correct = label === target || label.includes(target) || target.includes(label);
      if (correct) {
        paint(node, "#10B981", "3"); // green
        setSolved(true);
        // freeze interactions, then hand back to the store
        nodes.forEach((n) => (n.style.pointerEvents = "none"));
        setTimeout(() => hotspot.onSolved(), 750);
      } else {
        paint(node, "#ef4444", "2.5"); // red flash
        node.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-4px)" },
            { transform: "translateX(4px)" },
            { transform: "translateX(0)" },
          ],
          { duration: 300 },
        );
        setTimeout(() => paint(node, "#7C3AED", "1"), 500);
      }
    });
  });
}
