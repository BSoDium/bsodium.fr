/**
 * The ring of type: the pure maths (no DOM; unit tested in `ring.test.ts`). The drawing is engine/ring-layer.ts; the tuned numbers are `RING`
 * (engine/tuning.ts); docs/web-architecture.md, "Ring of type".
 *
 * Model. A circle of radius `RING.radiusRatio` earth radii, centred on the planet, lying in a plane the camera sees from `RING.elevationDeg`
 * above (0 = edge-on, 90 = face-on). It is expressed in VIEW space and does not follow the view's longitude and latitude: it is an object round
 * the planet that the camera sees from the same side whatever part of the earth is turned towards it, and it scales with the planet.
 *
 *   view space (earth radii, the camera at (0, 0, d) looking down -z, x right, y up)
 *   P(theta) = rho * (cos t, sin t * sin e, -sin t * cos e)       theta = 0 is the right-hand end, theta = -90 deg the arc nearest the camera
 *   screen   = centre + f * (X, -Y) / (d - Z)                      the globe's own perspective: the silhouette radius is f / sqrt(d^2 - 1)
 *
 * The text is set on the ring like text on a path: each glyph is a small plane with its x axis along the tangent (reading order = increasing
 * `theta`) and its up towards the planet, in the ring's own plane (`RING.lettering` "flat"; "standing" sets it on a band round the ring's axis
 * instead, which turns the glyphs edge-on at the two ends). It is drawn with the exact affine map of that plane at the glyph's centre
 * (`placeGlyphs`): the near arc is large and upright and reads left to right, the far arc is small and upside down (the ring seen from above),
 * and the ends are foreshortened along the way. A glyph of the far arc whose centre falls within the planet's silhouette is behind the planet
 * and is not drawn (the layer clips what is left of one at the edge).
 */
import { cameraDistance, clamp, DEG, focalPx, smoothstep } from "./geo";
import { rampLevel, roleLevel, type Role } from "./palette";
import { RING } from "./tuning";

/* ------------------------------------------------------------------ page flags */

/** Live switch (module state, like `SPIN` and `SKY_STATE`): `applyRingFlags` sets it from the page before the renderer is built. */
export const RING_STATE = { enabled: true };

/**
 * `?no-ring` (or sessionStorage "no-ring" = "1") switches the ring off on any page: the lowest zoom is then the whole-globe fit again, exactly as
 * before it existed. A page in debug mode (`?globe-debug`, what the browser checks run in) has it OFF by default, because their assertions
 * (the lowest zoom is the fit, zero rAF calls at rest, palette-only pixels) predate it; `?ring` (or sessionStorage "ring" = "1") turns it on there.
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

/**
 * How many times the line goes round the ring: the whole number that makes the glyphs' nominal em size (`PlaceArgs`: the size at the depth of
 * the ring's centre, which is what `placeGlyphs` hands the layer as `em`) nearest `RING.type.targetEmPx` (by ratio) at the lowest zoom, where
 * the camera has the focal length `f` and the distance `d`. A constant for a viewport (the ring's size changes with the zoom, the number of
 * letters does not: the type scales with the ring, like lettering on an object).
 */
export function ringRepeats(lineLength: number, f: number, d: number): number {
  if (lineLength <= 0) return 1;
  const advance = RING.type.advanceEm + RING.type.tracking;
  const perRepeat = (2 * Math.PI * RING.radiusRatio * f) / (d * lineLength * advance); // em px with one repeat
  const n0 = Math.max(1, Math.floor(perRepeat / RING.type.targetEmPx));
  const off = (n: number) => Math.abs(Math.log(perRepeat / n / RING.type.targetEmPx));
  return off(n0) <= off(n0 + 1) ? n0 : n0 + 1;
}

/* ------------------------------------------------------------------ projection */

const SIN_E = Math.sin(RING.elevationDeg * DEG);
const COS_E = Math.cos(RING.elevationDeg * DEG);
const FLAT = RING.lettering === "flat";

