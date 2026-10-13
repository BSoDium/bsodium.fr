/**
 * The orbiting type: the pure maths (no DOM; unit tested in `orbit.test.ts`). The drawing is engine/orbit-layer.ts; the tuned numbers are `RING`
 * (engine/tuning.ts); docs/web-architecture.md, "Orbiting type".
 *
 * Model. Two pieces of type live in the globe's own space (planet radius 1 at the origin) and are seen through the SAME perspective camera as the
 * pixel globe: a mono ring that circles the planet in a tilted plane (the ring, A), and a heavy two-line caption that wraps a shell just above the
 * surface (the band, B). Both are expressed in the camera's frame, x to the right, y up, z toward the viewer, so they are fixed to the VIEW
 * (the globe turning under the camera does not tip them) and move on their own clock. A point (x, y, z) is on the screen at
 *
 *   depth = d - z,   sx = cx + f x / depth,   sy = cy - f y / depth          (the projection of `geo.ts` `projectUnit`, d the camera distance)
 *
 * so what is placed here lands exactly where the planet's own geometry would put it, and shrinks, foreshortens and goes behind the planet with it.
 * A glyph is a flat cell of the atlas: it is drawn with the 2D affine that the projection gives AT ITS CENTRE (the secant over one em along each
 * of its two axes), exact to well under a pixel over a glyph; nothing is laid out or rasterised per frame.
 *
 * Hidden or not: a point at or in front of the horizon's plane (z >= 1 / d, the plane of the circle where the camera's tangent cone touches the
 * planet) can never be behind the planet; one behind it is `back`: the layer clips it with the planet's silhouette circle (and dims it), so it
 * shows only outside the disc, exactly as far as it is not occluded.
 */
import { clamp, DEG, FOV_DEG, silhouetteRadiusPx } from "./geo";
import { RING } from "./tuning";

/** The globe's perspective in the view's frame: camera distance (planet radius 1), focal length and where the planet's centre is on the container, CSS px. */
export interface OrbitCam {
  d: number;
  f: number;
  cx: number;
  cy: number;
}

/** Height of a capital over the baseline, in em, of the mono face; the atlas centres the capitals on their cell with half of it. */
export const CAP_HEIGHT_EM = 0.72;
/** The ring's cell, in em: wide enough for any glyph at the tracking, tall enough for an accent over a capital and the stroke. */
export const RING_CELL = { w: 0.9, h: 1.25 };
/** The band's cell, in em (heavy capitals of the display face; the outline is inside it). */
export const BAND_CELL = { w: 1.2, h: 1.3 };

/* ------------------------------------------------------------------ glyphs */

/** The glyphs of one piece for one frame, as parallel arrays (no allocation per frame). Spaces are not in it. */
export class GlyphSet {
  /** Screen position of the glyph's centre, container CSS px. */
  x = new Float32Array(0);
  y = new Float32Array(0);
  /** The affine of the glyph's cell, CSS px per em: (a, b) is where the glyph's own right goes, (c, d) where its own DOWN goes. */
  a = new Float32Array(0);
  b = new Float32Array(0);
  c = new Float32Array(0);
  d = new Float32Array(0);
  /** UTF-16 code of the character. */
  code = new Uint16Array(0);
  /** 1: behind the plane through the planet's centre (to be clipped by the disc and dimmed). */
  back = new Uint8Array(0);
  count = 0;
  /** Extent of the glyph centres, container CSS px, and the largest em on the screen among them (for the padding of the canvas). */
  minX = 0;
  maxX = 0;
  minY = 0;
  maxY = 0;
  maxEmPx = 0;

  ensure(n: number): void {
    if (this.x.length >= n) return;
    const cap = Math.max(n, this.x.length * 2, 64);
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.a = new Float32Array(cap);
    this.b = new Float32Array(cap);
    this.c = new Float32Array(cap);
    this.d = new Float32Array(cap);
    this.code = new Uint16Array(cap);
    this.back = new Uint8Array(cap);
  }

  /** Forget the previous frame's extent. */
  reset(): void {
    this.count = 0;
    this.minX = this.minY = Infinity;
    this.maxX = this.maxY = -Infinity;
    this.maxEmPx = 0;
  }
}

/**
 * Write glyph `n` of `out`: centre `P`, reading direction `T` and up direction `U` (unit vectors of the camera's frame, the glyph's own axes in
 * space), `em` its size in planet radii. The affine is the projection's secant over one em along each axis, centred on the glyph's centre.
 */
