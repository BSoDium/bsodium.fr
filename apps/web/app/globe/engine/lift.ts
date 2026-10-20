/**
 * The lift (pure, unit tested in `lift.test.ts`): how far the planet's centre goes UP while something (the landing hero) covers the bottom of the
 * page. The planet keeps its size and the app's measured cover decides; the room above decides the most: whatever is highest on the screen (the
 * planet's top, or the ring of type where it is shown) keeps `marginPx` from the top edge, so the planet is never pushed out of the window.
 *
 *   without a lift the lowest drawn point (the ring's) is at   height / 2 + reach
 *   what covers it starts at                             height - cover
 *   the lift that clears it (with `gapPx` of air)        height / 2 + reach + gapPx - (height - cover)          (never negative)
 *   the room above                                       height / 2 - reachTopPx - marginPx                        (never negative)
 *
 * The result is a function of the viewport, the cover and the planet at its lowest zoom (the one the home screen rests at), not of the zoom now:
 * nothing moves while the camera does.
 */
import { LIFT } from "./tuning";

export interface LiftArgs {
  /** CSS px of the container's bottom that the app covers (from the container's bottom edge to the top of what covers the planet). */
  cover: number;
  /** The container's height, CSS px. */
  height: number;
  /** The planet's silhouette radius at the zoom the lift is for, CSS px. */
  planetPx: number;
  /** How far above the planet's centre the highest drawn thing reaches at that zoom (the planet itself, or the ring), CSS px. At least `planetPx`. */
  reachTopPx: number;
  gapPx?: number;
  marginPx?: number;
}

/** How far the planet's centre moves up, CSS px (0 when nothing covers the planet, or when there is no room). */
export function liftFor(a: LiftArgs): number {
  const gap = a.gapPx ?? LIFT.gapPx;
  const margin = a.marginPx ?? LIFT.marginPx;
  if (!(a.cover > 0) || !(a.height > 0) || !(a.planetPx > 0)) return 0;
  // The ring runs round the planet, so what must clear the cover is the ring's bottom, as far below the centre as its top is above it.
  const reach = Math.max(a.reachTopPx, a.planetPx);
  const overlap = a.height / 2 + reach + gap - (a.height - a.cover);
  const room = a.height / 2 - reach - margin;
  return Math.max(0, Math.min(overlap, room));
}
