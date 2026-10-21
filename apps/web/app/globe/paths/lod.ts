/**
 * Level of detail and fade of the paths, as pure functions of the view (so the shader and the tests agree).
 *
 * Detail: the coarsest simplification level whose error is at most `LEVEL_ERROR_CELLS` of an art pixel at the current scale. The
 * switch has a hysteresis (`LEVEL_HYSTERESIS`): the scale has to move 25 % past a boundary to change level, so a zoom that
 * hovers at one never flickers between two.
 *
 * Fade: a leg is hidden while it is shorter than `FADE_FROM_CELLS` art pixels, and its tone steps up through the palette
 * (`rampLevel`, the same staircase the borders use: solid tones, never an alpha) to the path tone at `FADE_FULL_CELLS`.
 * "Short legs are hidden at the world view" is this rule: a 300 km leg is 0.6 of a cell there.
 */
import { EARTH_RADIUS_M } from "./simplify";
import { LOD_TOLERANCES_M } from "./network";
import { rampLevel } from "../engine/palette";

export const LEVEL_ERROR_CELLS = 0.5;
export const LEVEL_HYSTERESIS = 1.25;
export const FADE_FROM_CELLS = 2;
export const FADE_FULL_CELLS = 14;

/** Metres on the ground per art pixel at the centre of the globe: `radiusPx` is `zoomToRadiusPx(zoom)` and `cssPerCell` the art pixel in CSS px. */
export const metresPerCell = (radiusPx: number, cssPerCell: number): number => (EARTH_RADIUS_M * cssPerCell) / radiusPx;

/** The level to draw at `mPerCell`, given the one drawn now (`null`: none yet). */
export function levelFor(mPerCell: number, current: number | null, tolerances: readonly number[] = LOD_TOLERANCES_M): number {
  const half = LEVEL_ERROR_CELLS * mPerCell;
  const last = tolerances.length - 1;
  if (current === null) {
    let k = 0;
    while (k < last && tolerances[k + 1]! <= half) k++;
    return k;
  }
  let k = Math.min(last, Math.max(0, current));
  while (k < last && tolerances[k + 1]! <= half / LEVEL_HYSTERESIS) k++;
  while (k > 0 && tolerances[k]! > half * LEVEL_HYSTERESIS) k--;
  return k;
}

/** The palette level a leg of `lengthCells` art pixels is drawn at: 0 hidden, up to `finalLevel`. */
export function fadeLevel(lengthCells: number, finalLevel: number): number {
  const t = (lengthCells - FADE_FROM_CELLS) / (FADE_FULL_CELLS - FADE_FROM_CELLS);
  return rampLevel(Math.min(1, t), finalLevel);
}

/**
 * How far away the view is, 0..1, for the paths' own tone: 1 on the whole globe, 0 from `FAR_TO` (internal zoom) on, in sixths (a timed value would
 * be a fade; a step of the tone is what the art does). Far away every path is quieter, so the set of them does not read as a tangle; the legs of the
 * selected place are not affected.
 */
/**
 * The rail's cross-ticks (a 3-cell bar across the line in the middle of every dash) are drawn from this zoom on: from far away a rail is a dashed line
 * (the tick at overview doubled the weight of every rail and made a region of many trips a mesh of crosses).
 */
export const TICK_FROM = 5.5;
export const FAR_FROM = 1.2;
export const FAR_TO = 2.6;
export function farOf(zoom: number): number {
  const t = Math.min(1, Math.max(0, (zoom - FAR_FROM) / (FAR_TO - FAR_FROM)));
  return Math.round((1 - t * t * (3 - 2 * t)) * 6) / 6;
}