function put(out: GlyphSet, n: number, cam: OrbitCam, code: number, px: number, py: number, pz: number, tx: number, ty: number, tz: number, ux: number, uy: number, uz: number, em: number): void {
  const h = 0.5 * em;
  const { d, f, cx, cy } = cam;
  // The centre.
  const dc = d - pz;
  const x = cx + (f * px) / dc;
  const y = cy - (f * py) / dc;
  // Along the reading direction: from the glyph's left to its right edge (one em).
  const d1 = d - (pz - tz * h);
  const d2 = d - (pz + tz * h);
  const ax = (f * (px + tx * h)) / d2 - (f * (px - tx * h)) / d1;
  const ay = -((f * (py + ty * h)) / d2 - (f * (py - ty * h)) / d1);
  // Along the glyph's down: from the top edge to the bottom edge.
  const d3 = d - (pz + uz * h);
  const d4 = d - (pz - uz * h);
  const cxx = (f * (px - ux * h)) / d4 - (f * (px + ux * h)) / d3;
  const cyy = -((f * (py - uy * h)) / d4 - (f * (py + uy * h)) / d3);
  // A glyph seen from behind (the far arc of the ring) would be drawn mirrored: its down axis is turned round instead, so it reads the right
  // way and upside down, as text on the far side of a plate does. (The determinant is positive for a glyph that faces the viewer.)
  const flip = ax * cyy - ay * cxx < 0 ? -1 : 1;
  out.x[n] = x;
  out.y[n] = y;
  out.a[n] = ax;
  out.b[n] = ay;
  out.c[n] = cxx * flip;
  out.d[n] = cyy * flip;
  out.code[n] = code;
  // Behind the horizon's plane (z = 1 / d): the planet may stand in front of it; before it nothing can (see the header).
  out.back[n] = pz * d < 1 ? 1 : 0;
  if (x < out.minX) out.minX = x;
  if (x > out.maxX) out.maxX = x;
  if (y < out.minY) out.minY = y;
  if (y > out.maxY) out.maxY = y;
  const emPx = Math.max(Math.hypot(ax, ay), Math.hypot(cxx, cyy));
  if (emPx > out.maxEmPx) out.maxEmPx = emPx;
}

/* ------------------------------------------------------------------ the ring (A) */

export interface RingPlaceArgs {
  /** The line that goes round (capitals, separators, the closing one): glyph k carries character `k mod length`. */
  text: string;
  /** Times the line goes round, and the em in planet radii and the tracking that make it close (`ringLayout`, engine/ring.ts). */
  repeats: number;
  emR: number;
  /** The ring's turn, radians. */
  phase: number;
  cam: OrbitCam;
}

/** Radius of the ring's baseline, in planet radii. */
export const ringBaselineRadius = (): number => 1 + RING.gap;

/**
 * Place the glyphs of the ring for one frame. The ring is a band of type standing on a circle of radius `1 + RING.gap` planet radii, in a plane that
 * contains the view's horizontal axis, tipped by `RING.tiltDeg` so that its top goes away from the viewer, then rolled by `RING.rollDeg` about the
 * view axis. The letters are printed on the OUTSIDE of the band: their tops point along the plane's normal (so they stand, and stay legible however
 * the plane is tipped), they read counter-clockwise on the screen along the near arc, upright there, and the far arc is seen from behind, as on a
 * transparent bracelet: mirrored where it is not hidden behind the planet (a sliver at the sides). Glyph k is at the angle `phase + k step`,
 * counted counter-clockwise from the near point. Returns the glyph count.
 */
export function placeRing(out: GlyphSet, p: RingPlaceArgs): number {
  const L = p.text.length;
  const M = L * Math.max(1, p.repeats);
  out.ensure(M);
  out.reset();
  if (L === 0) return 0;
  const step = (2 * Math.PI) / M;
  const tilt = RING.tiltDeg * DEG;
  const roll = RING.rollDeg * DEG;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const rho = ringBaselineRadius();
  // The plane's normal (the letters' up), before the roll: E x N = (0, sin tilt, cos tilt); after it (-sin tilt sin roll, sin tilt cos roll, cos tilt).
  const ux = -st * sr;
  const uy = st * cr;
  const uz = ct;
  let n = 0;
  for (let k = 0; k < M; k++) {
    const code = p.text.charCodeAt(k % L);
    if (code === 32) continue;
    const a = p.phase + k * step;
    const sa = Math.sin(a);
    const ca = Math.cos(a);
    // In the plane (before the roll): centre = rho (sa, -ca ct, ca st); reading = (ca, sa ct, -sa st).
    const X = rho * sa;
    const Y = -rho * ca * ct;
    const Z = rho * ca * st;
    const rx = ca;
    const ry = sa * ct;
    const rz = -sa * st;
    put(out, n, p.cam, code, X * cr - Y * sr, X * sr + Y * cr, Z, rx * cr - ry * sr, rx * sr + ry * cr, rz, ux, uy, uz, p.emR);
    n++;
  }
  out.count = n;
  return n;
}

