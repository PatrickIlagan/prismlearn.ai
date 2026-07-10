import type { CSSProperties } from "react";

/** Shared palette — matches the live app's violet/fuchsia/mint "glass" theme
 *  (frontend/src/app/globals.css, tailwind.config.ts) so the video looks like
 *  it belongs to the same product, not a generic template. */
export const COLOR = {
  violet500: "#8b5cf6",
  violet600: "#7c3aed",
  violet700: "#6d28d9",
  violet900: "#4c1d95",
  fuchsia500: "#d946ef",
  fuchsia600: "#c026d3",
  mint: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  rose: "#f43f5e",
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate300: "#cbd5e1",
  white: "#ffffff",
} as const;

export const GRADIENT_BG =
  "radial-gradient(circle at 20% 20%, rgba(139,92,246,0.35), transparent 55%), " +
  "radial-gradient(circle at 80% 30%, rgba(217,70,239,0.28), transparent 50%), " +
  "radial-gradient(circle at 50% 85%, rgba(16,185,129,0.18), transparent 55%), " +
  "linear-gradient(160deg, #0f0a1f 0%, #1a1030 45%, #150c28 100%)";

export const GLASS: CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 28,
  backdropFilter: "blur(18px)",
  boxShadow: "0 20px 60px rgba(76,29,149,0.35)",
};

export const FONT_STACK =
  "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";
