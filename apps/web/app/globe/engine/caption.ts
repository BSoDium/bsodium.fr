/**
 * The caption: the pure maths (no DOM, no Three.js; unit tested in `caption.test.ts`). The Three.js objects are engine/caption-layer.ts; the tuned
 * numbers are `CAPTION` (engine/tuning.ts); docs/web-architecture.md, "Orbiting type".
 *
 * Model. A few lines of type float over the planet on a shell of radius `CAPTION.radius` (well above the surface, so it orbits it: the
 * parallax against the coastlines is visible while the globe turns). Each line lies on a REAL PARALLEL of the globe: the circle of latitude `L`
 * about the earth's own axis, so in whatever orientation the camera has (the view's latitude tilts the axis towards or away from the viewer,
 * which is the tilt and the curvature of the graticule's dotted parallels) the line has exactly the tilt and curvature of that parallel, as the
 * owner asked: seen from the north it bends one way, from the south the other, from the equator it is straight. A line is centred on the
 * VIEW's central meridian (it stays in the middle of the face while the earth turns under it), so in the earth's frame
 *
 *   P(a, L) = r (cos L sin a, sin L, cos L cos a)          a: longitude from the central meridian, L: latitude
 *
 * and the mesh is turned about the earth's axis (y) by the view's longitude plus the entrance's turn. Geometry is built once per layout;
 * nothing is laid out per frame. The lines are on the globe's scene: depth-tested against the planet, back faces culled, so a letter past the
 * horizon is not there (it can never be seen from behind, mirrored).
 */
import { CAPTION } from "./tuning";
import type { GlobeTheme } from "./colors";
import { clamp, DEG } from "./geo";

/* ------------------------------------------------------------------ the faces */

/** The three faces of the caption: the reading serif, the site's mono and an ornate copperplate script (Imperial Script). */
export type CaptionFaceKey = "serif" | "mono" | "script";

/**
 * The look of a stretch of words. `plain` is the reading serif in a medium weight; `heavy` and `heavy-italic` the same face at the top of its weight
 * axis (the words to highlight); `mono` the site's code face; `script` a calligraphic script.
 */
export type CaptionStyleKey = "plain" | "heavy" | "heavy-italic" | "mono" | "script";

/** A stretch of a line in one style (the app's words: engine/types `GlobeCaptionSpan` is the same shape). */
export interface CaptionRun {
  text: string;
  style?: CaptionStyleKey;
}

/** What the caption says: phrase sets that take turns in the upper rows, each set a few rows, and the rows under them that stay (the call to action). */
export interface CaptionContent {
  sets: readonly (readonly (readonly CaptionRun[])[])[];
  fixed: readonly (readonly CaptionRun[])[];
}

export const CAPTION_STYLES: Readonly<Record<CaptionStyleKey, { face: CaptionFaceKey; weight: number; italic: boolean }>> = {
  plain: { face: "serif", weight: 500, italic: false },
  heavy: { face: "serif", weight: 800, italic: false },
  "heavy-italic": { face: "serif", weight: 800, italic: true },
  mono: { face: "mono", weight: 700, italic: false },
  script: { face: "script", weight: 400, italic: false },
};

/**
 * Per face: the CSS family (the page's own faces are declared in app.css and already in the page; the handwriting is added by the layer with the
 * `FontFace` API only when a caption has a word in it), the stack behind it, the size it is drawn at relative to the serif (so the caps agree: the
 * mono's capitals are taller than the serif's at one em, the handwriting's much smaller), a baseline drop in ems and the tracking in ems.
 */
export const CAPTION_FACES = {
  serif: { family: '"Newsreader Variable"', fallback: 'Georgia, "Times New Roman", serif', scale: 1, dy: 0, tracking: 0.005, embolden: 0, url: null },
  mono: { family: '"JetBrains Mono Variable"', fallback: 'ui-monospace, Menlo, Consolas, monospace', scale: 0.88, dy: 0, tracking: 0, embolden: 0, url: null },
  script: {
    family: '"Caption Script"',
    fallback: '"Snell Roundhand", "Apple Chancery", "Segoe Script", cursive',
    scale: 1.0,
    dy: 0,
    tracking: 0.004,
    /** A formal script's hairlines would vanish under a thin outline: its letters are thickened by this many caps (a stroke in the face colour). */
    embolden: 0.05,
    url: "/fonts/imperial-script-1.010-latin-400.woff2",
  },
} as const;

/** The serif's own metrics, which the whole caption is measured in (a cap height is the serif's; the other faces are scaled to it). */
export const CAPTION_FACE = {
  /** Cap height over the em, as the serif sets it. */
  capEm: 0.66,
  /** The line box in caps: above the baseline (ascenders, with the outline) and below it (descenders, the script's too, with the outline). */
  above: 1.4,
  below: 0.55,
} as const;

/**
 * The colours of the caption for a theme, all from the globe's own palette: the face is the page colour tinted towards the ink, the outline the
 * coastline's tone pushed towards the ink, the side a grey between the face and the outline. Greys only (monochrome), quieter than the name
 * (which is the full ink), clearly readable against the linework in both schemes.
 */
export function captionColors(theme: GlobeTheme): {
  face: readonly [number, number, number];
  outline: readonly [number, number, number];
  side: readonly [number, number, number];
} {
  const lum = (c: readonly number[]) => 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  const dark = lum(theme.background) < 0.5;
  const mix = (a: readonly number[], b: readonly number[], t: number): [number, number, number] => [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t, a[2]! + (b[2]! - a[2]!) * t];
  const face = mix(theme.background, theme.ink, dark ? CAPTION.colors.faceMix.dark : CAPTION.colors.faceMix.light);
  const outline = mix(theme.coast, theme.ink, dark ? CAPTION.colors.outlineMix.dark : CAPTION.colors.outlineMix.light);
  return { face, outline, side: mix(face, outline, CAPTION.colors.sideMix) };
}

/** The face asked of the system when a face could not be had: the handwriting is the one that can fail (its file), and the heavy italic serif stands in for it. */
export const CAPTION_FALLBACK_STYLE: Readonly<Partial<Record<CaptionStyleKey, CaptionStyleKey>>> = { script: "heavy-italic" };