/** The ring's turn at `elapsedMs` of its own clock, radians (the speed and direction of `RING`). */
export function ringPhase(elapsedMs: number): number {
  return (RING.startDeg + RING.direction * RING.degPerSec * (elapsedMs / 1000)) * DEG;
}

/* ------------------------------------------------------------------ the band (B) */

/** One line of the band: the glyphs' codes and where each sits along the loop, in planet radii of arc from the line's origin. */
export interface BandLine {
  code: Uint16Array;
  /** Arc length of the glyph's centre from the line's origin (the centre of its reference phrase), planet radii of the line's own circle. */
  s: Float32Array;
  /** The line's latitude on the band, radians, and the cosine that turns arc length into angle. */
  lambda: number;
  cosL: number;
}

export interface BandLayout {
  /** The em of the type in planet radii. */
  em: number;
  lines: BandLine[];
}

/** The arc of the shell the band lines at the latitude `lambda` go round: its circumference in planet radii. */
export const bandLoop = (lambda: number): number => 2 * Math.PI * RING.band.radius * Math.cos(lambda);

/**
 * Lay the caption out once (per face and viewport): `phrases` in capitals joined by the separator, set on `RING.band.lines` lines that all go round
 * the whole planet, line i with phrase `i mod n` at the origin (so at phase 0 the front shows the phrases one under the other: the static composition,
 * and while the band slides the lines swap them). `advance(ch)` is the glyph's advance in em (measured from the font by the layer: this stays pure).
 * The em is `RING.band.emR`, or less when the loop would not fit with `RING.band.minGapEm` of air at the seam; what is left of the loop after the
 * text is spread over the separators, so every line closes round the planet exactly.
 */
export function layoutBand(phrases: readonly string[], advance: (ch: string) => number, separator: string = RING.band.separator): BandLayout {
  const parts = phrases.map((p) => p.trim().toLocaleUpperCase("en")).filter((p) => p.length > 0);
  const lineCount = Math.max(1, RING.band.lines);
  const empty: BandLayout = { em: RING.band.emR, lines: [] };
  if (parts.length === 0) return empty;
  const sepAdv = [...separator].reduce((s, ch) => s + advance(ch), 0);
  const phraseAdv = parts.map((p) => [...p].reduce((s, ch) => s + advance(ch), 0));
  const natural = phraseAdv.reduce((s, v) => s + v, 0) + parts.length * sepAdv; // em of one loop of text, a separator after every phrase
  const spread = (lineCount - 1) / 2;
  // Line 0 is the top one. The lines are centred on the latitude where the axis' circle crosses the view's centre (`bandCentre`), not on the equator of the axis.
  const lambdas = Array.from({ length: lineCount }, (_, i) => bandCentre() + (spread - i) * lineGapRad());
  // The shortest loop (the line furthest from the equator) decides the size.
  const shortest = Math.min(...lambdas.map(bandLoop));
  const em = Math.min(RING.band.emR, (shortest - RING.band.minGapEm * RING.band.emR) / natural);
  const lines: BandLine[] = lambdas.map((lambda, li) => {
    const cosL = Math.cos(lambda);
    const loop = bandLoop(lambda);
    const slack = Math.max(0, loop - natural * em);
    const extra = slack / parts.length; // spread over the separators
    const codes: number[] = [];
    const s: number[] = [];
    let at = 0; // arc length from the loop's start
    let origin = 0;
    // The phrases from the line's reference phrase round to the one before it, so the reference starts the loop... then re-centred below.
    const order = parts.map((_, i) => i);
    const ref = li % parts.length;
    for (const pi of order) {
      const start = at;
      for (const ch of parts[pi]!) {
        const w = advance(ch) * em;
        codes.push(ch.charCodeAt(0));
        s.push(at + w / 2);
        at += w;
      }
      if (pi === ref) origin = (start + at) / 2;
      for (const ch of separator) {
        const w = advance(ch) * em;
        if (ch !== " ") {
          codes.push(ch.charCodeAt(0));
          s.push(at + w / 2);
        }
        at += w;
      }
      at += extra;
    }
    return { code: Uint16Array.from(codes), s: Float32Array.from(s.map((v) => v - origin)), lambda, cosL };
  });
  return { em, lines };
}

