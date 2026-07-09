import { jsPDF } from "jspdf";
import type { Flashcard, Quiz, QuizQuestion } from "@/types/prism";

/**
 * Client-side flashcard export (PRD Doc 1 §4 / Feature 3 "wow factor" spec).
 *
 * Renders the deck as a printable A4 2×4 grid of "cut-out squares": each card
 * has a dashed border to cut along (with a small scissors icon on the top
 * edge), the term on top, a dashed fold/divider line, and the answer below.
 * Runs entirely in the browser — no backend, no credentials.
 */

// A4 portrait, millimetres.
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;
const HEADER_H = 12;
const COLS = 2;
const ROWS = 4;
const GUTTER = 9;
const PAD = 5;

const CARD_W = (PAGE_W - 2 * MARGIN - (COLS - 1) * GUTTER) / COLS;
const CARD_H = (PAGE_H - 2 * MARGIN - HEADER_H - (ROWS - 1) * GUTTER) / ROWS;
const PER_PAGE = COLS * ROWS;

function dashed(doc: jsPDF, on: boolean) {
  doc.setLineDashPattern(on ? [1.2, 1.2] : [], 0);
}

/**
 * A small vector scissors icon (two crossing blades + two finger loops),
 * centered at (cx, cy). Drawn with primitives rather than a Unicode "✂️"
 * character — jsPDF's standard 14 fonts (Helvetica etc.) don't include
 * emoji/dingbat glyphs, so a font-rendered scissors character would print as
 * a missing-glyph box; plain lines/circles render identically everywhere.
 */
function drawScissorsIcon(doc: jsPDF, cx: number, cy: number, size = 3.2) {
  dashed(doc, false);
  doc.setDrawColor(150);
  doc.setLineWidth(0.25);
  const pivotX = cx + size * 0.4;
  const loopX = cx - size * 0.35;
  doc.line(pivotX, cy, loopX, cy - size * 0.4);
  doc.line(pivotX, cy, loopX, cy + size * 0.4);
  doc.circle(loopX, cy - size * 0.4, size * 0.16, "S");
  doc.circle(loopX, cy + size * 0.4, size * 0.16, "S");
}