/** The CSS `font` of a style at `px`. */
export function captionFont(style: CaptionStyleKey, px: number): string {
  const st = CAPTION_STYLES[style];
  const f = CAPTION_FACES[st.face];
  return `${st.italic ? "italic " : ""}${st.weight} ${px * f.scale}px ${f.family}, ${f.fallback}`;
}

/* ------------------------------------------------------------------ geometry */

/** One line of the caption, laid out. */
export interface CaptionLine {
  /** The words, as styled runs (a drawn line is these runs one after the other on one baseline). */
  runs: CaptionRun[];
  /** The plain text of the line (the runs joined). */
  text: string;
  /** The logical line it belongs to (a wrapped line has two pieces). */
  parent: number;
  /** Latitude of its baseline, degrees: a real parallel. */
  baseLat: number;
  /** Cap height and em in planet radii (arc length on the shell). */
  capR: number;
  emR: number;
  /** Half the line's width in longitude, radians (the text is centred on the central meridian). */
  halfSpan: number;
  /** The band's latitude extent, radians, below and above the baseline. */
  below: number;
  above: number;
  /** The same in caps (the texture's own height above and below the baseline). */
  aboveCaps: number;
  belowCaps: number;
  /** The band's width in ems, as the faces set it: the words, what they overhang, and the room of the outline. */
  widthEm: number;
}

/** What a piece of a line needs: the width of its texture in ems and its height above and below the baseline in caps (the ink's own extent, overhangs included). */
export interface PieceBox {
  widthEm: number;
  aboveCaps: number;
  belowCaps: number;
}

/** A row of the caption before it has a place: its words, its nominal size and what it needs. Fixed by the planet's size; the camera's tilt only moves it. */
export interface CaptionPiece {
  runs: CaptionRun[];
  text: string;
  /** The row it is (0 is the top one). */
  parent: number;
  /** The cap height the row is meant to have, planet radii of arc (before any shrinking to fit a chord). */
  cap: number;
  box: PieceBox;
}

export interface CaptionLayout {
  lines: CaptionLine[];
  /** The scale the whole block was shrunk by to fit its chords (1: not at all). */
  scale: number;
}

export interface LayoutInput {
  /** The rows, top to bottom, each a list of styled runs. */
  rows: readonly (readonly CaptionRun[])[];
  /** The cap height of each row, planet radii (default: `CAPTION.capR.slot` for the rows but the last two, `.fixed` for those). */
  caps?: readonly number[];
  /** A run's advance in ems (of the serif: measured from the face the run is set in). */
  measure(run: CaptionRun): number;
  /**
   * What a piece of a line needs, measured from the faces (the ink's bounding box, not the advance: a script overhangs its last glyph's advance,
   * an italic its first). Absent: the advances and the face constants.
   */
  box?(runs: readonly CaptionRun[]): PieceBox;
  /** The planet's radius at the lowest zoom, CSS px (the least size a letter may have is in CSS px). */
  rPx: number;
  /** The view's latitude, degrees: the parallels are picked for it (`solveParallels`). */
  viewLat: number;
  /** The camera's distance at the lowest zoom (planet radii): the projection the parallels are picked in. */
  d: number;
}

/** The plain text of some runs. */
export const runsText = (runs: readonly CaptionRun[]): string => runs.map((r) => r.text).join("");

/** One word of a line, with the space that follows it, in its style. */
interface Token {
  text: string;
  style: CaptionStyleKey | undefined;
}

const tokenize = (runs: readonly CaptionRun[]): Token[] => {
  const out: Token[] = [];
  for (const r of runs) for (const m of r.text.matchAll(/\S+\s*|\s+/g)) out.push({ text: m[0], style: r.style });
  return out;
};

/** Adjacent tokens of one style are one run again (kerning and ligatures across the space). */
const toRuns = (tokens: readonly Token[]): CaptionRun[] => {
  const out: CaptionRun[] = [];
  for (const t of tokens) {
    const last = out[out.length - 1];
    if (last && last.style === t.style) last.text += t.text;
    else out.push(t.style ? { text: t.text, style: t.style } : { text: t.text });
  }
  if (out.length) {
    out[0]!.text = out[0]!.text.replace(/^\s+/, "");
    out[out.length - 1]!.text = out[out.length - 1]!.text.replace(/\s+$/, "");
  }
  return out.filter((r) => r.text.length > 0);
};

const isSeparator = (t: Token): boolean => /^[\u00b7|\u2022]\s*$/.test(t.text);

/**
 * A line cut in two where it reads best: the boundary nearest its middle by width, a separator dot ("·", dropped at the cut) or the end of a
 * sentence or clause preferred to a plain space; null when it has no place to be cut.
 */
export function splitRuns(runs: readonly CaptionRun[], measure: (run: CaptionRun) => number): [CaptionRun[], CaptionRun[]] | null {
  const tokens = tokenize(runs);
  if (tokens.length < 2) return null;
  const w = tokens.map((t) => measure({ text: t.text, ...(t.style ? { style: t.style } : {}) }));
  const total = w.reduce((a, b) => a + b, 0);
  let best: { score: number; a: Token[]; b: Token[] } | null = null;
  let before = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (isSeparator(t)) {
      if (i > 0 && i < tokens.length - 1) {
        const score = Math.abs(before - total / 2);
        if (best === null || score < best.score) best = { score, a: tokens.slice(0, i), b: tokens.slice(i + 1) };
      }
    } else if (i > 0) {
      const prev = tokens[i - 1]!;
      if (!isSeparator(prev) && t.text.trim() !== "" && prev.text.trim() !== "") {
        // a cut after a full stop or a comma is better than one between two words of a phrase
        const bonus = /[.,;:!?]\s*$/.test(prev.text) ? 0.12 * total : 0;
        const score = Math.abs(before - total / 2) - bonus + 0.12 * total;
        if (best === null || score < best.score) best = { score, a: tokens.slice(0, i), b: tokens.slice(i) };
      }
    }
    before += w[i]!;
  }
  if (!best) return null;
  const a = toRuns(best.a);
  const bb = toRuns(best.b);
  return a.length && bb.length ? [a, bb] : null;
}

/** Arc width of a text in longitude (radians) on the parallel at `lat` (degrees) for a cap height `capR`. */
export const spanOf = (widthEm: number, capR: number, lat: number): number => (widthEm * capR) / CAPTION_FACE.capEm / (CAPTION.radius * Math.cos(clamp(lat, -85, 85) * DEG));