/**
 * The latitude, on the band's axis, of the circle that passes through the view's centre in front: for an axis leaned by `leanDeg` toward the
 * viewer the equator's nearest point is that many degrees above (below, for a negative lean) the view's centre, so the lines are centred on the
 * latitude equal to the lean and the caption is where the planet's face is, arching round it; `riseDeg` takes it higher on the face (the upper
 * half of the planet, as in the reference, and clear of the hero's own text below).
 */
export const bandCentre = (): number => (RING.band.leanDeg + RING.band.riseDeg) * DEG;

/** The angular gap between two lines of the band, radians: one line height (`RING.band.leading` em) at the em the caption has. */
function lineGapRad(): number {
  return (RING.band.leading * RING.band.emR) / RING.band.radius;
}

/**
 * Place the band's glyphs for one frame. Each line is a circle on the shell of radius `RING.band.radius` round an axis that is the view's vertical,
 * leaned by `RING.band.leanDeg` towards the viewer (so the lines arch) and rolled by `RING.band.rollDeg`; the letters face outward, stand
 * on the line with their tops towards the axis' north, and read to the right as they pass in front. Glyph `m` is at `phase + s_m / (r cos(lambda))`
 * round the axis (0 is the point nearest the viewer). Glyphs on the far side are not placed at all: seen through the planet they would read in
 * mirror, and they are never more than a sliver beyond the limb.
 */
export function placeBand(out: GlyphSet, layout: BandLayout, phase: number, cam: OrbitCam): number {
  let total = 0;
  for (const l of layout.lines) total += l.code.length;
  out.ensure(total);
  out.reset();
  const lean = RING.band.leanDeg * DEG;
  const roll = RING.band.rollDeg * DEG;
  // The axis: the view's north rolled, then leaned toward the viewer.
  let Ax = -Math.sin(roll) * Math.cos(lean);
  let Ay = Math.cos(roll) * Math.cos(lean);
  let Az = Math.sin(lean);
  const al = Math.hypot(Ax, Ay, Az);
  Ax /= al;
  Ay /= al;
  Az /= al;
  // e1: the direction nearest the viewer, perpendicular to the axis; e2 = A x e1 (the way the text reads).
  let e1x = -Az * Ax;
  let e1y = -Az * Ay;
  let e1z = 1 - Az * Az;
  const el = Math.hypot(e1x, e1y, e1z);
  e1x /= el;
  e1y /= el;
  e1z /= el;
  const e2x = Ay * e1z - Az * e1y;
  const e2y = Az * e1x - Ax * e1z;
  const e2z = Ax * e1y - Ay * e1x;
  const sigma = RING.band.radius;
  let n = 0;
  for (const line of layout.lines) {
    const cl = line.cosL;
    const sl = Math.sin(line.lambda);
    for (let m = 0; m < line.code.length; m++) {
      const a = phase + line.s[m]! / (sigma * cl);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // Radial direction on the equator of the axis, then the point on the line's circle.
      const Rx = ca * e1x + sa * e2x;
      const Ry = ca * e1y + sa * e2y;
      const Rz = ca * e1z + sa * e2z;
      const Px = sigma * (cl * Rx + sl * Ax);
      const Py = sigma * (cl * Ry + sl * Ay);
      const Pz = sigma * (cl * Rz + sl * Az);
      // Facing away from the viewer or beyond the limb's plane: not drawn.
      if (Pz < 0) continue;
      // Reading direction T = A x R, up U = -sin(lambda) R + cos(lambda) A (the meridian).
      const Tx = Ay * Rz - Az * Ry;
      const Ty = Az * Rx - Ax * Rz;
      const Tz = Ax * Ry - Ay * Rx;
      const Ux = -sl * Rx + cl * Ax;
      const Uy = -sl * Ry + cl * Ay;
      const Uz = -sl * Rz + cl * Az;
      put(out, n, cam, line.code[m]!, Px, Py, Pz, Tx, Ty, Tz, Ux, Uy, Uz, layout.em);
      n++;
    }
  }
  out.count = n;
  return n;
}

