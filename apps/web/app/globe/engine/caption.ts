/**
 * The caption: the pure maths (no DOM, no Three.js; unit tested in `caption.test.ts`). The Three.js objects are engine/caption-layer.ts; the tuned
 * numbers are `CAPTION` (engine/tuning.ts); docs/web-architecture.md, "Orbiting type".
 *
 * Model. A few lines of type wrap a sphere of radius `CAPTION.radius` (a little above the planet, which has radius 1) centred on the planet,
 * in the VIEW's frame (x right, y up, z toward the viewer), so the globe turning under the camera does not move them. Each line is a band of
 * constant latitude about an axis `A` that leans away from the viewer by `leanDeg` (which is what makes the lines arch like the reference's), and
 * has NO roll: at the central meridian the bands are horizontal on the screen. With `a` the longitude about `A` (0 is the meridian nearest the
 * viewer, positive to the right) and `lambda` the latitude:
 *
 *   P(a, lambda) = r (cos(lambda) (cos(a) e1 + sin(a) e2) + sin(lambda) A)          A = (0, cos l, sin l), e1 = (0, -sin l, cos l), e2 = (1, 0, 0)
 *
 * The geometry is built once; the entrance turns a band about `A` (a rotation: its matrix, nothing re-laid out). Because the shell is part of the
 * globe's scene it is drawn in the same art-pixel pass, hidden by the planet's depth where the planet is in front of it, and its back faces are
 * culled, so a letter past the horizon simply is not there (it can never be seen from behind, mirrored).
 */
import { CAPTION } from "./tuning";
import { clamp, DEG } from "./geo";

/* ------------------------------------------------------------------ the faces */

export type CaptionFont = "jacquard" | "pixelify" | "bitmap";

export interface CaptionFontSpec {
  /** Where the face is (self-hosted, `public/fonts`, the OFL licence beside it); null for the repo's own bitmap font. */
  url: string | null;
  family: string;
  weight: number;
  /** Cap height over the em (the size of a letter is set by its cap height, the faces differ so much in it). */
  capEm: number;
  /** The whole line box (above the capitals' top to below the descenders), in caps: the texture's height. */
  boxCaps: number;
  /** Set in capitals (a blackletter's capitals are for initials; a pixel face reads either way). */
  upper: boolean;
  /** Tracking, em. */
  tracking: number;
  /** The least cap height, in art cells, at which the face still reads (its strokes are a pixel of its own grid): below it the next face of the chain is used. */
  minCapCells: number;
}

export const CAPTION_FONTS: Record<CaptionFont, CaptionFontSpec> = {
  /** Jacquard 24 (The Soft Type Project Authors, SIL OFL 1.1): a pixel blackletter; subset of Basic Latin, `public/fonts/jacquard-24-1.002-latin-400.woff2` (18.9 kB). */
  jacquard: { url: "/fonts/jacquard-24-1.002-latin-400.woff2", family: "Jacquard 24", weight: 400, capEm: 750 / 1290, boxCaps: 2.3, upper: false, tracking: 0.02, minCapCells: 13 },
  /** Pixelify Sans (The Pixelify Sans Project Authors, SIL OFL 1.1), instanced at weight 700; Basic Latin, `public/fonts/pixelify-sans-1.000-latin-700.woff2` (3.9 kB). */
  pixelify: { url: "/fonts/pixelify-sans-1.000-latin-700.woff2", family: "Pixelify Sans", weight: 700, capEm: 0.7, boxCaps: 1.9, upper: true, tracking: 0.04, minCapCells: 12 },
  /** The map's own pixel font (engine/pixel-font), 7 px capitals, scaled up by a whole number: no file, no font load. */
  bitmap: { url: null, family: "Fusion Pixel", weight: 400, capEm: 0.7, boxCaps: 2, upper: true, tracking: 0, minCapCells: 7 },
};

/** The faces in the order a page falls back along when the face asked for would not read at its size (a phone's art cell is 2 px and its planet 60 cells across). */
export const CAPTION_FALLBACK: readonly CaptionFont[] = ["jacquard", "pixelify", "bitmap"];

