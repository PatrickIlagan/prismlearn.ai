import type { CanvasBlock, CanvasChapter, IngestPayload } from "@/types/prism";

/**
 * Parses the reviewer markdown into structured chapters and blocks for the
 * Active Learning Canvas. Each chapter is delimited by an anchored heading
 * (`# <span id="concept_x">Title</span>`); its body is split into blocks
 * (paragraphs, blockquotes, and ```mermaid fences) that Lumi can mutate into
 * mini-games at runtime.
 */

const HEADING_RE = /^(#{1,6})\s*<span id="([^"]+)">([\s\S]*?)<\/span>\s*$/;

function stripMarkdown(md: string): string {
  return md
    .replace(/<[^>]+>/g, "") // html spans
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1") // italic
    .replace(/`(.*?)`/g, "$1") // code
    .replace(/^>\s?/gm, "") // blockquote markers
    .replace(/^#{1,6}\s*/gm, "") // stray headings
    .trim();
}

function splitBody(body: string[], anchor: string): CanvasBlock[] {
  const blocks: CanvasBlock[] = [];
  let buffer: string[] = [];
  let inFence = false;
  let fenceLang = "";

  const flushText = () => {
    const md = buffer.join("\n").trim();
    buffer = [];
    if (!md) return;
    const isQuote = md.startsWith(">");
    blocks.push({
      id: `${anchor}_b${blocks.length}`,
      chapterAnchor: anchor,
      kind: isQuote ? "quote" : "text",
      markdown: md,
      plain: stripMarkdown(md),
    });
  };

  for (const line of body) {
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      if (!inFence) {
        flushText();
        inFence = true;
        fenceLang = fence[1] || "";
        buffer.push(line);
      } else {
        buffer.push(line);
        const md = buffer.join("\n").trim();
        buffer = [];
        inFence = false;
        blocks.push({
          id: `${anchor}_b${blocks.length}`,
          chapterAnchor: anchor,
          kind: fenceLang === "mermaid" ? "mermaid" : "text",
          markdown: md,
          plain: "",
        });
      }
      continue;
    }
    if (inFence) {
      buffer.push(line);
      continue;
    }
    if (line.trim() === "") {
      flushText();
    } else {
      buffer.push(line);
    }
  }
  flushText();
  return blocks;
}

export function parseCanvas(ingest: IngestPayload): CanvasChapter[] {
  const lines = ingest.markdown_content.split("\n");
  const chapters: CanvasChapter[] = [];
  let current: { anchor: string; title: string; level: number; body: string[] } | null = null;

  const flushChapter = () => {
    if (!current) return;
    chapters.push({
      anchorId: current.anchor,
      title: current.title,
      level: current.level,
      blocks: splitBody(current.body, current.anchor),
    });
  };

  for (const line of lines) {
    const h = line.match(HEADING_RE);
    if (h) {
      flushChapter();
      current = {
        level: h[1].length,
        anchor: h[2],
        title: stripMarkdown(h[3]),
        body: [],
      };
    } else if (current) {
      current.body.push(line);
    }
  }
  flushChapter();
  return chapters;
}

/** Extract bold-term candidates from a block's markdown (default cloze blanks). */
export function boldTerms(markdown: string): string[] {
  const terms: string[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const t = m[1].replace(/[^\w\s-]/g, "").trim();
    if (t && !terms.includes(t)) terms.push(t);
  }
  return terms.slice(0, 4);
}

/** Split a paragraph into sentences (for spot-the-lie). */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
