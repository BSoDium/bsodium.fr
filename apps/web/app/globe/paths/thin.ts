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