/**
 * The rows of the caption as pieces: each at its own cap height (the call to action, the last rows, is the biggest) and never under `minCapPx`
 * CSS px. The rows are what the app gave (it wraps its own phrases, so each row is one line of type); nothing here depends on the camera: the same
 * pieces serve every tilt, and `solveParallels` gives them their parallels.
 */
export function planPieces(input: Pick<LayoutInput, "rows" | "caps" | "measure" | "box" | "rPx">): { pieces: CaptionPiece[] } {
  const floorCap = CAPTION.minCapPx / input.rPx;
  const boxOf = (rs: readonly CaptionRun[]): PieceBox =>
    input.box?.(rs) ?? { widthEm: rs.reduce((a, r) => a + input.measure(r), 0), aboveCaps: CAPTION_FACE.above, belowCaps: CAPTION_FACE.below };
  const n = input.rows.length;
  const pieces = input.rows.map((runs, i): CaptionPiece => {
    const nominal = input.caps?.[i] ?? (i >= n - 2 ? CAPTION.capR.fixed : CAPTION.capR.slot);
    return { runs: [...runs], text: runsText(runs), parent: i, cap: Math.max(nominal, floorCap), box: boxOf(runs) };
  });
  return { pieces };
}

/**
 * How far from the view's central meridian (radians of longitude) the parallel at `lat` is within `psi` radians of the view's axis, seen from a
 * camera at latitude `viewLat`: the longitude at which `sin(vl) sin(L) + cos(vl) cos(L) cos(a)` falls to `cos(psi)`. 0 when even its middle is
 * farther than that, pi when the whole parallel is nearer (a parallel seen over the pole).
 */
export function visibleHalfSpan(viewLat: number, lat: number, psi: number): number {
  const vl = viewLat * DEG;
  const L = lat * DEG;
  const den = Math.cos(vl) * Math.cos(L);
  if (Math.abs(den) < 1e-9) return Math.sin(vl) * Math.sin(L) >= Math.cos(psi) ? Math.PI : 0;
  const x = (Math.cos(psi) - Math.sin(vl) * Math.sin(L)) / den;
  return x >= 1 ? 0 : x <= -1 ? Math.PI : Math.acos(x);
}

/** Screen height (planet radii, at the camera's focal length) of the point of the shell `delta` radians along the central meridian from the view's centre. */
export const meridianY = (delta: number, d: number, r: number = CAPTION.radius): number => (r * Math.sin(delta)) / (d - r * Math.cos(delta));

/** The inverse of `meridianY`: the offset along the meridian, radians, that lands at screen height `y`. */
export function meridianDelta(y: number, d: number, r: number = CAPTION.radius): number {
  return Math.asin(clamp((y * d) / (r * Math.sqrt(1 + y * y)), -1, 1)) - Math.atan(y);
}

/** Screen height per unit of arc length along the central meridian at offset `delta` (the local scale of the projection). */
const meridianScale = (delta: number, d: number, r: number): number => (d * Math.cos(delta) - r) / ((d - r * Math.cos(delta)) ** 2);

/**
 * The screen height (planet radii, at the camera's focal length) of the point at longitude `a` from the view's central meridian on the parallel
 * `lat` (degrees) of the shell, for a camera over latitude `phi` at distance `d`. The whole of a line's projection: its curve on the screen.
 */
export function shellY(a: number, lat: number, phi: number, d: number, r: number = CAPTION.radius): number {
  const L = lat * DEG;
  const F = phi * DEG;
  const ca = Math.cos(a);
  const cl = Math.cos(L);
  const sl = Math.sin(L);
  return (r * (sl * Math.cos(F) - cl * ca * Math.sin(F))) / (d - r * (sl * Math.sin(F) + cl * ca * Math.cos(F)));
}

/** The screen position (x right, y up; planet radii at the focal length) of the point at longitude `a` on the parallel `lat` of the shell seen from latitude `phi`. */
export function shellXY(a: number, lat: number, phi: number, d: number, r: number = CAPTION.radius, out: [number, number] = [0, 0]): [number, number] {
  const L = lat * DEG;
  const F = phi * DEG;
  const ca = Math.cos(a);
  const cl = Math.cos(L);
  const sl = Math.sin(L);
  const depth = d - r * (sl * Math.sin(F) + cl * ca * Math.cos(F));
  out[0] = (r * cl * Math.sin(a)) / depth;
  out[1] = (r * (sl * Math.cos(F) - cl * ca * Math.sin(F))) / depth;
  return out;
}

export interface Placement {
  baseLat: number;
  /** Cap height after shrinking, planet radii of arc. */
  capR: number;
  halfSpan: number;
  /** Screen height of the baseline at the central meridian (the solver's own coordinate; tests read it). */
  y: number;
}

/** What a placement solved: the placements, the block's scale and its clearances (screen units, the least over the lines' width, between neighbours). */
/** What a solve leaves for the next one of a camera that moved a little (a drag): where the search starts, which makes it a few steps instead of many. */
export interface SolveHint {
  scale: number;
  mirrorScale: number;
  top: number;
}

export interface Solved {
  placements: Placement[];
  scale: number;
  hint: SolveHint;
  /** The least vertical clearance between the ink of row i and row i + 1 over the width both have (planet radii at the focal length). */
  clearances: number[];
  /** The block's middle on the screen (the mean of its top and bottom edges at the central meridian). */
  centreY: number;
}

/**
 * Pick the parallel of every row for a camera looking at latitude `viewLat` from distance `d`, so that the rows are CLEAR OF ONE ANOTHER BY THE
 * SAME DISTANCE ON THE SCREEN and the block is centred on the disc, whatever the tilt.
 *
 * Why not fixed latitudes, nor even steps at the central meridian (measured, docs/web-architecture.md): a parallel's projection bends the more
 * the nearer the pole, so two adjacent lines of different latitude are not parallel on the screen: equal gaps at the middle of the strip became
 * unequal gaps at its ends (from the north the top rows, nearest the pole, converge at their ends and touch while the middle looks fine; from
 * the south the poleward rows are the big call to action, and the same happens there). So the clearance that is held is the LEAST ONE over the
 * strips' width: the top edge of row i + 1 against the bottom edge of row i, both parallels, sampled along the longitude both rows cover. Every
 * row stays on a real parallel; the solution is the lowest latitude for each row that holds the clearance (a bisection, rows from the top), and
 * the block's top is moved until its middle is where `centreDeg` puts it.
 *
 * The block's scale `k` is the largest (up to 1) at which every row fits the chord of its parallel (`visibleHalfSpan`, `hardSpanDeg`) and the
 * block the disc; it is the SMALLER of the one for the camera and the one for its mirror image, so a tilt and its opposite give the same size,
 * the same clearances and the same centre. Limits: the viewing latitude is taken within +-`tiltMax`, a line stays inside +-`latMax`.
 */
