/**
 * The words and the layout of the ring of type (the mono line that circles the planet): pure, no DOM; unit tested in `ring.test.ts`. Where the
 * glyphs go (3D, through the globe's camera) is engine/orbit.ts, the drawing engine/orbit-layer.ts, the tuned numbers are `RING`
 * (engine/tuning.ts); docs/web-architecture.md, "Orbiting type".
 *
 * The line is placed on a circle in the planet's space whose radius is `1 + RING.gap` planet radii, so everything here is a ratio of the planet:
 * the ring scales with it and a ring that closes evenly at one size closes at every size.
 */
import { clamp } from "./geo";
import { RING } from "./tuning";

/* ------------------------------------------------------------------ page flags */

/** Live switch (module state, like `SPIN` and `SKY_STATE`): `applyRingFlags` sets it from the page before the renderer is built. */
export const RING_STATE = { enabled: true };

/**
 * `?no-ring` (or sessionStorage "no-ring" = "1") switches the ring off on any page: the lowest zoom is then the whole-globe fit again, exactly as
 * before it existed. A page in debug mode (`?globe-debug`, what the browser checks run in) has it OFF by default, because their assertions
 * (the lowest zoom is the fit, zero rAF at rest, palette-only pixels) predate it; `?ring` (or sessionStorage "ring" = "1") turns it on there.
 */
export function applyRingFlags(): void {
  RING_STATE.enabled = true;
  try {
    const q = new URLSearchParams(location.search);
    const debug = q.has("globe-debug") || sessionStorage.getItem("globe-debug") === "1";
    const wanted = !debug || q.has("ring") || sessionStorage.getItem("ring") === "1";
    if (q.has("no-ring") || sessionStorage.getItem("no-ring") === "1" || !wanted) RING_STATE.enabled = false;
  } catch {
    // no storage: keep the default
  }
}

/* ------------------------------------------------------------------ text and layout */

/** The line that goes round the ring: the phrases in capitals joined by the separator, and one more separator that closes the loop. */
export function ringText(phrases: readonly string[], separator: string = RING.separator): string {
  const parts = phrases.map((p) => p.trim().toLocaleUpperCase("en")).filter((p) => p.length > 0);
  return parts.length === 0 ? "" : parts.join(separator) + separator;
}

/** The tightest tracking (em) the layout allows: below it the letters would touch. */
const MIN_TRACKING = 0.02;

export interface RingLayout {
  /** Times the line goes round: a whole number, so the ring closes. */
  repeats: number;
  /** The em of the letters as a fraction of the silhouette's radius. */
  emPerR: number;
  /** Tracking in em (added to the monospace's 0.6 em advance) that makes the letters close the circle exactly. */
  tracking: number;
}

/**
 * How the line sits round the ring, for a viewport: from the silhouette's radius at the lowest zoom (`rFloorPx`), where the letters should be
 * `RING.type.targetEmPx` tall. The circumference of the baseline there is C. The count is the whole number `n` whose em at the NOMINAL tracking,
 * `C / (n * length * (0.6 + tracking))`, is nearest the target (by ratio). The em is then that value held within `emSlack` of the target and
 * the tracking takes up what is left, so `n * length` advances of `em * (0.6 + tracking)` are exactly C: the seam closes evenly. Both are then
 * kept as ratios of the silhouette, so they hold at every zoom. A function of the viewport, not of the zoom: nothing reflows while zooming.
 */
export function ringLayout(lineLength: number, rFloorPx: number): RingLayout {
  const target = RING.type.targetEmPx;
  const adv = RING.type.advanceEm;
  const nominal = adv + RING.type.tracking;
  if (lineLength <= 0 || !(rFloorPx > 0)) return { repeats: 1, emPerR: target / Math.max(1, rFloorPx), tracking: RING.type.tracking };
  const circumference = 2 * Math.PI * rFloorPx * (1 + RING.gap);
  const emFor = (n: number) => circumference / (n * lineLength * nominal);
  const n0 = Math.max(1, Math.floor(emFor(1) / target));
  const off = (n: number) => Math.abs(Math.log(emFor(n) / target));
  const repeats = off(n0) <= off(n0 + 1) ? n0 : n0 + 1;
  const slack = RING.type.emSlack;
  let em = clamp(emFor(repeats), target * (1 - slack), target * (1 + slack));
  let tracking = circumference / (repeats * lineLength * em) - adv;
  if (tracking < MIN_TRACKING) {
    // A ring too small for this much text at the smallest allowed em: the letters shrink instead of touching.
    tracking = MIN_TRACKING;
    em = circumference / (repeats * lineLength * (adv + tracking));
  }
  return { repeats, emPerR: em / rFloorPx, tracking };
}
