"use client";

import { motion } from "framer-motion";

/** Circular mastery indicator with a spectral gradient stroke. */
export function ProgressRing({
  value,
  size = 48,
  stroke = 4,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="prism-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(262 83% 60%)" />
            <stop offset="55%" stopColor="hsl(291 88% 64%)" />
            <stop offset="100%" stopColor="hsl(190 92% 52%)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-violet-500/15"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#prism-ring)"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (clamped / 100) * circ }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-foreground">
        {clamped}%
      </div>
    </div>
  );
}
