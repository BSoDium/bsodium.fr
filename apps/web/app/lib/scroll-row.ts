/** Pure helpers of `ScrollRow` (components/ui/scroll-row.tsx): which arrows a sideways-scrolling row shows, and how far one press goes. */

export interface ScrollMetrics {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
}

/** Sub-pixel rounding of `scrollLeft` on high-density screens: within this, the row is at its edge. */
const EDGE = 2;

/**
 * Whether there is more to see before (`start`) and after (`end`) what is shown. `scrollLeft` is negative in a right-to-left row in some
 * engines, so only its size counts. A row that fits has neither.
 */
export function scrollEdges({ scrollLeft, clientWidth, scrollWidth }: ScrollMetrics): { start: boolean; end: boolean } {
  const x = Math.abs(scrollLeft);
  return { start: x > EDGE, end: x + clientWidth < scrollWidth - EDGE };
}

/** One press of an arrow moves four fifths of the visible width: the last chip seen stays in view as the anchor. */
export function scrollStep(clientWidth: number): number {
  return Math.max(1, Math.round(clientWidth * 0.8));
}
