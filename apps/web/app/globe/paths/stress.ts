/**
 * Debug only (`?globe-debug&paths-stress=N`, like the semantic-zoom stress of `engine/lod-stress.ts`): N synthetic legs over the
 * whole planet, for measuring the cost of the paths layer. Seeded, fictional, no relation to any real route. The shape follows
 * the spike's pre-baked legs: most legs are roads of tens to hundreds of km at about 0.9 points per km, with a few rail, ferry,
 * walk and flight legs, in routes of about 11 legs. The first stop of the first route is `anchor` (a real place) when given.
 */
import type { GlobeLeg, GlobeRoute } from "../types";
import { encodePolyline5 } from "./polyline";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KM_PER_DEG = 111.195;

/** A wobbling line from a to b, one point per ~`stepKm` (flat-earth maths: legs are short), `[lon, lat, ...]`. */
function wobbleLine(a: { lat: number; lon: number }, b: { lat: number; lon: number }, stepKm: number, rnd: () => number): number[] {
  const dLat = b.lat - a.lat;
  const dLon = (b.lon - a.lon) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const km = Math.hypot(dLat, dLon) * KM_PER_DEG;
  const n = Math.max(2, Math.ceil(km / stepKm));
  const phase = rnd() * 6.28;
  const amp = 0.05 * Math.hypot(dLat, dLon);
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w = amp * Math.sin(Math.PI * t) * (Math.sin(phase + t * 9) + 0.4 * Math.sin(phase * 2 + t * 31));
    const lat = a.lat + dLat * t + (w * dLon) / (Math.hypot(dLat, dLon) || 1);
    const lon = a.lon + (b.lon - a.lon) * t - (w * dLat) / (Math.hypot(dLat, dLon) || 1) / Math.cos((a.lat * Math.PI) / 180);
    out.push(t === 1 ? b.lon : lon, t === 1 ? b.lat : lat);
  }
  out[0] = a.lon;
  out[1] = a.lat;
  return out;
}

export function stressRoutes(legCount: number, anchor?: { lat: number; lon: number }, seed = 11): GlobeRoute[] {
  const rnd = rng(seed);
  const routes: GlobeRoute[] = [];
  let left = legCount;
  let r = 0;
  while (left > 0) {
    const legsHere = Math.min(left, 6 + Math.floor(rnd() * 12));
    let at = r === 0 && anchor ? { ...anchor } : { lat: -50 + rnd() * 110, lon: -170 + rnd() * 340 };
    const points = [at];
    const legs: GlobeLeg[] = [];
    for (let i = 0; i < legsHere; i++) {
      const p = rnd();
      const mode: GlobeLeg["mode"] = p < 0.5 ? "road" : p < 0.7 ? "rail" : p < 0.78 ? "ferry" : p < 0.85 ? "walk" : p < 0.95 ? "flight" : "unknown";
      const km = mode === "flight" ? 800 + rnd() * 6000 : mode === "walk" ? 5 + rnd() * 25 : 15 + rnd() * rnd() * 700;
      const bearing = rnd() * Math.PI * 2;
      const next = {
        lat: Math.max(-70, Math.min(75, at.lat + (Math.cos(bearing) * km) / KM_PER_DEG)),
        lon: at.lon + (Math.sin(bearing) * km) / (KM_PER_DEG * Math.max(0.2, Math.cos((at.lat * Math.PI) / 180))),
      };
      next.lon = ((((next.lon + 180) % 360) + 360) % 360) - 180;
      legs.push(mode === "flight" || mode === "unknown" ? { mode } : { mode, polyline: encodePolyline5(wobbleLine(at, next, 1.1, rnd)) });
      points.push(next);
      at = next;
    }
    routes.push({ id: `stress-${r++}`, title: "stress", points, legs });
    left -= legsHere;
  }
  return routes;
}
