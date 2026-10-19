/**
 * Cursor-anchored zoom (pure, unit tested in `anchor.test.ts`): zooming keeps the geographic point under the pointer (or the pinch's midpoint) where it is on the
 * screen, the way Apple Maps does, instead of zooming into the centre.
 *
 * The camera model is `projectUnit` (engine/geo.ts): a perspective camera at distance `d` from the centre of the unit sphere, looking at it, `north` up. Here
 * `(u, v)` is a screen offset FROM THE PROJECTION CENTRE in CSS px, u to the right and v up (the centre is where the inset and the lift put it: the caller
 * subtracts it). With `rho2 = (u^2 + v^2) / f^2` the ray through the offset hits the sphere iff `1 - rho2 (d^2 - 1) >= 0`.
 *
 *   unproject  the surface point under (u, v) for a view: ray against the sphere.
 *   solve      the view centre that puts a given surface point under (u, v) for another zoom: closed form, no iteration. In the camera frame the point is
 *              `a east + b north + g centre` with `g = (d rho2 + sqrt(disc)) / (1 + rho2)` (the front root), `a = u (d - g) / f`, `b = v (d - g) / f`;
 *              "north is up" (the camera has no roll) then fixes the centre's longitude and latitude: with `H^2 = Px^2 + Pz^2` and `Kh = sqrt(H^2 - a^2)`,
 *              `lon' = lonP - atan2(a, Kh)` and `lat' = atan2(Py, Kh) - atan2(b, g)`. Only `atan2` of small and large numbers is used (no `acos` of a number
 *              near 1), so it stays exact to a fraction of a pixel up to the street map's maximum zoom (1e7 px per radian).
 *
 * Off the disc (the pointer beside the planet): the point is the one on the limb in that direction, and it is asked to stay under the pointer clamped into the
 * NEW silhouette, so the zoom never jumps and there is always a solution. If there is none anyway (it needs a latitude past the poles) the caller zooms about the
 * centre.
 */
import { DEG, cameraDistance, focalPx, lonLatToVec3, normalizeLon, vec3ToLonLat, viewBasis, type ViewState } from "./geo";

/** How much of the silhouette's radius (squared: of `1 / (d^2 - 1)`) an anchor may use: a point exactly on the limb has a degenerate solution. */
const LIMB_FRACTION = 0.99;

export interface Offset {
  /** To the right of the projection centre, CSS px. */
  u: number;
  /** Above the projection centre, CSS px. */
  v: number;
}

/** `offset` brought inside the silhouette (at `LIMB_FRACTION` of the squared limit): the same direction, a shorter reach. `onDisc` false when it had to move. */
export function clampToDisc(offset: Offset, zoom: number, height: number): Offset & { onDisc: boolean } {
  const d = cameraDistance(zoom, height);
  const f = focalPx(height);
  const reach = ((offset.u * offset.u + offset.v * offset.v) / (f * f)) * (d * d - 1);
  if (reach <= LIMB_FRACTION) return { ...offset, onDisc: true };
  const k = Math.sqrt(LIMB_FRACTION / reach);
  return { u: offset.u * k, v: offset.v * k, onDisc: false };
}

/** The surface point under the screen offset (clamped to the limb when it is off the disc), and whether the offset was on the disc. */
export function unprojectOffset(view: ViewState, height: number, offset: Offset): { lon: number; lat: number; onDisc: boolean } {
  const o = clampToDisc(offset, view.zoom, height);
  const basis = viewBasis(view, height);
  const { c, east, north, d, f } = basis;
  const rho2 = (o.u * o.u + o.v * o.v) / (f * f);
  const disc = Math.max(0, 1 - rho2 * (d * d - 1));
  const t = (d - Math.sqrt(disc)) / (1 + rho2);
  const k = d - t;
  const su = (t * o.u) / f;
  const sv = (t * o.v) / f;
  const p = vec3ToLonLat([
    k * c[0] + su * east[0] + sv * north[0],
    k * c[1] + su * east[1] + sv * north[1],
    k * c[2] + su * east[2] + sv * north[2],
  ]);
  return { lon: p.lon, lat: p.lat, onDisc: o.onDisc };
}

/** The view centre (lon, lat) that, at `zoom`, puts the surface point `at` under `offset`; null when there is none (no such point on the disc, or past the poles). */
export function solveCentre(at: { lon: number; lat: number }, offset: Offset, zoom: number, height: number): { lon: number; lat: number } | null {
  const d = cameraDistance(zoom, height);
  const f = focalPx(height);
  const rho2 = (offset.u * offset.u + offset.v * offset.v) / (f * f);
  const disc = 1 - rho2 * (d * d - 1);
  if (disc < 0) return null;
  const g = (d * rho2 + Math.sqrt(disc)) / (1 + rho2);
  const k = d - g;
  const a = (offset.u * k) / f;
  const b = (offset.v * k) / f;
  const p = lonLatToVec3(at.lon, at.lat);
  const khSq = p[0] * p[0] + p[2] * p[2] - a * a;
  if (khSq < -1e-12) return null;
  const kh = Math.sqrt(Math.max(0, khSq));
  const lat = (Math.atan2(p[1], kh) - Math.atan2(b, g)) / DEG;
  const lon = at.lon - Math.atan2(a, kh) / DEG;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90) return null;
  return { lon: normalizeLon(lon), lat };
}

/**
 * The view after zooming to `zoom` with the point under `offset` held on the screen, or null when the centre cannot follow (the caller then changes the zoom
 * only). The anchor is read from `view`; the zoom is the one asked for (clamp it before: this does not know the limits).
 */
export function anchorZoom(view: ViewState, zoom: number, height: number, offset: Offset): ViewState | null {
  const at = unprojectOffset(view, height, offset);
  const target = clampToDisc(offset, zoom, height);
  const centre = solveCentre(at, target, zoom, height);
  return centre ? { ...centre, zoom } : null;
}
