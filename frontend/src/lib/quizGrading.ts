import type { QuizQuestion } from "@/types/prism";

/**
 * Grading for the "math" and "code" question types — the existing norm() used
 * by mcq/fill_blank (strip everything but alphanumerics) silently breaks on
 * these: it turns "-4" into "4" (loses the sign) and collapses "x = 2, x = -2"
 * into nonsense. Both graders are intentionally forgiving about formatting but
 * strict about the actual value, and both are a best-effort first pass — the
 * caller should still offer a self-assessment override, since e.g. an
 * equivalent-but-differently-formatted symbolic answer can still slip past.
 */

function normalizeMathText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[,;]/g, ",");
}

export function gradeMath(question: QuizQuestion, studentAnswer: string): boolean {
  const raw = studentAnswer.trim();
  if (!raw) return false;

  if (question.answer_format === "numeric") {
    const parse = (s: string) => parseFloat(s.replace(/,/g, "").trim());
    const studentNum = parse(raw);
    const answerNum = parse(question.answer);
    if (!Number.isNaN(studentNum) && !Number.isNaN(answerNum)) {
      const tolerance = question.tolerance ?? Math.max(0.01, Math.abs(answerNum) * 0.01);
      return Math.abs(studentNum - answerNum) <= tolerance;
    }
  }
  return normalizeMathText(raw) === normalizeMathText(question.answer);
}

function normalizeCodeText(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

export function gradeCode(question: QuizQuestion, studentAnswer: string): boolean {
  const raw = studentAnswer.trim();
  if (!raw) return false;
  return normalizeCodeText(raw) === normalizeCodeText(question.answer);
}
