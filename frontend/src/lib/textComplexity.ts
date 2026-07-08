/**
 * Feature 1 — The ELI5 Slider.
 *
 * Client-side, synchronous "mock ui_action": rewrites a block's plain text at
 * one of three reading levels without a round trip to the model, so dragging
 * the slider is instant (and never fails) during a live demo.
 *
 *   0 Academic — the reviewer's original wording, untouched.
 *   1 Standard — same content, markdown emphasis stripped for plainer reading.
 *   2 ELI5     — word-substituted into plain language, framed as an analogy.
 */

export type ComplexityLevel = 0 | 1 | 2;

export const COMPLEXITY_LABELS: Record<ComplexityLevel, string> = {
  0: "Academic",
  1: "Standard",
  2: "ELI5",
};

// Longest phrases first so multi-word matches win over their substrings.
const ELI5_SUBSTITUTIONS: [RegExp, string][] = [
  [/\bin order to\b/gi, "to"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bthe process by which\b/gi, "the way that"],
  [/\ba significant number of\b/gi, "a lot of"],
  [/\bas a result of\b/gi, "because of"],
  [/\bwith respect to\b/gi, "about"],
  [/\butilize[sd]?\b/gi, "use"],
  [/\bdemonstrate[sd]?\b/gi, "show"],
  [/\bsubsequently\b/gi, "then"],
  [/\bfurthermore\b/gi, "also"],
  [/\bhowever\b/gi, "but"],
  [/\btherefore\b/gi, "so"],
  [/\bsignificant(ly)?\b/gi, "big$1"],
  [/\bapproximately\b/gi, "about"],
  [/\bcomponent[s]?\b/gi, "part$1"],
  [/\bproduce[sd]?\b/gi, "make$1"],
  [/\brequire[sd]?\b/gi, "need$1"],
  [/\bindividual\b/gi, "single"],
  [/\bprimary\b/gi, "main"],
  [/\bsufficient\b/gi, "enough"],
  [/\bfacilitate[sd]?\b/gi, "help"],
  [/\bnumerous\b/gi, "many"],
  [/\bacquire[sd]?\b/gi, "get"],
  [/\bexamine[sd]?\b/gi, "look at"],
  [/\bindicate[sd]?\b/gi, "show"],
  [/\bregarding\b/gi, "about"],
  [/\bconsequently\b/gi, "so"],
];

function stripEmphasis(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

export function simplifyText(plainText: string, level: ComplexityLevel): string {
  if (level === 0) return plainText;

  let out = stripEmphasis(plainText);
  if (level === 1) return out;

  // level === 2: ELI5
  for (const [pattern, replacement] of ELI5_SUBSTITUTIONS) {
    out = out.replace(pattern, replacement);
  }
  // Parenthetical technical asides read as clutter in a "explain it simply" pass.
  out = out.replace(/\s*\([^)]{15,}\)/g, "");
  return `Think of it like this: ${out}`;
}
