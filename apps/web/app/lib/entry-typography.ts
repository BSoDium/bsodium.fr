/**
 * Pure decisions of the entry pages' typography (docs/design-system.md, "Entry pages"): what is set thin against heavy in a headline,
 * how a date reads as "March 2026", which paragraph opens with a drop cap, which blocks are figures. No markup, no invented text: every
 * output is a part of, or a count of, what the entry publishes.
 */
import type { PublishedBodyBlock } from "@catalyst/schemas";

type Block = PublishedBodyBlock;

/**
 * A headline in two runs: the part before the first comma, colon or dash (heavy) and the clause that follows it, the separator
 * included (thin). `lead + tail` is always the title, character for character. A title without a separator, or whose halves are
 * too short to stand on their own, is one heavy run (`tail` is empty).
 */
export function splitHeadline(title: string): { lead: string; tail: string } {
  const separators = [", ", ": ", " — ", " – "];
  let cut = -1;
  let width = 0;
  for (const sep of separators) {
    const at = title.indexOf(sep);
    if (at >= 0 && (cut < 0 || at < cut)) {
      cut = at;
      width = sep.length;
    }
  }
  if (cut < 3) return { lead: title, tail: "" };
  const lead = title.slice(0, cut);
  const rest = title.slice(cut + width).trim();
  if (rest.length < 3 || /^\p{P}+$/u.test(rest)) return { lead: title, tail: "" };
  return { lead, tail: title.slice(cut) };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

/** `2026-03-14` and `2026-03` -> `March 2026`; `2026` -> `2026`; anything else (or a month 13) -> null. Only the format changes, nothing is completed. */
export function formatMonthYear(date: string | undefined): string | null {
  const m = date ? /^(\d{4})(?:-(\d{2})(?:-\d{2})?)?$/.exec(date) : null;
  if (!m) return null;
  if (!m[2]) return m[1]!;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? `${MONTHS[month - 1]} ${m[1]}` : null;
}

/** A paragraph long enough (about four lines of a reading column) and starting with a capital letter, to carry a drop cap. */
export const DROP_CAP_MIN_LENGTH = 200;

/**
 * What the drop cap is allowed to open with: a capital of the Latin set the reading face carries, followed by a letter, a digit, a
 * space or the end. Left out, on purpose:
 *   - an opening quote or bracket (the mark would be drawn five lines tall: skipped, not hung);
 *   - `Q` and `Ç`, whose tail or cedilla hangs below the baseline and into the first letters of the line under the letter;
 *   - a lowercase letter (its ascender or descender breaks the cap-height alignment);
 *   - a capital followed by a mark: "L'exil", "I'm", "A.", "I," (`::first-letter` takes the mark with the letter and the
 *     apostrophe would be drawn at the letter's size, a wedge as tall as the cap).
 */
const DROP_CAP_LETTER = /^[A-ZÀ-ÖØ-ÞŒ](?=[\p{L}\p{N}\s]|$)/u;
const DROP_CAP_NEVER = /^[QÇ]/;
/** A capital that carries a mark above the cap height (É, À, Ô; Œ is not one): the paragraph makes room for it. */
const ABOVE_MARK = /[\u0300-\u036F]/;

/** `"plain"` or `"accent"` (a mark rises above the letter: the paragraph is given room for it) when the text opens with a letter fit for a drop cap, `null` otherwise. */
export function dropCapKind(text: string): "plain" | "accent" | null {
  const t = text.trimStart();
  if (t.length < DROP_CAP_MIN_LENGTH || !DROP_CAP_LETTER.test(t) || DROP_CAP_NEVER.test(t)) return null;
  return ABOVE_MARK.test(t.slice(0, 1).normalize("NFD")) ? "accent" : "plain";
}

/** The index of the block that opens with a drop cap: the first block of the body, when it is a long enough paragraph that opens with a capital letter. -1 otherwise. */
export function dropCapIndex(blocks: readonly Block[]): number {
  const first = blocks[0];
  if (first?.type !== "paragraph") return -1;
  return dropCapKind(first.text) === null ? -1 : 0;
}

/** The body split into what is read and what is looked at: the image blocks (the figures) and everything else, each in its authored order. */
export function splitFigures(blocks: readonly Block[]): { text: Block[]; figures: Extract<Block, { type: "image" }>[] } {
  const text: Block[] = [];
  const figures: Extract<Block, { type: "image" }>[] = [];
  for (const block of blocks) {
    if (block.type === "image") figures.push(block);
    else text.push(block);
  }
  return { text, figures };
}

/** The "Linked" line of the marginalia, from counts the page already has; `null` when there is nothing to say. Never a number that is not a count. */
export function linkedLine({ places, entries }: { places: number; entries: number | null }): string | null {
  const parts = [
    places > 0 ? `${places} ${places === 1 ? "place" : "places"}` : null,
    entries !== null && entries > 0 ? `${entries} ${entries === 1 ? "entry" : "entries"}` : null,
  ].filter((p): p is string => p !== null);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * How much of the full headline size a title of this length gets, in [0.6, 1]: a short title takes the whole size, a long one is set
 * smaller so that it stays about four lines at most (the board's headline is 50 characters; a 100-character one would take the first
 * screen at full size). Linear in the length between 48 and 120 characters; the CSS multiplies `--entry-title` by it.
 */
export function headlineScale(title: string): number {
  const n = [...title].length;
  if (n <= 48) return 1;
  if (n >= 120) return 0.6;
  return Math.round((1 - ((n - 48) / (120 - 48)) * 0.4) * 100) / 100;
}
