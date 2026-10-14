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
import { GRATICULE_STEP_DEG } from "./geometry";
import { clamp, DEG } from "./geo";

/* ------------------------------------------------------------------ the face */

/**
 * The one face: Newsreader (the site's reading serif, self-hosted, already on the page for the intro: no file of its own, no licence added). A
 * literary serif, outlined, at the display optical size (the canvas applies `font-optical-sizing: auto` at the large size it is drawn at).
 */
export const CAPTION_FACE = {
  family: '"Newsreader Variable"',
  /** Fallback stack when the face has not arrived or cannot be had. */
  fallback: 'Georgia, "Times New Roman", serif',
  weight: 500,
  /** Cap height and x-height over the em, as the face sets them. */
  capEm: 0.66,
  /** The line box in caps: above the baseline (ascenders, with the outline) and below it (descenders, with the outline). */
  above: 1.3,
  below: 0.45,
  /** Tracking, em. */
  tracking: 0.005,
} as const;

/** `?orbit-pixel=0|1` (or sessionStorage "orbit-pixel"): 1 draws the caption in the globe's pixel pass, 0 crisp (depth-tested against the globe). Null: the page's choice. */
export function captionPixelFrom(search: string, stored: string | null): boolean | null {
  const want = new URLSearchParams(search).get("orbit-pixel") ?? stored;
  return want === "1" ? true : want === "0" ? false : null;
}

/* ------------------------------------------------------------------ geometry */

/** The latitude `lat` (degrees) on the nearest multiple of `step`. */
export const snapLat = (lat: number, step: number): number => Math.round(lat / step) * step;

/** One line of the caption, laid out. */
export interface CaptionLine {
  text: string;
  /** The logical line it belongs to (a wrapped line has two pieces). */
  parent: number;
  /** Latitude of its baseline, degrees: a real parallel. */
  baseLat: number;
  /** Cap height and em in planet radii. */
  capR: number;
  emR: number;
  /** Half the line's width in longitude, radians (the text is centred on the central meridian). */
  halfSpan: number;
  /** The band's latitude extent, radians, below and above the baseline. */
  below: number;
  above: number;
  /** The text's width in ems, as the face sets it. */
  widthEm: number;
}

export interface CaptionLayout {
  lines: CaptionLine[];
  /** The step the baselines are spaced by, degrees (the graticule's, or half of it when the lines are wrapped), and whether lines were wrapped. */
  stepDeg: number;
  wrapped: boolean;
}

export interface LayoutInput {
  /** The logical lines. */
  texts: readonly string[];
  /** A text's width in ems (measured from the face). */
  measure(text: string): number;
  /** The planet's radius at the lowest zoom, CSS px (the least size a letter may have is in CSS px). */
  rPx: number;
  /** The view's latitude, degrees: the block sits `CAPTION.aboveDeg` above it, on a graticule parallel. */
  viewLat: number;
}

/** A line cut in two where it reads best: the delimiter nearest its middle (" · ", ". ", ", "), else the space nearest it; null when it has none. */
export function splitLine(text: string): [string, string] | null {
  const mid = text.length / 2;
  let best: { at: number; cut: number; dist: number } | null = null;
  for (const [delim, keep] of [[" \u00b7 ", 0], [". ", 1], [", ", 1], [" ", 0]] as const) {
    let from = 0;
    for (;;) {
      const k = text.indexOf(delim, from);
      if (k < 0) break;
      const at = k + keep; // where the first piece ends (a full stop or a comma stays with it)
      const d = Math.abs(at - mid);
      // a better delimiter beats a nearer plain space only when it is not far from the middle
      const rank = delim === " " ? d + text.length * 0.12 : d;
      if (at > 0 && at < text.length - 1 && (best === null || rank < best.dist)) best = { at, cut: k + delim.length, dist: rank };
      from = k + 1;
    }
  }
  if (!best) return null;
  const a = text.slice(0, best.at).trim();
  const b = text.slice(best.cut).trim();
  return a && b ? [a, b] : null;
}

/** The latitude of the top baseline for a view at `viewLat`: the nearest multiple of half the graticule's step to `viewLat + above`, kept inside `topLat`. */
export const topLatitude = (viewLat: number, above: number = CAPTION.aboveDeg): number => clamp(snapLat(viewLat + above, GRATICULE_STEP_DEG / 2), CAPTION.topLat.min, CAPTION.topLat.max);

/** Arc width of a text in longitude (radians) on the parallel at `lat` (degrees) for a cap height `capR`. */
const spanOf = (widthEm: number, capR: number, lat: number): number => (widthEm * capR) / CAPTION_FACE.capEm / (CAPTION.radius * Math.cos(clamp(lat, -85, 85) * DEG));

/**
 * Lay the lines out, top to bottom, on real parallels. The top baseline is the multiple of 7.5 degrees nearest `viewLat + aboveDeg`; each line is
 * below the one before by the least multiple of the step (the graticule's 15 degrees; 7.5 when wrapped, on a small screen) that holds its cap
 * height, a descender and a gap: a baseline is on a dotted parallel of the globe or midway between two. A line's cap height is its logical line's `capR` (the call to action is the
 * biggest), shrunk until it spans no more than `maxSpanDeg` of its parallel; if that leaves any letter under `minCapPx` the layout is the small
 * screen's: the caps are brought up to `wrapCapPx`, the block starts higher and the lines still too long are cut in two.
 */