/** The first face of the chain from `wanted` whose least cap height fits `capCells`; the bitmap font is the last resort and always taken. */
export function legibleFont(wanted: CaptionFont, capCells: number): CaptionFont {
  const chain = CAPTION_FALLBACK.slice(CAPTION_FALLBACK.indexOf(wanted));
  for (const f of chain) if (capCells >= CAPTION_FONTS[f].minCapCells) return f;
  return "bitmap";
}

/** The face used when the page does not choose (`?orbit-font=`). */
export const DEFAULT_CAPTION_FONT: CaptionFont = "jacquard";

/** `?orbit-font=jacquard|pixelify|bitmap` (or sessionStorage "orbit-font"), any page: the face the caption is set in. */
export function captionFontFrom(search: string, stored: string | null): CaptionFont {
  const want = new URLSearchParams(search).get("orbit-font") ?? stored;
  return want === "jacquard" || want === "pixelify" || want === "bitmap" ? want : DEFAULT_CAPTION_FONT;
}

/* ------------------------------------------------------------------ geometry */

/** One line of the caption, laid out. */
export interface CaptionLine {
  text: string;
  /** Latitude of the line's centre, radians, in the leaning frame. */
  lambda: number;
  /** Half the line's width in longitude, radians (the text is centred on the central meridian). */
  halfSpan: number;
  /** Half the band's height in latitude, radians. */
  halfLat: number;
  /** The text's width in ems, as the face sets it. */
  widthEm: number;
}

export interface CaptionLayout {
  /** The em in planet radii and the cap height in planet radii. */
  emR: number;
  capR: number;
  lines: CaptionLine[];
}

/** The shell's radius. */
export const shellRadius = (): number => CAPTION.radius;

/** The unit axis the lines go round (in the view's frame), and the two unit vectors that span its equator: `e1` nearest the viewer, `e2` to the right. */
export function bandFrame(leanRad: number = CAPTION.leanDeg * DEG) {
  const c = Math.cos(leanRad);
  const s = Math.sin(leanRad);
  return { A: [0, c, s] as const, e1: [0, -s, c] as const, e2: [1, 0, 0] as const };
}

/** A point of the shell at longitude `a` and latitude `lambda` (radians, in the leaning frame), in the view's frame. */
export function shellPoint(a: number, lambda: number, out: [number, number, number] = [0, 0, 0], leanRad: number = CAPTION.leanDeg * DEG): [number, number, number] {
  const { A, e1, e2 } = bandFrame(leanRad);
  const r = CAPTION.radius;
  const cl = Math.cos(lambda);
  const sl = Math.sin(lambda);
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  out[0] = r * (cl * (ca * e1[0] + sa * e2[0]) + sl * A[0]);
  out[1] = r * (cl * (ca * e1[1] + sa * e2[1]) + sl * A[1]);
  out[2] = r * (cl * (ca * e1[2] + sa * e2[2]) + sl * A[2]);
  return out;
}

/**
 * Lay the lines out. `widthEm` is each line's width in ems (measured from the face once); `capEm` the face's cap height over its em; `boxCaps` the
 * line box in cap heights. The cap height is `capRequested` (default `CAPTION.capR`), less when the widest line would span more than
 * `CAPTION.maxSpanDeg` of its circle.
 * Line i is `CAPTION.leading` cap heights under line i - 1, the block centred at latitude `CAPTION.centreDeg` + lean (the circle through the view's centre).
 */
