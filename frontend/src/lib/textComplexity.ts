/**
 * The reading-level slider's levels/labels.
 *
 * The actual rewrite is a real model call (see lib/api.ts's simplifyBlocks,
 * called from useWorkspaceStore's setTextComplexity) — a previous version
 * did local regex word-substitution ("utilize" -> "use", mid-sentence,
 * blind to grammar), which produced broken, mashed-together text instead of
 * simpler text. Real simplification requires actually understanding the
 * sentence to restructure it, which a regex can't do.
 */

export type ComplexityLevel = 0 | 1 | 2;

export const COMPLEXITY_LABELS: Record<ComplexityLevel, string> = {
  0: "Academic",
  1: "Standard",
  2: "ELI5",
};