function drawHeader(doc: jsPDF, title: string, kind = "Flashcards") {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(76, 29, 149); // violet-900
  doc.text("PrismLearning.AI", MARGIN, MARGIN + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${title} · ${kind}`, MARGIN, MARGIN + 9);
}

function slug(title: string): string {
  return title.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "workspace";
}

/**
 * Wraps `text` to `maxWidth` and returns AT MOST `maxLines` lines, appending
 * an ellipsis to the last line if content had to be cut. Rendered by the
 * caller with EXPLICIT per-line y-coordinates (never jsPDF's array-based
 * `.text(lines[], x, y)`, which auto-stacks lines using its own internal
 * line-height factor) — that keeps line spacing fully deterministic and
 * under our control, so wrapped text can never visually crowd or overlap
 * regardless of any font-metric differences between environments.
 */
function fitLines(doc: jsPDF, text: string, maxWidth: number, maxLines: number): string[] {
  const wrapped: string[] = doc.splitTextToSize(text, maxWidth);
  if (wrapped.length <= maxLines) return wrapped;
  const shown = wrapped.slice(0, maxLines);
  const last = shown[maxLines - 1].replace(/[.,;:!?]*$/, "");
  shown[maxLines - 1] = `${last}…`;
  return shown;
}

function drawCard(doc: jsPDF, card: Flashcard, x: number, y: number) {
  // Dashed cut border.
  dashed(doc, true);
  doc.setDrawColor(180);
  doc.roundedRect(x, y, CARD_W, CARD_H, 2, 2, "S");
  dashed(doc, false);

  // Scissors icon sitting on the top edge — the classic "cut along this
  // line" marker — with a small white gap in the dashed line behind it.
  doc.setFillColor(255, 255, 255);
  doc.rect(x + CARD_W / 2 - 3, y - 1.6, 6, 3.2, "F");
  drawScissorsIcon(doc, x + CARD_W / 2, y);

  const innerW = CARD_W - 2 * PAD;
  const midY = y + CARD_H / 2;

  // Front (term). Cards are shorter in a 2x4 grid than 2x3, so fewer lines fit.
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const frontLineH = 4.2;
  fitLines(doc, card.front, innerW, 3).forEach((line, i) => {
    doc.text(line, x + PAD, y + PAD + 3.5 + i * frontLineH);
  });

  // Divider (fold/cut line).
  dashed(doc, true);
  doc.setDrawColor(210);
  doc.line(x + PAD, midY, x + CARD_W - PAD, midY);
  dashed(doc, false);

  // Back (answer).
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70);
  const backLineH = 3.6;
  fitLines(doc, card.back, innerW, 4).forEach((line, i) => {
    doc.text(line, x + PAD, midY + 5 + i * backLineH);
  });
}

export function exportFlashcardsPdf(workspaceTitle: string, flashcards: Flashcard[]): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  flashcards.forEach((card, i) => {
    const idxOnPage = i % PER_PAGE;
    if (i > 0 && idxOnPage === 0) doc.addPage();
    if (idxOnPage === 0) drawHeader(doc, workspaceTitle);

    const col = idxOnPage % COLS;
    const row = Math.floor(idxOnPage / COLS);
    const x = MARGIN + col * (CARD_W + GUTTER);
    const y = MARGIN + HEADER_H + row * (CARD_H + GUTTER);
    drawCard(doc, card, x, y);
  });

  doc.save(`prism_flashcards_${slug(workspaceTitle)}.pdf`);
}

// --- Quiz export -------------------------------------------------------------
// A printable practice sheet: numbered questions with room to answer, followed
// by a separate answer-key page.

const CONTENT_W = PAGE_W - 2 * MARGIN;
const BODY_TOP = MARGIN + HEADER_H + 4;
const BODY_BOTTOM = PAGE_H - MARGIN;
const OPTION_LETTERS = ["a", "b", "c", "d", "e", "f"];

const TYPE_LABEL: Record<QuizQuestion["type"], string> = {
  mcq: "Multiple choice",
  true_false: "True / False",
  fill_blank: "Fill in the blank",
  short_answer: "Short answer",
};

/** Advance the cursor, adding a page (with header) when `needed` mm won't fit. */
function ensureSpace(doc: jsPDF, y: number, needed: number, title: string, kind: string): number {
  if (y + needed <= BODY_BOTTOM) return y;
  doc.addPage();
  drawHeader(doc, title, kind);
  return BODY_TOP;
}

function drawQuestion(doc: jsPDF, q: QuizQuestion, n: number, y: number, title: string): number {
  const numberW = 8;
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  const promptLines = doc.splitTextToSize(q.prompt, CONTENT_W - numberW);
  y = ensureSpace(doc, y, promptLines.length * 5 + 4, title, "Quiz");
  doc.text(`${n}.`, MARGIN, y);
  promptLines.forEach((line: string, i: number) => doc.text(line, MARGIN + numberW, y + i * 5));
  y += promptLines.length * 5 + 1;

  // Type tag.
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(TYPE_LABEL[q.type], MARGIN + numberW, y);
  y += 4;

  // Answer area by type.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  if (q.type === "mcq") {
    q.options.forEach((opt, i) => {
      const optLines = doc.splitTextToSize(`${OPTION_LETTERS[i]})  ${opt}`, CONTENT_W - numberW - 4);
      y = ensureSpace(doc, y, optLines.length * 5, title, "Quiz");
      optLines.forEach((line: string, j: number) => doc.text(line, MARGIN + numberW + 4, y + j * 5));
      y += optLines.length * 5;
    });
  } else if (q.type === "true_false") {
    y = ensureSpace(doc, y, 5, title, "Quiz");
    doc.text("a)  True        b)  False", MARGIN + numberW + 4, y);
    y += 5;
  } else if (q.type === "fill_blank") {
    y = ensureSpace(doc, y, 8, title, "Quiz");
    dashed(doc, true);
    doc.setDrawColor(190);
    doc.line(MARGIN + numberW + 4, y + 2, MARGIN + numberW + 90, y + 2);
    dashed(doc, false);
    y += 8;
  } else {
    // short answer: a few ruled lines
    for (let i = 0; i < 3; i++) {
      y = ensureSpace(doc, y, 7, title, "Quiz");
      dashed(doc, true);
      doc.setDrawColor(215);
      doc.line(MARGIN + numberW + 4, y + 2, PAGE_W - MARGIN, y + 2);
      dashed(doc, false);
      y += 7;
    }
  }
  return y + 5; // gap before next question
}

export function exportQuizPdf(workspaceTitle: string, quiz: Quiz): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, quiz.title || workspaceTitle, "Quiz");

  let y = BODY_TOP;
  quiz.questions.forEach((q, i) => {
    y = drawQuestion(doc, q, i + 1, y, quiz.title || workspaceTitle);
  });

  // Answer key on a fresh page.
  doc.addPage();
  drawHeader(doc, quiz.title || workspaceTitle, "Answer Key");
  let ay = BODY_TOP;
  quiz.questions.forEach((q, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30);
    const head = `${i + 1}. ${q.answer}`;
    const headLines = doc.splitTextToSize(head, CONTENT_W);
    ay = ensureSpace(doc, ay, headLines.length * 5 + 4, quiz.title || workspaceTitle, "Answer Key");
    headLines.forEach((line: string, j: number) => doc.text(line, MARGIN, ay + j * 5));
    ay += headLines.length * 5;

    if (q.explanation) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110);
      const expl = doc.splitTextToSize(q.explanation, CONTENT_W - 4);
      ay = ensureSpace(doc, ay, expl.length * 4.5 + 3, quiz.title || workspaceTitle, "Answer Key");
      expl.forEach((line: string, j: number) => doc.text(line, MARGIN + 4, ay + j * 4.5));
      ay += expl.length * 4.5;
    }
    ay += 4;
  });

  doc.save(`prism_quiz_${slug(quiz.title || workspaceTitle)}.pdf`);
}