export function layoutCaption(texts: readonly string[], widthsEm: readonly number[], capEm: number, boxCaps: number, capRequested: number = CAPTION.capR): CaptionLayout {
  const n = texts.length;
  const lean = CAPTION.leanDeg * DEG;
  const gapLat = (CAPTION.leading * capRequested) / CAPTION.radius;
  const lambdaAt = (i: number) => lean + CAPTION.centreDeg * DEG + ((n - 1) / 2 - i) * gapLat;
  // The widest line decides the size: its width in radii over the circle it goes round, at most `maxSpanDeg`.
  let capR = capRequested;
  for (let i = 0; i < n; i++) {
    const wR = (widthsEm[i]! * capR) / capEm;
    const circle = CAPTION.radius * Math.cos(lambdaAt(i));
    const span = wR / circle;
    if (span > CAPTION.maxSpanDeg * DEG) capR = Math.min(capR, (capR * CAPTION.maxSpanDeg * DEG) / span);
  }
  const emR = capR / capEm;
  const lines: CaptionLine[] = texts.map((text, i) => {
    const lambda = lambdaAt(i);
    const wR = widthsEm[i]! * emR;
    return {
      text,
      lambda,
      halfSpan: wR / (2 * CAPTION.radius * Math.cos(lambda)),
      halfLat: (boxCaps * capR) / (2 * CAPTION.radius),
      widthEm: widthsEm[i]!,
    };
  });
  return { emR, capR, lines };
}

export interface BandMesh {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}

/**
 * The strip of one line: `nu` columns along the longitude (the text's direction, left to right), `nv` rows along the latitude, wound
 * counter-clockwise seen from OUTSIDE (so the front faces are the ones the viewer sees and back-face culling removes the far side). The texture's
 * u runs along the longitude, v up the latitude (1 at the top).
 */
export function bandMesh(line: CaptionLine, nu: number, nv: number, leanRad: number = CAPTION.leanDeg * DEG): BandMesh {
  const cols = nu + 1;
  const rows = nv + 1;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices = new Uint16Array(nu * nv * 6);
  const p: [number, number, number] = [0, 0, 0];
  for (let j = 0; j < rows; j++) {
    const v = j / nv;
    // The bands are of constant latitude: a row is a circle about the axis.
    const lambda = line.lambda - line.halfLat + 2 * line.halfLat * v;
    for (let i = 0; i < cols; i++) {
      const u = i / nu;
      const a = -line.halfSpan + 2 * line.halfSpan * u;
      shellPoint(a, lambda, p, leanRad);
      const k = j * cols + i;
      positions[3 * k] = p[0];
      positions[3 * k + 1] = p[1];
      positions[3 * k + 2] = p[2];
      uvs[2 * k] = u;
      uvs[2 * k + 1] = v;
    }
  }
  let t = 0;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const v00 = j * cols + i;
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
  return { positions, uvs, indices };
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

/** A line turned by `theta` about the axis (positive: to the right) is entirely out of sight: its nearest edge is past the horizon. */
export const lineHidden = (theta: number, line: Pick<CaptionLine, "halfSpan">, d: number): boolean => Math.abs(theta) - line.halfSpan >= shellHorizon(d);

/* ------------------------------------------------------------------ the entrance */

/** Fast start, slow settle: 1 - 2^(-10 p), exactly 0 at 0 and 1 at 1. */
export const easeOutExpo = (p: number): number => (p >= 1 ? 1 : p <= 0 ? 0 : 1 - 2 ** (-10 * p));
/** Slow start, quick end. */
export const easeInCubic = (p: number): number => {
  const x = clamp(p, 0, 1);
  return x * x * x;
};

/** Where line `i` starts, east of its resting place, radians: far enough that all of it is behind the horizon of any camera the page has. */
export function entranceStart(line: Pick<CaptionLine, "halfSpan">): number {
  return Math.max(CAPTION.enter.fromDeg * DEG, 90 * DEG + line.halfSpan + 4 * DEG);
}

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

  /** Where each line starts (radians), set once the lines are laid out. */
  setStarts(starts: readonly number[]): void {
    this.starts = [...starts];
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
    if (this.pinned !== null) return enteringAngle(this.pinned, i, start);
    switch (this.phase) {
      case "hidden":
        return start;
      case "rest":
        return 0;
      case "in": {
        if (this.pending) return this.enterFrom?.[i] ?? start;
        const t = now - this.t0;
        const from = this.enterFrom?.[i];
        const a = from === undefined ? enteringAngle(t, i, start) : from * (1 - easeOutExpo(t / CAPTION.enter.ms));
        if (t >= entranceMs(this.starts.length || 1)) {
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