/** Half the ring's extent on the screen (CSS px) about its centre, perspective included: the ring's own glyph size not counted. */
export function ringHalfExtents(f: number, d: number, samples = 48): { hx: number; hy: number } {
  let hx = 0;
  let hy = 0;
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * 2 * Math.PI;
    const X = RING.radiusRatio * Math.cos(t);
    const Y = RING.radiusRatio * Math.sin(t) * SIN_E;
    const Z = -RING.radiusRatio * Math.sin(t) * COS_E;
    const k = f / (d - Z);
    hx = Math.max(hx, Math.abs(X * k));
    hy = Math.max(hy, Math.abs(Y * k));
  }
  return { hx, hy };
}

/**
 * The lowest zoom the camera may go to with the ring: the globe and its whole ring in the free area with `RING.zoom.fitMargin` of the smaller
 * half sides left empty (and a glyph's height of room), and never less than `RING.zoom.floorBelowFit` levels below the whole-globe fit `fit`.
 * Monotonic in the zoom (the ring only shrinks as the camera goes out), so a bisection. `height` is the viewport's (it sets the focal length);
 * `freeWidth` the width the globe is centred in.
 */
export function ringFloorZoom(a: { fit: number; freeWidth: number; height: number }): number {
  const { fit, freeWidth, height } = a;
  const pad = RING.type.targetEmPx * 1.6;
  const maxX = (freeWidth / 2) * (1 - RING.zoom.fitMargin);
  const maxY = (height / 2) * (1 - RING.zoom.fitMargin);
  const f = focalPx(height);
  const fits = (z: number) => {
    const d = cameraDistance(z, height);
    const e = ringHalfExtents(f, d);
    return e.hx + pad <= maxX && e.hy + pad <= maxY && f / Math.sqrt(d * d - 1) <= maxY;
  };
  let hi = fit - RING.zoom.floorBelowFit;
  if (fits(hi)) return hi;
  let lo = hi - 4;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * How present the ring is, 0..1, from the zoom: 0 at the whole-globe fit `fit` and above (and when there is no room below it), 1 from
 * `RING.zoom.fade.to` of the way down to the lowest zoom `floor`, a smoothstep between `fade.from` and `fade.to`. Monotonic, a function of the
 * zoom alone (no timer): zooming in fades it out and it is gone before the camera is back at the fit.
 */
export function ringAlpha(zoom: number, fit: number, floor: number): number {
  const span = fit - floor;
  if (!(span > 1e-6)) return 0;
  const t = clamp((fit - zoom) / span, 0, 1);
  const { from, to } = RING.zoom.fade;
  return smoothstep(clamp((t - from) / (to - from), 0, 1));
}

/** The palette level of the near (`front`) or far arc for a strength: a staircase of tones up to the role's level (a fade is a tone ramp, never a half-transparent grey), 0 = not drawn. */
export function ringTone(alpha: number, levels: number, arc: "front" | "back"): number {
  const role: Role = RING.tones[arc];
  return alpha > 0 ? rampLevel(alpha, roleLevel(role, levels)) : 0;
}

/* ------------------------------------------------------------------ glyphs */

/** The glyphs of one frame, as parallel arrays (no allocation per frame). Only drawn glyphs are in it. */
export class GlyphBuffer {
  /** Centre of the glyph, container CSS px. */
  x = new Float32Array(0);
  y = new Float32Array(0);
  /** The glyph's affine map (`CanvasRenderingContext2D.setTransform` order: a b c d, the translation is x y): local px at the nominal em -> screen px. */
  a = new Float32Array(0);
  b = new Float32Array(0);
  c = new Float32Array(0);
  d = new Float32Array(0);
  /** UTF-16 code of the character. */
  code = new Uint16Array(0);
  /** 1 on the near arc (in front of the planet's centre plane), 0 on the far arc. */
  front = new Uint8Array(0);
  /** Drawn glyphs. */
  count = 0;
  /** Nominal em size in local px (the font size to set: the matrices are relative to it). */
  em = 0;
  /** Extent of the whole ring's glyph centres (culled ones too), container CSS px. */
  minX = 0;
  maxX = 0;
  minY = 0;
  maxY = 0;

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
    this.front = new Uint8Array(cap);
  }
}