export function solveParallels(
  pieces: readonly CaptionPiece[],
  viewLat: number,
  d: number,
  out: Placement[] = [],
  minScale: number = CAPTION.minScale,
  hint?: SolveHint | null,
): Solved {
  const r = CAPTION.radius;
  const n = pieces.length;
  const phi = clamp(viewLat, -CAPTION.tiltMax, CAPTION.tiltMax);
  const horizon = shellHorizon(d, r);
  const yMax = meridianY(horizon * CAPTION.blockDiscFraction, d, r);
  const dc = CAPTION.centreDeg * DEG;
  const yc = meridianY(dc, d, r);
  const sc = meridianScale(dc, d, r);
  const ink = CAPTION.inkFraction;
  const room = (lat: number, camera: number) => Math.min((CAPTION.hardSpanDeg * DEG) / 2, visibleHalfSpan(camera, lat, horizon * CAPTION.visibleFraction));

  /** Solve the block for scale `k` seen from `camera`; fills `into` and says whether it is within the chords and the disc. */
  const block = (k: number, camera: number, into: Placement[], topHint?: number): { ok: boolean; clearances: number[]; centreY: number; top: number } => {
    const caps = pieces.map((p) => p.cap * k);
    const aboveDeg = pieces.map((p, i) => (ink * caps[i]! * p.box.aboveCaps) / r / DEG);
    const belowDeg = pieces.map((p, i) => (ink * caps[i]! * p.box.belowCaps) / r / DEG);
    const half = (i: number, lat: number) => spanOf(pieces[i]!.box.widthEm, caps[i]!, lat) / 2;
    // (the gap is NOT scaled with the block: the clearance between rows is the same from every tilt, whatever size the letters are)
    const gap = CAPTION.gapDeg * DEG * r * sc;
    const lat = new Array<number>(n).fill(0);
    const clear = new Array<number>(Math.max(0, n - 1)).fill(0);
    const K = 8;
    const px = new Float64Array(K + 1);
    const py = new Float64Array(K + 1);
    const cx = new Float64Array(K + 1);
    const cy = new Float64Array(K + 1);
    const tmp: [number, number] = [0, 0];
    /**
     * The clearance between the bottom edge of row i - 1 at `prevLat` and the top edge of row i at `lat`: the least VERTICAL distance on the screen
     * at the same x (a curve of one row against the curve of the next, as the eye sees them; not at the same longitude: two parallels are not
     * parallel on the screen, and the steeper they are the more that differs).
     */
    const clearance = (i: number, prevLat: number, here: number): number => {
      const hp = Math.min(half(i - 1, prevLat), Math.PI / 2);
      const hc = Math.min(half(i, here), Math.PI / 2);
      for (let s = 0; s <= K; s++) {
        shellXY(-hp + (2 * hp * s) / K, Math.max(-89.5, prevLat - belowDeg[i - 1]!), camera, d, r, tmp);
        px[s] = tmp[0];
        py[s] = tmp[1];
        shellXY(-hc + (2 * hc * s) / K, Math.min(89.5, here + aboveDeg[i]!), camera, d, r, tmp);
        cx[s] = tmp[0];
        cy[s] = tmp[1];
      }
      let m = Infinity;
      for (let s = 0; s <= K; s++) {
        // the top edge of row i at x = px[s] (its curve is monotone in x on the half of the parallel facing the camera)
        const x = px[s]!;
        let y = NaN;
        for (let t = 1; t <= K; t++) {
          const x0 = cx[t - 1]!;
          const x1 = cx[t]!;
          if ((x0 - x) * (x1 - x) <= 0 && x0 !== x1) {
            y = cy[t - 1]! + ((cy[t]! - cy[t - 1]!) * (x - x0)) / (x1 - x0);
            break;
          }
        }
        if (!Number.isNaN(y)) m = Math.min(m, py[s]! - y);
      }
      // (no common x at all: the rows do not meet on the screen; judged at the middle)
      return m === Infinity ? shellY(0, Math.max(-89.5, prevLat - belowDeg[i - 1]!), camera, d, r) - shellY(0, Math.min(89.5, here + aboveDeg[i]!), camera, d, r) : m;
    };
    const stackOnce = (top: number) => {
      lat[0] = top;
      for (let i = 1; i < n; i++) {
        const hi = lat[i - 1]! - CAPTION.minLatGapDeg;
        const lo = lat[i - 1]! - 70;
        if (clearance(i, lat[i - 1]!, hi) >= gap) lat[i] = hi;
        else {
          let a = lo;
          let b = hi;
          for (let it = 0; it < 11; it++) {
            const mid = (a + b) / 2;
            if (clearance(i, lat[i - 1]!, mid) >= gap) a = mid;
            else b = mid;
          }
          lat[i] = a;
        }
      }
    };
    /** The rows from `top` down; when they would run past the far pole's floor the whole stack is lifted by what it lacks (it keeps its clearances). */
    const stack = (top: number) => {
      let t = top;
      for (let it = 0; it < 3; it++) {
        stackOnce(t);
        const lacks = -CAPTION.latMax - lat[n - 1]!;
        if (lacks <= 1e-6) break;
        t += lacks;
      }
    };
    /** The block's top and bottom on the screen: the highest point of the first row's top edge and the lowest of the last row's bottom edge. */
    const extent = (): [number, number] => {
      let top = -Infinity;
      let bot = Infinity;
      const h0 = Math.min(half(0, lat[0]!), Math.PI / 2);
      const h1 = Math.min(half(n - 1, lat[n - 1]!), Math.PI / 2);
      for (let s = 0; s <= 8; s++) {
        top = Math.max(top, shellY(-h0 + (2 * h0 * s) / 8, Math.min(89.5, lat[0]! + aboveDeg[0]!), camera, d, r));
        bot = Math.min(bot, shellY(-h1 + (2 * h1 * s) / 8, Math.max(-89.5, lat[n - 1]! - belowDeg[n - 1]!), camera, d, r));
      }
      return [top, bot];
    };
    const centre = () => {
      const [t, b] = extent();
      return (t + b) / 2;
    };
    // the top parallel, moved until the block's middle is on `yc` (a secant search: the middle rises with the top parallel, but not linearly near a pole)
    const at = (t: number): number => {
      stack(clamp(t, -CAPTION.latMax, CAPTION.latMax));
      return centre() - yc;
    };
    let t0 = topHint ?? camera + CAPTION.centreDeg + 12;
    let e0 = at(t0);
    let t1 = t0 + (e0 > 0 ? -3 : 3);
    let e1 = at(t1);
    for (let it = 0; it < 5 && Math.abs(e1) > 2e-4; it++) {
      const denom = e1 - e0;
      const next = Math.abs(denom) < 1e-12 ? t1 : t1 - (e1 * (t1 - t0)) / denom;
      t0 = t1;
      e0 = e1;
      t1 = clamp(next, -CAPTION.latMax, CAPTION.latMax);
      e1 = at(t1);
    }
    stack(clamp(t1, -CAPTION.latMax, CAPTION.latMax));
    // never past the pole's side, never on one parallel
    for (let i = 0; i < n; i++) lat[i] = clamp(lat[i]!, -CAPTION.latMax, CAPTION.latMax);
    for (let i = 1; i < n; i++) lat[i] = Math.min(lat[i]!, lat[i - 1]! - CAPTION.minLatGapDeg);
    for (let i = n - 1; i >= 0; i--) lat[i] = Math.max(lat[i]!, -CAPTION.latMax + (n - 1 - i) * CAPTION.minLatGapDeg);
    let ok = true;
    for (let i = 0; i < n; i++) {
      into[i] = { baseLat: lat[i]!, capR: caps[i]!, halfSpan: half(i, lat[i]!), y: shellY(0, lat[i]!, camera, d, r) };
      if (into[i]!.halfSpan > room(lat[i]!, camera) + 1e-9) ok = false;
    }
    const [yTop, yBot] = extent();
    if (yTop > yMax || yBot < -yMax) ok = false;
    for (let i = 1; i < n; i++) clear[i - 1] = clearance(i, lat[i - 1]!, lat[i]!);
    return { ok, clearances: clear, centreY: (yTop + yBot) / 2, top: lat[0]! };
  };

  /** The block's scale for a camera: the largest that fits (a window round the last one when a hint says where it was, else the whole range). */
  const scaleFor = (camera: number, last: number | undefined, topHint: number | undefined): number => {
    const scratch: Placement[] = [];
    if (last !== undefined) {
      const hi = Math.min(1, last * 1.1);
      const lo = Math.max(minScale, last * 0.9);
      if (block(hi, camera, scratch, topHint).ok) return hi;
      if (block(lo, camera, scratch, topHint).ok) {
        let a = lo;
        let b = hi;
        for (let it = 0; it < 4; it++) {
          const mid = (a + b) / 2;
          if (block(mid, camera, scratch, topHint).ok) a = mid;
          else b = mid;
        }
        return a;
      }
    }
    if (block(1, camera, scratch, topHint).ok) return 1;
    let lo = minScale;
    let hi = 1;
    for (let it = 0; it < 9; it++) {
      const mid = (lo + hi) / 2;
      if (block(mid, camera, scratch, topHint).ok) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  if (n === 0) {
    out.length = 0;
    return { placements: out, scale: 1, hint: { scale: 1, mirrorScale: 1, top: 0 }, clearances: [], centreY: 0 };
  }
  // the larger tilt of the two mirror images decides: a tilt and its opposite are laid out alike
  const own = scaleFor(phi, hint?.scale, hint?.top);
  const mirror = scaleFor(-phi, hint?.mirrorScale, hint ? -hint.top : undefined);
  const k = Math.min(own, mirror);
  const solved = block(k, phi, out, hint?.top);
  out.length = n;
  return { placements: out, scale: k, hint: { scale: own, mirrorScale: mirror, top: solved.top }, clearances: solved.clearances, centreY: solved.centreY };
}

/**
 * The least scale the block may be shrunk to on a planet `rPx` CSS px in radius: the smallest letter is never under three quarters of the least
 * size (`minCapPx`), and the block is never under `CAPTION.minScale` of its size. (At the extreme tilt of a small planet a line may then reach
 * nearer the limb than it would like: legible and foreshortened beats tiny.)
 */
export function minScaleFor(pieces: readonly CaptionPiece[], rPx: number): number {
  const smallest = pieces.reduce((a, p) => Math.min(a, p.cap), Infinity);
  if (!Number.isFinite(smallest) || smallest <= 0) return CAPTION.minScale;
  return clamp((0.75 * CAPTION.minCapPx) / (rPx * smallest), CAPTION.minScale, 1);
}

/**
 * Lay the caption out for a camera: the pieces (`planPieces`) and their parallels (`solveParallels`). The layer does the two steps itself (the
 * pieces once, the parallels as the camera tilts); this is the whole of it in one call, for tests and checks.
 */
export function layoutCaption(input: LayoutInput): CaptionLayout & { solved: Solved } {
  const { pieces } = planPieces(input);
  const solved = solveParallels(pieces, input.viewLat, input.d, [], minScaleFor(pieces, input.rPx));
  return { lines: pieces.map((p, i) => lineOf(p, solved.placements[i]!)), scale: solved.scale, solved };
}

/** A piece at its placement, as the line the strip is built from. */
export function lineOf(p: CaptionPiece, pl: Placement, into?: CaptionLine): CaptionLine {
  const capLat = pl.capR / CAPTION.radius;
  const line = into ?? ({} as CaptionLine);
  line.runs = p.runs;
  line.text = p.text;
  line.parent = p.parent;
  line.baseLat = pl.baseLat;
  line.capR = pl.capR;
  line.emR = pl.capR / CAPTION_FACE.capEm;
  line.halfSpan = pl.halfSpan;
  line.below = capLat * p.box.belowCaps;
  line.above = capLat * p.box.aboveCaps;
  line.aboveCaps = p.box.aboveCaps;
  line.belowCaps = p.box.belowCaps;
  line.widthEm = p.box.widthEm;
  return line;
}

/** A point of the shell in the earth's frame at longitude `a` (from the central meridian) and latitude `lat` (degrees), radius `r` (default the shell's). */
export function parallelPoint(a: number, lat: number, r: number = CAPTION.radius, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const L = lat * DEG;
  const cl = Math.cos(L);
  out[0] = r * cl * Math.sin(a);
  out[1] = r * Math.sin(L);
  out[2] = r * cl * Math.cos(a);
  return out;
}

export interface BandMesh {
  positions: Float32Array;
  uvs: Float32Array;
  /** 0 for the farthest slice (towards the planet), 1 for the front face. */
  layers: Float32Array;
  indices: Uint16Array;
}

/**
 * The strip of one line, `slices` of it stacked radially from `r - depth` (back) to `r` (the front face), each of `nu` columns along the longitude
 * (the text's direction, left to right) and one row, wound counter-clockwise seen from OUTSIDE (so back-face culling removes the far side). The
 * texture's u runs along the longitude, v up the latitude (1 at the top). The band lies on the parallel of `line.baseLat`: v = 0 is `below` under it.
 */
export function bandMesh(line: CaptionLine, nu: number, slices: number, depth: number, r: number = CAPTION.radius): BandMesh {
  const unit = unitBand(nu, slices);
  const n = unit.attributes.length / 3;
  const positions = new Float32Array(n * 3);
  const uvs = new Float32Array(n * 2);
  const layers = new Float32Array(n);
  const p: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const u = unit.attributes[3 * i]!;
    const v = unit.attributes[3 * i + 1]!;
    const k = unit.attributes[3 * i + 2]!;
    bandPoint(line, u, v, k, depth, r, p);
    positions.set(p, 3 * i);
    uvs[2 * i] = u;
    uvs[2 * i + 1] = v;
    layers[i] = k;
  }
  return { positions, uvs, layers, indices: unit.indices };
}

/** Columns of the strip every line shares: about one every 2 degrees of longitude at the widest a line goes (the strip is flat between columns: the shell's sag is far under a pixel). */
export const BAND_COLUMNS = 64;

/**
 * The strip's UNIT geometry, shared by every line: per vertex `(u, v, layer)`, u along the line (0 to 1), v across it (0 the bottom edge, 1 the
 * top), layer 0 for the farthest slice and 1 for the front face; the vertex shader puts it on the parallel (`bandPoint` is the same formula).
 */
export function unitBand(nu: number = BAND_COLUMNS, slices: number = CAPTION.slices): { attributes: Float32Array; indices: Uint16Array } {
  const cols = nu + 1;
  const perSlice = cols * 2;
  const attributes = new Float32Array(slices * perSlice * 3);
  const indices = new Uint16Array(slices * nu * 6);
  let t = 0;
  for (let s = 0; s < slices; s++) {
    const k = slices === 1 ? 1 : s / (slices - 1);
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < cols; i++) {
        const n = s * perSlice + j * cols + i;
        attributes[3 * n] = i / nu;
        attributes[3 * n + 1] = j;
        attributes[3 * n + 2] = k;
      }
    }
    for (let i = 0; i < nu; i++) {
      const v00 = s * perSlice + i;
      const v10 = v00 + 1;
      const v01 = v00 + cols;
      const v11 = v01 + 1;
      indices[t++] = v00;
      indices[t++] = v10;
      indices[t++] = v11;
      indices[t++] = v00;
      indices[t++] = v11;
      indices[t++] = v01;
    }
  }
  return { attributes, indices };
}

