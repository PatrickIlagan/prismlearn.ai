"use client";

import { motion } from "framer-motion";
import type { ConceptMastery } from "@/lib/mastery";

/**
 * Single-series strength profile across chapters (magnitude by category).
 * One hue (violet), recessive grid, labels in muted ink — no legend needed for
 * a single series. Falls back to bars when there are too few axes for a radar.
 */
export function ChapterRadar({ data }: { data: ConceptMastery[] }) {
  if (data.length < 3) return <BarFallback data={data} />;

  const size = 320;
  const c = size / 2;
  const R = 108;
  const n = data.length;
  const rings = [25, 50, 75, 100];

  const angle = (i: number) => (-90 + (i * 360) / n) * (Math.PI / 180);
  const point = (i: number, value: number) => {
    const r = (value / 100) * R;
    return [c + r * Math.cos(angle(i)), c + r * Math.sin(angle(i))] as const;
  };

  const shape = data.map((d, i) => point(i, d.strength).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[340px]">
      {/* grid rings */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={data.map((_, i) => point(i, ring).join(",")).join(" ")}
          fill="none"
          className="stroke-violet-500/12"
          strokeWidth={1}
        />
      ))}
      {/* spokes */}
      {data.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="stroke-violet-500/12" strokeWidth={1} />;
      })}

      {/* value polygon */}
      <motion.polygon
        points={shape}
        fill="hsl(262 83% 58% / 0.18)"
        stroke="hsl(262 83% 58%)"
        strokeWidth={2}
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        style={{ transformOrigin: "center" }}
      />
      {/* vertex dots */}
      {data.map((d, i) => {
        const [x, y] = point(i, d.strength);
        return <circle key={i} cx={x} cy={y} r={3.5} fill="hsl(262 83% 58%)" />;
      })}

      {/* axis labels (muted ink) */}
      {data.map((d, i) => {
        const [x, y] = point(i, 118);
        const a = angle(i);
        const anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-muted-foreground text-[9px] font-medium"
          >
            {shorten(d.title)}
          </text>
        );
      })}
    </svg>
  );
}

function shorten(title: string): string {
  const t = title.replace(/^\d+\.\s*/, "");
  return t.length > 16 ? `${t.slice(0, 15)}…` : t;
}

function BarFallback({ data }: { data: ConceptMastery[] }) {
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.anchorId}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="truncate font-medium">{d.title}</span>
            <span className="text-muted-foreground">{d.strength}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-violet-500/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              style={{ width: `${d.strength}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