export function layoutCaption(input: LayoutInput): CaptionLayout {
  const place = (wrap: boolean): CaptionLayout => {
    const step = wrap ? GRATICULE_STEP_DEG / 2 : GRATICULE_STEP_DEG;
    // (wrapped, on a small screen, the block starts higher: the lower half of the face is under the page's own text)
    const top = topLatitude(input.viewLat, wrap ? CAPTION.aboveWrappedDeg : CAPTION.aboveDeg);
    // A wrapped layout is the small-screen one: the caps are brought UP to the least size (the lines are shorter, so they can be bigger), and only
    // the lines that would still be under it are cut in two.
    const targetOf = (parent: number) => {
      const t = CAPTION.capR[Math.min(parent, CAPTION.capR.length - 1)]!;
      return wrap ? Math.max(t, CAPTION.wrapCapPx / input.rPx) : t;
    };
    const capOf = (text: string, parent: number) => {
      const t = targetOf(parent);
      const span = spanOf(input.measure(text), t, top);
      return span > CAPTION.maxSpanDeg * DEG ? (t * CAPTION.maxSpanDeg * DEG) / span : t;
    };
    const pieces: { text: string; parent: number }[] = [];
    input.texts.forEach((t, parent) => {
      const cut = wrap && capOf(t, parent) * input.rPx < CAPTION.minCapPx - 1e-6 ? splitLine(t) : null;
      if (cut) pieces.push({ text: cut[0], parent }, { text: cut[1], parent });
      else pieces.push({ text: t, parent });
    });
    const lines: CaptionLine[] = [];
    let lat = top;
    pieces.forEach((p, i) => {
      const target = targetOf(p.parent);
      const widthEm = input.measure(p.text);
      let capR = target;
      const span = spanOf(widthEm, capR, lat);
      if (span > CAPTION.maxSpanDeg * DEG) capR *= (CAPTION.maxSpanDeg * DEG) / span;
      if (i > 0) {
        // the room the line needs under the one before: its own caps, the descenders of the one before, a gap
        const prev = lines[i - 1]!;
        // (a descender seldom reaches the band's own bottom edge, which has the outline's room too)
        const needDeg = capR / CAPTION.radius / DEG + (0.8 * prev.below) / DEG + CAPTION.gapDeg;
        lat = prev.baseLat - Math.max(step, Math.ceil(needDeg / step - 1e-9) * step);
      }
      const capLat = capR / CAPTION.radius;
      lines.push({
        text: p.text,
        parent: p.parent,
        baseLat: lat,
        capR,
        emR: capR / CAPTION_FACE.capEm,
        halfSpan: spanOf(widthEm, capR, lat) / 2,
        below: capLat * CAPTION_FACE.below,
        above: capLat * CAPTION_FACE.above,
        widthEm,
      });
    });
    return { lines, stepDeg: step, wrapped: wrap };
  };
  const flat = place(false);
  const tooSmall = flat.lines.some((l) => l.capR * input.rPx < CAPTION.minCapPx);
  if (!tooSmall) return flat;
  const wrapped = place(true);
  return wrapped.lines.length > flat.lines.length ? wrapped : flat;
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
  const cols = nu + 1;
  const perSlice = cols * 2;
  const positions = new Float32Array(slices * perSlice * 3);
  const uvs = new Float32Array(slices * perSlice * 2);
  const layers = new Float32Array(slices * perSlice);
  const indices = new Uint16Array(slices * nu * 6);
  const p: [number, number, number] = [0, 0, 0];
  const lo = line.baseLat - line.below / DEG;
  const hi = line.baseLat + line.above / DEG;
  let t = 0;
  for (let s = 0; s < slices; s++) {
    const k = slices === 1 ? 1 : s / (slices - 1);
    const rs = r - depth * (1 - k);
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < cols; i++) {
        const u = i / nu;
        parallelPoint(-line.halfSpan + 2 * line.halfSpan * u, j === 0 ? lo : hi, rs, p);
        const n = s * perSlice + j * cols + i;
        positions[3 * n] = p[0];
        positions[3 * n + 1] = p[1];
        positions[3 * n + 2] = p[2];
        uvs[2 * n] = u;
        uvs[2 * n + 1] = j;
        layers[n] = k;
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
  return { positions, uvs, layers, indices };
}

/** Columns for a line: about every 2 degrees of longitude (the strip is flat between columns: the shell's sag is far under a pixel). */
export const bandColumns = (line: CaptionLine): number => clamp(Math.ceil((2 * line.halfSpan) / (2 * DEG)), 8, 120);

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

/** The turn `t` ms after leaving began, from `from`: on, the other way, behind the planet. */
export function leavingAngle(t: number, from: number, start: number): number {
  return from + (-start - from) * easeInCubic(t / CAPTION.leaveMs);
}

export type CaptionPhase = "hidden" | "in" | "out" | "rest";

/** The caption's clock: what it is doing and since when. `now` is any monotonic clock in ms. */
export class CaptionMotion {
  phase: CaptionPhase = "hidden";
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
      this.enterFrom = this.starts.map((s, i) => this.angle(now, i, s));
    }
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
  leave(now: number): void {
    if (this.phase === "hidden" || this.phase === "out") return;
    // each line goes on from where it is now (an entrance cut short keeps every line where it had got to)
    this.leaveAngles = this.starts.map((s, i) => this.angle(now, i, s));
    this.leaveStays = this.leaveAngles.map((a, i) => a >= (this.starts[i] ?? 0) - 1e-9);
    this.phase = "out";
    this.t0 = now;
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

  /** The turn of line `i` now, radians; its `start` is where it began. */
  angle(now: number, i: number, start: number): number {
    if (this.pinnedAngle !== null) return this.pinnedAngle;
    const k = this.order[i] ?? i;
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