/**
 * The point of the strip of `line` at `(u, v, layer)` of the unit band, in the earth's frame: what the vertex shader computes (a line is its
 * parallel, its width in longitude and its extent in latitude; the strip itself never changes).
 */
export function bandPoint(line: Pick<CaptionLine, "baseLat" | "halfSpan" | "below" | "above">, u: number, v: number, layer: number, depth: number, r: number = CAPTION.radius, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const lat = line.baseLat - line.below / DEG + v * ((line.below + line.above) / DEG);
  return parallelPoint((u * 2 - 1) * line.halfSpan, lat, r - depth * (1 - layer), out);
}

/* ------------------------------------------------------------------ visibility */

/**
 * The angle from the view axis, radians, beyond which a point of the shell cannot be seen: the shell's front faces are those whose outward normal
 * faces the camera at distance `d` (planet radius 1): `cos(psi) > r / d`. Past it a face is culled (and the planet's depth hides what is behind it).
 */
export const shellHorizon = (d: number, r: number = CAPTION.radius): number => Math.acos(clamp(r / d, -1, 1));

/** Whether a point at central angle `psi` from the view axis is on a front face. */
export const faceTowardsViewer = (psi: number, d: number, r: number = CAPTION.radius): boolean => psi < shellHorizon(d, r);

