/**
 * Pure decisions of the figures of an article or a project (docs/design-system.md, "Figures"): which image is "Fig. N", which figure
 * a mention in the text points to, how a caption splits into its words and its credit, and when a figure is worth zooming. No markup,
 * no invented text: the caption is shown character for character as it is authored.
 */
import type { PublishedBodyBlock } from "@catalyst/schemas";
import { safeMediaSrc } from "~/lib/entry-blocks";

type Block = PublishedBodyBlock;

export interface FigureInfo {
  /** 1, 2, 3 in the order the images appear (an image that cannot be drawn is not counted; a bare image is). */
  number: number;
  /** The figure says its number (it has a caption) and so is an anchor: only then does it get an id and can the text point to it. */
  labelled: boolean;
}

/** The figure number of each image block, by the block's index. A bare image takes a number too (the sequence is the images'), it just does not say it. */
export function figureInfo(blocks: readonly Block[]): Map<number, FigureInfo> {
  const out = new Map<number, FigureInfo>();
  blocks.forEach((block, index) => {
    if (block.type === "image" && safeMediaSrc(block.src)) out.set(index, { number: out.size + 1, labelled: !!block.caption });
  });
  return out;
}

/** The numbers the text may point to: the figures that say their number. */
export function linkableNumbers(info: ReadonlyMap<number, FigureInfo>): Set<number> {
  return new Set([...info.values()].filter((f) => f.labelled).map((f) => f.number));
}

/** The id of a figure's element and the fragment of the link to it. */
export const figureId = (n: number): string => `fig-${n}`;

/**
 * A mention of a figure in running text: `Fig. 3`, `Fig 3`, `Fig.3`, `fig. 3`, `Figure 3`. Not part of a longer word (`Config. 3`),
 * not a number that goes on (`Fig. 3a`, `Fig. 3.2`, `Fig. 30` is 30), not a zero-led one. The plural (`Figs. 2 and 3`) is left as text.
 */
const FIGURE_MENTION = /(?<![\p{L}\p{N}])Fig(?:ure)?\.?\s*([1-9]\d{0,2})(?![\p{L}\p{N}]|[.,]\d)/giu;

export type TextRun = { text: string; figure?: undefined } | { text: string; figure: number };

/**
 * A text split into runs: plain text, and the mentions of a figure that exists (in `known`) as runs that carry its number. The runs
 * joined are the text, character for character; a mention of a figure that does not exist stays plain. Apply it to the text of a
 * paragraph, a list item or a quote, never to a link's or a code block's.
 */
export function linkFigureMentions(text: string, known: ReadonlySet<number>): TextRun[] {
  if (known.size === 0) return [{ text }];
  const runs: TextRun[] = [];
  let last = 0;
  for (const m of text.matchAll(FIGURE_MENTION)) {
    const n = Number(m[1]);
    if (!known.has(n)) continue;
    if (m.index > last) runs.push({ text: text.slice(last, m.index) });
    runs.push({ text: m[0], figure: n });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.length > 0 ? runs : [{ text }];
}

/** The words that open a parenthesis at the end of a caption when it is a credit. */
const CREDIT = /^\((?:source|sources|credit|credits|photo|photos|photograph|image|illustration|courtesy|via|d['’]après|crédit|crédits|fuente|quelle)\b[^()]*\)\s*\.?$/iu;

/**
 * A caption as its words and its credit: when it ends with a parenthesis that opens with a credit word (`(Source: ...)`, `(Photo: ...)`),
 * the credit is the parenthesis (parentheses kept) and `text` is what precedes it. `text`, a space and `credit` are the caption again.
 */
export function splitCaption(caption: string): { text: string; credit: string | null } {
  const at = caption.lastIndexOf("(");
  if (at <= 0) return { text: caption, credit: null };
  const credit = caption.slice(at);
  const text = caption.slice(0, at).trimEnd();
  if (text.length === 0 || !CREDIT.test(credit) || caption.slice(text.length, at).length === 0) return { text: caption, credit: null };
  return { text, credit };
}

/** A figure is worth opening larger when the picture is at least 10 % wider than it is drawn (its `width` attribute against what the page shows; in tenths, so that no float rounding decides). */
export function isZoomable(natural: number | undefined, displayed: number): boolean {
  return natural !== undefined && displayed > 0 && natural * 10 >= displayed * 11;
}

/** What names the control that opens a figure larger. */
export function zoomLabel(number: number | undefined): string {
  return number === undefined ? "View image larger" : `View figure ${number} larger`;
}