/** A glyph narrower than this (a fraction of its nominal width) is edge-on: not drawn. */
const EDGE_ON = 0.12;

export interface PlaceArgs {
  text: string;
  /** Times the line goes round (`ringRepeats`). */
  repeats: number;
  /** The ring's turn, radians. */
  phase: number;
  /** Focal length (`focalPx(height)`), CSS px, and the camera distance in earth radii (`cameraDistance`). */
  f: number;
  d: number;
  /** Centre of the planet on the container, CSS px. */
  cx: number;
  cy: number;
}

/**
 * Place the glyphs of the whole ring for one frame. Glyph k (of `repeats * text.length`, equal steps round) carries character `k mod length`,
 * at angle `phase + k * step` (reading order = increasing angle: left to right on the near arc). Spaces are not glyphs. Returns the count.
 * Pure: depends on its arguments only.
 */
export function placeGlyphs(out: GlyphBuffer, p: PlaceArgs): number {
  const L = p.text.length;
  const M = L * Math.max(1, p.repeats);
  out.ensure(M);
  out.count = 0;
  if (L === 0) return 0;
  const step = (2 * Math.PI) / M;
  // The em in earth radii: one glyph's advance (the arc between neighbours) is (0.6 + tracking) em.
  const em = (RING.radiusRatio * step) / (RING.type.advanceEm + RING.type.tracking);
  // World units per local px at the depth of the ring's centre: the matrices are relative to a nominal em of `em / s` px.
  const s = p.d / p.f;
  out.em = em / s;
  const rho = RING.radiusRatio;
  let n = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let k = 0; k < M; k++) {
    const t = p.phase + k * step;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const X = rho * ct;
    const Y = rho * st * SIN_E;
    const Z = -rho * st * COS_E;
    const depth = p.d - Z;
    const sx = p.cx + (X * p.f) / depth;
    const sy = p.cy - (Y * p.f) / depth;
    if (sx < minX) minX = sx;
    if (sx > maxX) maxX = sx;
    if (sy < minY) minY = sy;
    if (sy > maxY) maxY = sy;
    const code = p.text.charCodeAt(k % L);
    if (code === 32) continue;
    // The Jacobian of the projection at the glyph's centre, applied to the tangent (reading direction) and to the ring's normal (up).
    const j = (s * p.f) / (depth * depth);
    const tx = -st;
    const ty = ct * SIN_E;
    const tz = -ct * COS_E;
    const a = (tx * depth + X * tz) * j;
    const b = -(ty * depth + Y * tz) * j;
    if (Math.hypot(a, b) < EDGE_ON) continue;
    // The glyph's up: towards the planet within the ring's plane (flat lettering, text on a path: it never turns edge-on) or along the ring's axis
    // (standing lettering, text on a band: thins out at the ends).
    const ux = FLAT ? -ct : 0;
    const uy = FLAT ? -st * SIN_E : COS_E;
    const uz = FLAT ? st * COS_E : SIN_E;
    out.x[n] = sx;
    out.y[n] = sy;
    out.a[n] = a;
    out.b[n] = b;
    // Local +y is down the page: one px of it is one px of the glyph's up the other way.
    out.c[n] = -(ux * depth + X * uz) * j;
    out.d[n] = (uy * depth + Y * uz) * j;
    out.code[n] = code;
    out.front[n] = Z >= 0 ? 1 : 0;
    n++;
  }
  out.minX = minX;
  out.maxX = maxX;
  out.minY = minY;
  out.maxY = maxY;
  out.count = n;
  return n;
}

/** Whether a glyph's map is mirrored (seen from behind: the far arc). */
export const isMirrored = (a: number, b: number, c: number, d: number): boolean => a * d - b * c < 0;

/** The ring's turn at `elapsedMs` of its own clock, radians (the direction and speed of `RING`). */
export function ringPhase(elapsedMs: number): number {
  return (RING.startDeg + RING.direction * RING.degPerSec * (elapsedMs / 1000)) * DEG;
}