/**
 * A line turned by `theta` about the earth's axis (positive: to the right) is entirely out of sight: the nearest point of its parallel is past the
 * shell's horizon. The central angle from the view axis to the point of the parallel `baseLat` at longitude offset `a` from the view's centre is
 * `acos(sin(vl) sin(L) + cos(vl) cos(L) cos(a))`; the line's nearest point is at the offset `max(0, |theta| - halfSpan)`.
 */
export function lineHidden(theta: number, line: Pick<CaptionLine, "halfSpan" | "baseLat">, d: number, viewLat: number): boolean {
  const off = Math.max(0, Math.abs(theta) - line.halfSpan);
  const vl = viewLat * DEG;
  const L = line.baseLat * DEG;
  // (the band stands above its baseline: take the latitude nearest the view's own, so a band that straddles the limb counts as seen)
  const cos = Math.sin(vl) * Math.sin(L) + Math.cos(vl) * Math.cos(L) * Math.cos(Math.min(off, Math.PI));
  return !faceTowardsViewer(Math.acos(clamp(cos, -1, 1)), d);
}

/* ------------------------------------------------------------------ the entrance */

/** Fast start, slow settle: 1 - 2^(-10 p), exactly 0 at 0 and 1 at 1. */
export const easeOutExpo = (p: number): number => (p >= 1 ? 1 : p <= 0 ? 0 : 1 - 2 ** (-10 * p));
/** Slow start, quick end. */
export const easeInCubic = (p: number): number => {
  const x = clamp(p, 0, 1);
  return x * x * x;
};

