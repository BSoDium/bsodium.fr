/** Pure vertex-buffer builders (plain typed arrays, no three.js) so they can be unit tested in node. */
import type { Polylines } from "@catalyst/geodata";
import { DEG, lonLatToVec3 } from "./geo";

/**
 * Longest straight chord (degrees of arc) a polyline segment may have on the sphere. A GL line is a straight chord
 * through the globe, so a long segment dips BELOW the surface by `1 - cos(arc / 2)`: with the globe's disc at radius 0.998
 * (`OCCLUDER_RADIUS`, which hides the far side) anything longer than about 7 degrees sinks into the disc in its middle and is
 * cut away there, leaving only its ends. The simplified border data has such segments (the 49th parallel is one straight
 * 40 degree segment, the Alaska-Canada border a 10 degree one), which is why borders used to vanish in the middle from far
 * away and flicker as the camera moved. Every segment is therefore cut into pieces of at most this many degrees, along the
 * line in lon/lat (the parallel or meridian the data means, the same line the street map draws), so each piece's sag is
 * under 4e-5, fifty times less than the gap to the disc.
 */
export const MAX_CHORD_DEG = 1;

/** Number of pieces a segment between two lon/lat points is cut into so that no piece spans more than `maxStepDeg` of arc. */
export function segmentPieces(lon0: number, lat0: number, lon1: number, lat1: number, maxStepDeg: number = MAX_CHORD_DEG): number {
  const a = lonLatToVec3(lon0, lat0);
  const b = lonLatToVec3(lon1, lat1);
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // The arc of the straight lon/lat line is at least the great-circle one and at most the lon/lat distance: use the larger.
  const arc = Math.max(Math.acos(Math.min(1, Math.max(-1, dot))) / DEG, Math.min(Math.abs(lon1 - lon0) * Math.cos(((lat0 + lat1) / 2) * DEG), 360));
  return Math.max(1, Math.ceil(arc / maxStepDeg));
}

/** Polylines (lon/lat degrees) to line-segment pairs on a sphere of the given radius; long segments are cut (`MAX_CHORD_DEG`). */
export function polylinesToSegments(p: Polylines, radius: number, maxStepDeg: number = MAX_CHORD_DEG): Float32Array {
  const pieces = (k: number) => segmentPieces(p.positions[k * 2]!, p.positions[k * 2 + 1]!, p.positions[k * 2 + 2]!, p.positions[k * 2 + 3]!, maxStepDeg);
  let segments = 0;
  for (let i = 0; i < p.offsets.length - 1; i++) {
    const end = p.offsets[i + 1]! - 1;
    for (let k = p.offsets[i]!; k < end; k++) segments += pieces(k);
  }
  const out = new Float32Array(segments * 6);
  let o = 0;
  const put = (lon: number, lat: number) => {
    const v = lonLatToVec3(lon, lat);
    out[o++] = v[0] * radius;
    out[o++] = v[1] * radius;
    out[o++] = v[2] * radius;
  };
  for (let i = 0; i < p.offsets.length - 1; i++) {
    const end = p.offsets[i + 1]! - 1;
    for (let k = p.offsets[i]!; k < end; k++) {
      const lon0 = p.positions[k * 2]!;
      const lat0 = p.positions[k * 2 + 1]!;
      const lon1 = p.positions[k * 2 + 2]!;
      const lat1 = p.positions[k * 2 + 3]!;
      const n = pieces(k);
      for (let j = 0; j < n; j++) {
        const t0 = j / n;
        const t1 = (j + 1) / n;
        if (j === 0) put(lon0, lat0);
        else put(lon0 + (lon1 - lon0) * t0, lat0 + (lat1 - lat0) * t0);
        if (j === n - 1) put(lon1, lat1);
        else put(lon0 + (lon1 - lon0) * t1, lat0 + (lat1 - lat0) * t1);
      }
    }
  }
  return out;
}

/** Meridians and parallels every `stepDeg`, sampled every `sampleDeg`, as segment pairs on the unit sphere. */
export function graticuleSegments(stepDeg: number, sampleDeg: number): Float32Array {
  const pts: number[] = [];
  const push = (lon: number, lat: number) => pts.push(...lonLatToVec3(lon, lat));
  for (let lon = -180; lon < 180; lon += stepDeg) {
    for (let lat = -90 + sampleDeg; lat <= 90 - sampleDeg + 1e-6; lat += sampleDeg) {
      push(lon, lat - sampleDeg);
      push(lon, lat);
    }
  }
  for (let lat = -90 + stepDeg; lat < 90; lat += stepDeg) {
    for (let lon = -180; lon < 180; lon += sampleDeg) {
      push(lon, lat);
      push(lon + sampleDeg, lat);
    }
  }
  return Float32Array.from(pts);
}
