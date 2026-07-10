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

/** Text colors for the light theme — dark ink at varying opacity, mirroring
 *  the app's --foreground / --muted-foreground on a white background. */
export const INK = {
  strong: "#0f172a", // slate-900, headings/primary text
  base: "rgba(15,23,42,0.82)",
  muted: "rgba(15,23,42,0.62)",
  faint: "rgba(15,23,42,0.42)",
};

/** The app's actual body background: #fafaff base + a fixed "aurora mesh" of
 *  soft pastel radial blobs (see globals.css body::before) — NOT a dark
 *  cinematic gradient. Reproduced here 1:1 so the video looks like the
 *  product, not a generic dark promo template. */
export const GRADIENT_BG =
  "radial-gradient(60% 55% at 8% 4%, hsl(262 92% 86% / 0.95), transparent 62%), " +
  "radial-gradient(52% 46% at 96% 2%, hsl(291 94% 88% / 0.8), transparent 58%), " +
  "radial-gradient(58% 54% at 90% 94%, hsl(193 96% 86% / 0.75), transparent 60%), " +
  "radial-gradient(50% 46% at 2% 98%, hsl(250 94% 89% / 0.7), transparent 58%), " +
  "radial-gradient(40% 38% at 50% 50%, hsl(280 90% 92% / 0.35), transparent 70%), " +
  "#fafaff";

/** The app's real `.glass` frosted-card recipe (globals.css) — translucent
 *  white gradient + blur, soft violet-tinted shadow, NOT a dark glass panel. */
export const GLASS: CSSProperties = {
  backgroundImage: "linear-gradient(135deg, hsl(0 0% 100% / 0.72), hsl(0 0% 100% / 0.42))",
  backdropFilter: "blur(22px) saturate(1.8)",
  border: "1px solid hsl(0 0% 100% / 0.75)",
  borderRadius: 28,
  boxShadow:
    "inset 0 1px 0 0 hsl(0 0% 100% / 0.8), inset 0 -1px 0 0 hsl(262 40% 80% / 0.15), 0 16px 46px -16px hsl(262 60% 45% / 0.28)",
};

export const FONT_STACK =
  "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";