/**
 * Where a line starts, east of its resting place, radians: far enough that all of it is behind the planet for any camera the page has. The
 * point of its parallel at longitude offset `a` from the view's centre is out of sight when `sin(vl) sin(L) + cos(vl) cos(L) cos(a)` is under
 * `r / d` (`d` at its largest, `START_D`: the farther the camera, the less is hidden); the line starts that far plus its own half width.
 * (A parallel near the pole can be seen from the other side of the planet over the pole: then it starts at the farthest, 180 degrees.)
 */
export function entranceStart(line: Pick<CaptionLine, "halfSpan" | "baseLat">, viewLat: number, dMax: number = START_D): number {
  const vl = viewLat * DEG;
  const L = line.baseLat * DEG;
  const denom = Math.cos(vl) * Math.cos(L);
  const need = denom > 1e-6 ? (CAPTION.radius / dMax - Math.sin(vl) * Math.sin(L)) / denom : -1;
  const hidden = Math.acos(clamp(need, -1, 1));
  return Math.min(Math.PI, Math.max(CAPTION.enter.fromDeg * DEG, hidden + line.halfSpan + 4 * DEG));
}

/** The camera distance the entrance's start is computed for when none is given: beyond the farthest the page has (the lowest zoom of a narrow phone is about 13). */
const START_D = 16;

/**
 * The turn of line `i` `t` ms after the entrance began, radians: the start angle until the line's own start (`i` times `staggerMs`), then
 * `start (1 - easeOutExpo)` over `ms`. A function of time only, so it is the same at 30 and at 144 frames a second.
 */
export function enteringAngle(t: number, i: number, start: number): number {
  const p = (t - i * CAPTION.enter.staggerMs) / CAPTION.enter.ms;
  return start * (1 - easeOutExpo(p));
}

/** Time the whole entrance takes: the last line's start and its duration. */
export const entranceMs = (lines: number): number => CAPTION.enter.ms + Math.max(0, lines - 1) * CAPTION.enter.staggerMs;

/** The turn `t` ms after leaving began, from `from`: on, the other way, behind the planet (`ms`: the orbit exit's duration). */
export function leavingAngle(t: number, from: number, start: number, ms: number = CAPTION.leaveMs): number {
  return from + (-start - from) * easeInCubic(t / ms);
}

/* ------------------------------------------------------------------ the rows that take turns */

/** Time the outgoing rows of a swap take: the last one starts `exitStaggerMs` after the one above it. */
export const swapExitMs = (rows: number): number => CAPTION.cycle.exitMs + Math.max(0, rows - 1) * CAPTION.cycle.exitStaggerMs;

/** Time a whole swap takes: the rows go (the orbit exit), then the next ones come in (`entranceMs`, the entrance's own stagger). */
export const swapMs = (rows: number): number => swapExitMs(rows) + entranceMs(rows);

/**
 * The turn of the OUTGOING row `row` `t` ms after the swap began: from its place on round the orbit, behind the planet, to `-start` (`start`
 * signed: the side it goes towards), each row `exitStaggerMs` after the one above it, ease-in; it stays there (and is not drawn).
 */
export function swapExitAngle(t: number, row: number, start: number): number {
  const p = (t - row * CAPTION.cycle.exitStaggerMs) / CAPTION.cycle.exitMs;
  return p <= 0 ? 0 : p >= 1 ? -start : -start * easeInCubic(p);
}

/**
 * The turn of the INCOMING row `row` `t` ms after the swap began: behind the planet at `start` (signed: the side it comes from) until the
 * outgoing rows have all gone, then each row `staggerMs` after the one above it, the entrance's own curve (`easeOutExpo`).
 */
export function swapEnterAngle(t: number, row: number, rows: number, start: number): number {
  return enteringAngle(t - swapExitMs(rows), row, start);
}

export type CaptionPhase = "hidden" | "in" | "out" | "fade" | "rest";

/** How the caption leaves: a fade (the interaction's exit: cheap) or the orbit (the lines travel behind the planet). */
export type CaptionExit = "fade" | "orbit";

