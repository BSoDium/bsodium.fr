/**
 * Thinning the paths so a region with many trips does not turn into a tangle (owner, 2026-10-20: "Europe is one big mess"). Pure, per zoom.
 *
 * At a zoom the legs are taken in order of importance (the selected place's first, then the longest) and a leg is DROPPED when
 *   - it is shorter on screen than `MIN_CELLS` art pixels (a blob: it reads as noise and returns as soon as it is long enough to read), or
 *   - most of its length lies on cells that kept legs already cover (the same corridor travelled again: a road two trips share, a return trip,
 *     a train and the bus beside it): one line says it.
 * The legs of the selected place are never dropped. From `OFF_ZOOM` on (a city's scale) nothing is dropped: there the lines are far enough apart.
 *
 * "Covered" is worked out on a grid `GRID` art pixels coarse in the Web Mercator pixel plane of that zoom, so lines a pixel or two apart count as one.
 */

type LonLat = readonly [number, number];

export interface ThinLeg {
  key: string;
  /** The leg's pieces (lon, lat), the antimeridian already split. */
  parts: ReadonlyArray<ReadonlyArray<LonLat>>;
  /** The leg is next to the selected place: always kept, and first. */
  lit?: boolean;
  /** The leg is a straight line or an arc (a flight, a leg without a road under it), not a path that follows the ground: `fadeStraight` quietens it up close. */
  straight?: boolean;
}

/** The key of a leg: the route and the position of the leg in it (the street map's source, its filters and the globe's layer all use it). */
export const legKey = (routeId: string, legIndex: number): string => `${routeId}:${legIndex}`;

export const MIN_CELLS = 10;
export const GRID = 4;
export const COVERED = 0.65;
/** Map zoom from which nothing is thinned. */
export const OFF_ZOOM = 9.5;
/** The zoom steps the result is worked out at (a step of the quantised zoom is one thinning). */
export const THIN_STEP = 0.25;

export const thinZoomOf = (zoom: number): number => Math.round(zoom / THIN_STEP) * THIN_STEP;

/** Web Mercator, CSS px at `zoom` (512 px tiles, as the street map's). */
function px(p: LonLat, zoom: number): [number, number] {
  const s = 512 * 2 ** zoom;
  const lat = Math.max(-85.0511, Math.min(85.0511, p[1]));
  const sin = Math.sin((lat * Math.PI) / 180);
  return [((p[0] + 180) / 360) * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s];
}

/** The coarse cells a leg passes through and its length in art pixels. */
function cellsOf(leg: ThinLeg, zoom: number, cellCss: number): { cells: Set<number>; length: number } {
  const g = cellCss * GRID;
  const cells = new Set<number>();
  let length = 0;
  for (const part of leg.parts) {
    for (let i = 1; i < part.length; i++) {
      const [ax, ay] = px(part[i - 1]!, zoom);
      const [bx, by] = px(part[i]!, zoom);
      const d = Math.hypot(bx - ax, by - ay);
      length += d / cellCss;
      const n = Math.max(1, Math.ceil(d / (g * 0.5)));
      for (let k = 0; k <= n; k++) {
        const cx = Math.floor((ax + ((bx - ax) * k) / n) / g);
        const cy = Math.floor((ay + ((by - ay) * k) / n) / g);
        cells.add(cx * 1_000_003 + cy);
      }
    }
  }
  return { cells, length };
}

/** The keys of the legs that stay at `zoom` (null: all of them). `cellCss` is the art pixel in CSS px. */
export function thinLegs(legs: readonly ThinLeg[], zoom: number, cellCss: number): Set<string> | null {
  if (zoom >= OFF_ZOOM || !(cellCss > 0)) return null;
  const measured = legs.map((leg) => ({ leg, ...cellsOf(leg, zoom, cellCss) }));
  measured.sort((a, b) => Number(!!b.leg.lit) - Number(!!a.leg.lit) || b.length - a.length);
  const kept = new Set<string>();
  const covered = new Set<number>();
  for (const m of measured) {
    if (!m.leg.lit) {
      if (m.length < MIN_CELLS) continue;
      let on = 0;
      for (const c of m.cells) if (covered.has(c)) on++;
      if (m.cells.size > 0 && on / m.cells.size >= COVERED) continue;
    }
    kept.add(m.leg.key);
    for (const c of m.cells) covered.add(c);
  }
  return kept;
}

/**
 * Straight lines (a flight, an arc: nothing under them) are a feature of the far view; up close they cut across every road and every box (owner,
 * 2026-10-21). So they quieten with how much of the screen they take, not with the zoom alone: a leg whose endpoints are up to `STRAIGHT_FADE_FROM`
 * screens apart is drawn as it is (a short flight, Minsk to Moscow, stays readable at the zoom that fits it), from there to `STRAIGHT_FADE_TO` screens it
 * steps through `STRAIGHT_FADE_STEPS` tones toward the page colour (solid, never an opacity), the last `STRAIGHT_FADE_MIX` of the way.
 * The legs of the selected place (`lit`) are never quietened.
 */
export const STRAIGHT_FADE_FROM = 1;
export const STRAIGHT_FADE_TO = 3;
export const STRAIGHT_FADE_STEPS = 3;
export const STRAIGHT_FADE_MIX = 0.8;

/** The step (0 as it is .. `STRAIGHT_FADE_STEPS`) of a straight leg `span` CSS px between its ends in a view `view` CSS px across (its larger side). */
export function straightFadeLevel(span: number, view: number): number {
  if (!(view > 0)) return 0;
  const t = (span / view - STRAIGHT_FADE_FROM) / (STRAIGHT_FADE_TO - STRAIGHT_FADE_FROM);
  return t <= 0 ? 0 : Math.min(STRAIGHT_FADE_STEPS, Math.ceil(t * STRAIGHT_FADE_STEPS - 1e-9));
}

/** The quietened straight legs at a Web Mercator `zoom`, by key, with their step; null when none is. `view` is the larger side of the view in CSS px. */
export function fadeStraight(legs: readonly ThinLeg[], zoom: number, view: number): Map<string, number> | null {
  let out: Map<string, number> | null = null;
  const world = 512 * 2 ** zoom;
  for (const leg of legs) {
    if (!leg.straight || leg.lit) continue;
    const first = leg.parts[0]?.[0];
    const lastPart = leg.parts[leg.parts.length - 1];
    const last = lastPart?.[lastPart.length - 1];
    if (!first || !last) continue;
    const [ax, ay] = px(first, zoom);
    const [bx, by] = px(last, zoom);
    const dx = Math.abs(bx - ax);
    const level = straightFadeLevel(Math.hypot(Math.min(dx, world - dx), by - ay), view);
    if (level > 0) (out ??= new Map()).set(leg.key, level);
  }
  return out;
}
