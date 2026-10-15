// Synthetic, fictional leg geometry for fixtures and measurements. No real route data: a great circle between two places
// bent by a smooth, seeded lateral wobble that is zero at both ends, then sampled every ~stepKm. Looks like a road or a
// railway at a glance, and is in no way a real one.
import { encodePolyline5 } from "../../../../packages/schemas/src/polyline.ts";

const DEG = Math.PI / 180;
const R = 6371.0088;

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const toVec = (lat, lon) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
const toLatLon = (v) => [Math.asin(Math.max(-1, Math.min(1, v[2]))) / DEG, Math.atan2(v[1], v[0]) / DEG];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
};

/** Points [lat, lon] from a to b (both [lat, lon]), about `stepKm` apart, wobbling by up to `wobble` of the distance. */
export function curvyPoints(a, b, { seed = 1, stepKm = 1.1, wobble = 0.045, bend = 0.06 } = {}) {
  const rnd = mulberry32(seed);
  const va = toVec(...a);
  const vb = toVec(...b);
  const omega = Math.acos(Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2])));
  const dist = omega * R;
  const n = Math.max(2, Math.ceil(dist / stepKm));
  const axis = norm(cross(va, vb));
  const lateralDir = (v) => norm(cross(axis, v)); // perpendicular to the great circle, on the sphere
  const waves = Array.from({ length: 4 }, (_, k) => ({ f: 2 + k * 3.1 + rnd() * 2, p: rnd() * 6.28, a: (rnd() * 0.7 + 0.3) / (k + 1) }));
  const side = rnd() < 0.5 ? -1 : 1;
  const sinO = Math.sin(omega);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const wa = sinO < 1e-9 ? 1 - t : Math.sin((1 - t) * omega) / sinO;
    const wb = sinO < 1e-9 ? t : Math.sin(t * omega) / sinO;
    let v = norm([wa * va[0] + wb * vb[0], wa * va[1] + wb * vb[1], wa * va[2] + wb * vb[2]]);
    const taper = Math.sin(Math.PI * t) ** 0.8;
    let off = side * bend * Math.sin(Math.PI * t);
    for (const w of waves) off += wobble * w.a * Math.sin(w.f * Math.PI * t * (1 + dist / 900) + w.p);
    off *= taper * dist; // km
    const l = lateralDir(v);
    const ang = off / R;
    v = norm([v[0] + l[0] * ang, v[1] + l[1] * ang, v[2] + l[2] * ang]);
    out.push(toLatLon(v));
  }
  out[0] = [...a];
  out[n] = [...b];
  return out;
}

export function curvyPolyline(a, b, opts) {
  return encodePolyline5(curvyPoints(a, b, opts));
}