/** The caption's clock: what it is doing and since when. `now` is any monotonic clock in ms. */
/** A small seeded generator (mulberry32): the same seed, the same sides, in tests and in a capture. */
export function seededUnit(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The side each line comes in from along its parallel for entrance number `n` of a session seeded `seed`: -1 from the west, +1 from the east, at
 * random per line (it may repeat). Pure and deterministic.
 */
export function entranceSides(seed: number, n: number, lines: number): (1 | -1)[] {
  const next = seededUnit((seed ^ Math.imul(n + 1, 0x9e3779b1)) | 0);
  next(); // (the first draw of a small seed is poorly mixed)
  return Array.from({ length: lines }, () => (next() < 0.5 ? -1 : 1));
}

export class CaptionMotion {
  phase: CaptionPhase = "hidden";
  /**
   * The session's seed for the sides the lines come in from, per entrance. Null: every line from the east (the plain, deterministic default of
   * the pure tests); the layer gives it a random one per session, a check or a capture sets its own.
   */
  seed: number | null = null;
  private entrances = 0;

  /** Checks and captures: a seed again from its first entrance (the same seed, the same sides), drawn at once. */
  reseed(seed: number | null): void {
    this.seed = seed;
    this.entrances = 0;
    this.rollSides();
  }

  /** The number of the entrance whose sides are drawn now (1 for the first). */
  get entranceNumber(): number {
    return this.entrances;
  }
  private sides: (1 | -1)[] = [];

  /** The side line `i` (by its turn in the stagger) comes in from now: +1 east, -1 west. */
  side(i: number): 1 | -1 {
    return this.sides[this.order[i] ?? i] ?? 1;
  }

  /** Draw the sides of the next entrance (a new entrance from hidden does it itself; a capture or a check may ask for it, with another seed). */
  rollSides(): void {
    this.entrances++;
    const n = this.turns();
    this.sides = this.seed === null ? Array<1 | -1>(n).fill(1) : entranceSides(this.seed, this.entrances, n);
  }

  private t0 = 0;
  private starts: number[] = [];
  /** An `in` that waits for the first frame (the time starts when something is there to see). */
  private pending = false;

  /** The turn in the stagger of each line: a wrapped line's pieces come in together (its logical line's index); by default, the line's own. */
  private order: number[] = [];

  /** Where each line starts (radians), and its place in the stagger, set once the lines are laid out. */
  setStarts(starts: readonly number[], order?: readonly number[]): void {
    this.starts = [...starts];
    this.order = order ? [...order] : starts.map((_, i) => i);
    if (this.sides.length < this.turns()) this.rollSides();
  }

  private turns(): number {
    return (this.order.length ? Math.max(...this.order) : 0) + 1;
  }

  /**
   * The showcase begins: the lines come in. From hidden they start behind the planet (`start`, staggered). When a leaving is cut short the lines
   * are on the face or on their way out on the other side: each goes on from exactly where it is (no stagger, no jump) and settles into its place.
   */
  enter(now: number | null): void {
    if (this.phase === "in") return;
    this.enterFrom = null;
    if (this.phase === "out" && now !== null) {
      // (a leaving cut short goes on from where each line is: its sides are the ones it left by)
      this.enterFrom = this.starts.map((s, i) => this.angle(now, i, s));
    } else this.rollSides();
    this.phase = "in";
    this.pending = now === null;
    this.t0 = now ?? 0;
  }

  /** Where each line was when an entrance cut a leaving short (null: from behind the planet). */
  private enterFrom: number[] | null = null;

  /** Whether `enter` is waiting for a first time reading. */
  get waiting(): boolean {
    return this.phase === "in" && this.pending;
  }

  /** Begin the clock of a pending entrance, `delayMs` from `now` (the page's own fade-in goes first). */
  begin(now: number, delayMs = 0): void {
    if (this.waiting) {
      this.t0 = now + delayMs;
      this.pending = false;
    }
  }

  /**
   * The showcase ends: the lines on the face go on behind the planet the other way. A line that has not begun to arrive (waiting for the first
   * frame, its load delay or its stagger) is still behind the planet, and STAYS there: it does not sweep across the face on its way "out".
   */
  leave(now: number, exit: CaptionExit = "fade"): void {
    if (this.phase === "hidden" || this.phase === "out" || this.phase === "fade") return;
    // each line goes on from where it is now (an entrance cut short keeps every line where it had got to)
    this.leaveAngles = this.starts.map((s, i) => this.angle(now, i, s));
    this.leaveStays = this.leaveAngles.map((a, i) => Math.abs(a - (this.starts[i] ?? 0) * this.side(i)) < 1e-9);
    this.phase = exit === "orbit" ? "out" : "fade";
    this.t0 = now;
  }

  /** The fade is over: the caption is hidden (call once per frame; nothing else moves in a fade). */
  tick(now: number): void {
    if (this.phase === "fade" && now - this.t0 >= CAPTION.fadeMs) this.phase = "hidden";
  }

  /** Per line: it was still at its start when the leaving began. */
  private leaveStays: boolean[] = [];

  private leaveAngles: number[] = [];

  /** Jump to the final state (reduced motion): in place, or gone. */
  settle(on: boolean): void {
    this.phase = on ? "rest" : "hidden";
  }

  /** Checks and captures only: hold the entrance at `ms` after its start (null releases it). */
  pinned: number | null = null;
  /** Checks and captures only: hold every line at this turn, radians (the limb close-ups: a line half past the horizon, on either side). */
  pinnedAngle: number | null = null;

  /** The turn of line `i` now, radians (positive: east of its place); `magnitude` is how far behind the planet it starts, the side is the line's. */
  angle(now: number, i: number, magnitude: number): number {
    if (this.pinnedAngle !== null) return this.pinnedAngle;
    const k = this.order[i] ?? i;
    const start = magnitude * this.side(i);
    if (this.pinned !== null) return enteringAngle(this.pinned, k, start);
    switch (this.phase) {
      case "hidden":
        return start;
      case "rest":
        return 0;
      case "in": {
        if (this.pending) return this.enterFrom?.[i] ?? start;
        const t = now - this.t0;
        const from = this.enterFrom?.[i];
        const a = from === undefined ? enteringAngle(t, k, start) : from * (1 - easeOutExpo(t / CAPTION.enter.ms));
        if (t >= entranceMs(this.turns())) {
          this.phase = "rest";
          return 0;
        }
        return a;
      }
      case "fade":
        // the lines stay on their own turn (the camera still moves them on the screen) and the canvas fades
        return this.leaveAngles[i] ?? 0;
      case "out": {
        const t = now - this.t0;
        if (t >= CAPTION.leaveMs) {
          this.phase = "hidden";
          return start;
        }
        if (this.leaveStays[i]) return start;
        return leavingAngle(t, this.leaveAngles[i] ?? 0, start);
      }
    }
  }

  /** Something is moving (the frame loop must keep going). */
  get animating(): boolean {
    // (a pending entrance is not a frame loop: nothing moves until the first frame has given it a clock)
    return this.pinned === null && this.pinnedAngle === null && ((this.phase === "in" && !this.pending) || this.phase === "out");
  }
}

/* ------------------------------------------------------------------ page flags */

/** Live switch (module state, like `RING_STATE`): `applyShowcaseFlags` sets it from the page before the renderer is built. */
export const SHOWCASE_STATE = { enabled: true };

/**
 * The home screen's showcase (the page opens zoomed out, the boxes give way to the caption, the planet is lifted) is on every page but a debug one
 * (`?globe-debug`, what the browser checks run in: their assertions predate it, they open at the whole-globe fit); `?showcase` (or sessionStorage
 * "showcase" = "1") turns it on there. `?no-ring` switches the ring AND the caption off (the page is then the one of before the showcase).
 */
export function applyShowcaseFlags(): void {
  SHOWCASE_STATE.enabled = true;
  try {
    const q = new URLSearchParams(location.search);
    const debug = q.has("globe-debug") || sessionStorage.getItem("globe-debug") === "1";
    if (debug && !(q.has("showcase") || sessionStorage.getItem("showcase") === "1")) SHOWCASE_STATE.enabled = false;
  } catch {
    // no storage: keep the default
  }
}