/** The band's turn at `elapsedMs` of its own clock, radians: the caption slides to the left as it passes in front (its reading direction is the other way). */
export function bandPhase(elapsedMs: number): number {
  return (RING.band.startDeg - RING.band.degPerSec * (elapsedMs / 1000)) * DEG;
}

/* ------------------------------------------------------------------ how much room it takes */

/**
 * How far the ring reaches from the planet's centre on the screen, CSS px, when the planet's silhouette has the radius `rPx` in a viewport
 * `height` px tall: the largest x and y distance over the baseline circle plus a cap's height (its outside edge is the baseline; the glyphs
 * stand inward) and `padEmPx` of room. A perspective sampling (48 points): the near arc is bigger than the far one.
 */
export function ringReach(rPx: number, height: number): { x: number; yUp: number; yDown: number } {
  const z = silhouetteZoomFor(rPx, height);
  const cam = { d: z.d, f: z.f, cx: 0, cy: 0 };
  const tilt = RING.tiltDeg * DEG;
  const roll = RING.rollDeg * DEG;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const rho = ringBaselineRadius();
  let x = 0;
  let up = 0;
  let down = 0;
  const N = 48;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * 2 * Math.PI;
    const X = rho * Math.sin(a);
    const Y = -rho * Math.cos(a) * ct;
    const Z = rho * Math.cos(a) * st;
    const px = X * cr - Y * sr;
    const py = X * sr + Y * cr;
    const depth = cam.d - Z;
    const sx = (cam.f * px) / depth;
    const sy = (cam.f * py) / depth; // up is positive here
    x = Math.max(x, Math.abs(sx));
    up = Math.max(up, sy);
    down = Math.max(down, -sy);
  }
  return { x, yUp: up, yDown: down };
}

/** The camera distance and focal length at which the silhouette has radius `rPx` in a viewport `height` tall. */
function silhouetteZoomFor(rPx: number, height: number): { d: number; f: number } {
  const f = height / 2 / Math.tan((FOV_DEG * DEG) / 2);
  const d = Math.sqrt((f / Math.max(1e-6, rPx)) ** 2 + 1);
  return { d, f };
}

/**
 * The lowest zoom the camera may go to with the orbiting type: the planet and the whole ring (its baseline circle, a letter's height and a glyph
 * of room) inside the free area with `RING.zoom.fitMargin` of its half-sides empty, never less than `RING.zoom.floorBelowFit` levels below the
 * whole-globe fit `fit`. `height` is the viewport's (it sets the focal length), `freeWidth` the width the globe is centred in. The highest zoom
 * that satisfies the room (the ring grows with the planet: bisection).
 */
export function ringFloorZoom(a: { fit: number; freeWidth: number; height: number }): number {
  const { fit, freeWidth, height } = a;
  const roomX = (freeWidth / 2) * (1 - RING.zoom.fitMargin);
  const roomY = (height / 2) * (1 - RING.zoom.fitMargin);
  const t = RING.type.targetEmPx;
  const fits = (zoom: number): boolean => {
    const r = silhouetteRadiusPx(zoom, height);
    const reach = ringReach(r, height);
    const pad = t * (1 + RING.type.emSlack) * 0.5 + t;
    return reach.x + pad <= roomX && Math.max(reach.yUp, reach.yDown) + pad <= roomY && r <= Math.min(roomX, roomY);
  };
  let lo = fit - 8;
  let hi = fit;
  if (fits(hi)) return Math.min(hi, fit - RING.zoom.floorBelowFit);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return Math.min(lo, fit - RING.zoom.floorBelowFit);
}

/**
 * How present the type is, 0..1, from the zoom: 0 at the whole-globe fit `fit` and above (and when there is no room below it), 1 from
 * `RING.zoom.fade.to` of the way down to the lowest zoom `floor`, a smoothstep between `fade.from` and `fade.to`. Monotonic, a function of the
 * zoom alone: a planet too big for the ring has none.
 */
export function orbitZoomAlpha(zoom: number, fit: number, floor: number): number {
  const span = fit - floor;
  if (!(span > 1e-6)) return 0;
  const t = clamp((fit - zoom) / span, 0, 1);
  const { from, to } = RING.zoom.fade;
  const u = clamp((t - from) / (to - from), 0, 1);
  return u * u * (3 - 2 * u);
}
