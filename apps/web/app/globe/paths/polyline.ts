/**
 * Encoded polyline, precision 5 (docs/api-contract.md, "Route legs"): the decoder the globe and the street map use, and the
 * encoder the tests and the fixture generator use. Same format as `@catalyst/schemas` (`packages/schemas/src/polyline.ts`, the
 * reference the contract's checks run); a test pins the two together. Kept here so the client chunk does not pull in the schema library.
 */

/** Decodes to `[lon, lat, lon, lat, ...]` (the order every renderer here uses). `null` when it is not a polyline. */
export function decodePolyline5(encoded: string): Float64Array | null {
  const out: number[] = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  const n = encoded.length;
  const next = (): number | null => {
    let result = 0;
    let shift = 0;
    for (;;) {
      if (i >= n) return null;
      const c = encoded.charCodeAt(i++) - 63;
      if (c < 0 || c > 63) return null;
      result += (c & 0x1f) * 2 ** shift;
      shift += 5;
      if (shift > 35) return null;
      if (c < 0x20) break;
    }
    return result % 2 === 1 ? -(result + 1) / 2 : result / 2;
  };
  while (i < n) {
    const dLat = next();
    const dLon = next();
    if (dLat === null || dLon === null) return null;
    lat += dLat;
    lon += dLon;
    out.push(lon / 1e5, lat / 1e5);
  }
  return out.length >= 4 ? Float64Array.from(out) : null;
}

/** Encodes `[lon, lat, ...]` as a precision-5 polyline. */
export function encodePolyline5(lonLat: ArrayLike<number>): string {
  let out = "";
  let pLat = 0;
  let pLon = 0;
  const put = (delta: number) => {
    let v = delta < 0 ? -2 * delta - 1 : 2 * delta;
    while (v >= 0x20) {
      out += String.fromCharCode(((v % 0x20) | 0x20) + 63);
      v = Math.floor(v / 0x20);
    }
    out += String.fromCharCode(v + 63);
  };
  for (let i = 0; i + 1 < lonLat.length; i += 2) {
    const lon = Math.round(lonLat[i]! * 1e5);
    const lat = Math.round(lonLat[i + 1]! * 1e5);
    put(lat - pLat);
    put(lon - pLon);
    pLat = lat;
    pLon = lon;
  }
  return out;
}
