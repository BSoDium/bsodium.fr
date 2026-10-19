/**
 * Pure layout of the artworks' brick wall (docs/design-system.md, "Artwork wall"). Every column is the same width, so a picture's height
 * in column widths is its ratio (height / width), whatever the viewport: the placement of each picture in 1 to 4 columns is therefore
 * computed once, on the server, from the contract's cover sizes. The page then needs no measuring and no script: the CSS turns the
 * numbers into `top` and `left` with `calc()`, the space is reserved from the first byte of HTML (no layout shift), and the DOM keeps the
 * reading order (the list is not split into column wrappers).
 */

/** The numbers of columns the wall is laid out for (the CSS chooses by the wall's own width). */
export const MASONRY_TIERS = [1, 2, 3, 4] as const;

/** Displayed height / width bounds: a panorama or a totem pole is cropped to these, not given the whole wall. */
export const RATIO_MIN = 0.4;
export const RATIO_MAX = 2;
/** The height of a picture without a size in the contract (a generated cover, 4:3). */
export const RATIO_FALLBACK = 0.75;

/** What a caption and a gap add to a picture, in column widths, when the column is chosen (about 0.3 of a 20 rem column). Only picks the shortest column. */
const SLOT = 0.3;

/** The ratio (height / width) a picture is drawn at: the contract's cover size, clamped; 3:4 when the size is unknown. */
export function coverRatio(size: { width?: number | undefined; height?: number | undefined } | undefined): number {
  const w = size?.width;
  const h = size?.height;
  if (!w || !h || !(w > 0) || !(h > 0)) return RATIO_FALLBACK;
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, h / w));
}

export interface MasonrySlot {
  /** 0-based column. */
  column: number;
  /** Pictures above this one in its column. */
  above: number;
  /** Sum of the ratios above this one in its column. */
  ratioAbove: number;
}

export interface MasonryColumn {
  count: number;
  ratio: number;
}

export interface MasonryLayout {
  columns: number;
  /** One per picture, in the order given (the reading order). */
  slots: MasonrySlot[];
  /** One per column. */
  totals: MasonryColumn[];
}

/**
 * Each picture, in reading order, goes to the shortest column (the leftmost on a tie): the wall stays level and reads left to right, then
 * down, as a shelf. Deterministic: the server and the browser agree.
 */
export function layoutMasonry(ratios: readonly number[], columns: number): MasonryLayout {
  const cols = Math.max(1, Math.floor(columns));
  const heights = new Array<number>(cols).fill(0);
  const totals: MasonryColumn[] = Array.from({ length: cols }, () => ({ count: 0, ratio: 0 }));
  const slots = ratios.map((ratio): MasonrySlot => {
    let column = 0;
    for (let c = 1; c < cols; c++) if (heights[c]! < heights[column]! - 1e-9) column = c;
    const total = totals[column]!;
    const slot = { column, above: total.count, ratioAbove: total.ratio };
    total.count += 1;
    total.ratio += ratio;
    heights[column] = heights[column]! + ratio + SLOT;
    return slot;
  });
  return { columns: cols, slots, totals };
}

const n4 = (n: number) => Math.round(n * 10000) / 10000;

/** The custom properties of one picture: its ratio and, for each tier, its column, the pictures above and their summed ratios. */
export function masonryItemVars(ratio: number, layouts: readonly MasonryLayout[], index: number): Record<string, string | number> {
  const vars: Record<string, string | number> = { "--ratio": n4(ratio), "--aspect": n4(1 / ratio) };
  for (const layout of layouts) {
    const slot = layout.slots[index]!;
    vars[`--c${layout.columns}`] = slot.column;
    vars[`--n${layout.columns}`] = slot.above;
    vars[`--r${layout.columns}`] = n4(slot.ratioAbove);
  }
  return vars;
}

/**
 * The custom properties of the wall: for each tier its height, the tallest column (a `max()` of one `calc()` per column) less the last
 * gap. `--colw` and `--slot` (a caption and a gap) come from the stylesheet and are those of the tier in force.
 */
export function masonryListVars(layouts: readonly MasonryLayout[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const layout of layouts) {
    const terms = layout.totals.filter((t) => t.count > 0).map((t) => `calc(${n4(t.ratio)} * var(--colw) + ${t.count} * var(--slot))`);
    vars[`--h${layout.columns}`] = terms.length === 0 ? "0px" : `calc(max(${terms.join(", ")}) - var(--gap))`;
  }
  return vars;
}

/** Every tier's layout for these ratios. */
export function layoutAllTiers(ratios: readonly number[]): MasonryLayout[] {
  return MASONRY_TIERS.map((n) => layoutMasonry(ratios, n));
}
