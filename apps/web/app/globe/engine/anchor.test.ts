import { describe, expect, it } from "vitest";
import { anchorZoom, clampToDisc, solveCentre, unprojectOffset } from "./anchor";
import { angularDistance, cameraDistance, focalPx, lonLatToVec3, projectLonLat, viewBasis, type ViewState } from "./geo";

/** Chord length on the unit sphere: exact for tiny angles (`angularDistance` is an acos, good to 1e-8 only). */
const chord = (a: { lon: number; lat: number }, b: { lon: number; lat: number }) => {
  const p = lonLatToVec3(a.lon, a.lat);
  const q = lonLatToVec3(b.lon, b.lat);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

const W = 1440;
const H = 900;
/** Where the surface point lands, as an offset from the projection centre (u right, v up), CSS px. */
function offsetOf(view: ViewState, lon: number, lat: number) {
  const p = projectLonLat(lon, lat, viewBasis(view, H), W, H, 1, 0, H / 2);
  return { u: p.x, v: H / 2 - p.y, visible: p.visible };
}

describe("unprojectOffset", () => {
  it("the centre of the projection is the view centre", () => {
    const p = unprojectOffset({ lon: 12, lat: 34, zoom: 3 }, H, { u: 0, v: 0 });
    expect(p.lon).toBeCloseTo(12, 9);
    expect(p.lat).toBeCloseTo(34, 9);
    expect(p.onDisc).toBe(true);
  });

  it("is the inverse of the projection", () => {
    const view = { lon: -40, lat: 20, zoom: 2.2 };
    for (const [u, v] of [[100, 50], [-150, 120], [120, -150], [0, 180]] as const) {
      const p = unprojectOffset(view, H, { u, v });
      const back = offsetOf(view, p.lon, p.lat);
      expect(back.u).toBeCloseTo(u, 6);
      expect(back.v).toBeCloseTo(v, 6);
    }
  });

  it("clamps an offset beyond the limb onto the disc and says so", () => {
    const view = { lon: 0, lat: 0, zoom: 1 };
    const p = unprojectOffset(view, H, { u: 5000, v: 0 });
    expect(p.onDisc).toBe(false);
    expect(Number.isFinite(p.lon) && Number.isFinite(p.lat)).toBe(true);
    // The limb point is on the equator, due east of the centre, at most 90 degrees away.
    expect(p.lat).toBeCloseTo(0, 6);
    expect(p.lon).toBeGreaterThan(0);
    expect(p.lon).toBeLessThan(90);
  });
});

describe("clampToDisc", () => {
  it("leaves an inside offset alone and shortens an outside one in its own direction", () => {
    expect(clampToDisc({ u: 10, v: 10 }, 3, H).onDisc).toBe(true);
    const o = clampToDisc({ u: 4000, v: 3000 }, 1, H);
    expect(o.onDisc).toBe(false);
    expect(o.v / o.u).toBeCloseTo(0.75, 9);
    expect(Math.hypot(o.u, o.v)).toBeLessThan(Math.hypot(4000, 3000));
  });
});

describe("anchorZoom: the point under the cursor stays under the cursor", () => {
  const views: ViewState[] = [
    { lon: 0, lat: 0, zoom: 1.2 },
    { lon: 106.7, lat: 10.8, zoom: 3.4 },
    { lon: 179.9, lat: 5, zoom: 2 },
    { lon: -179.95, lat: -33, zoom: 4.5 },
    { lon: 20, lat: 78, zoom: 2.5 },
    { lon: -70, lat: -80, zoom: 3 },
    { lon: 2.35, lat: 48.85, zoom: 9 },
    { lon: 2.35, lat: 48.85, zoom: 14.5 },
    { lon: 151.2, lat: -33.9, zoom: 17 },
  ];
  const cursors = [[0, 0], [150, -90], [-320, 200], [420, 260], [-60, -310]] as const;

  for (const view of views) {
    it(`view ${view.lon}, ${view.lat} at zoom ${view.zoom}`, () => {
      const d = cameraDistance(view.zoom, H);
      const f = focalPx(H);
      for (const [u0, v0] of cursors) {
        // Keep the cursor on the disc for this zoom (the whole-globe views are small on screen).
        const lim = (f / Math.sqrt(d * d - 1)) * 0.9;
        const k = Math.min(1, lim / Math.max(1, Math.hypot(u0, v0)));
        const offset = { u: u0 * k, v: v0 * k };
        for (const dz of [0.16, -0.16, 0.5, -0.5, 1.5]) {
          const to = view.zoom + dz;
          if (to < 0.5 || to > 17.5) continue;
          const before = unprojectOffset(view, H, offset);
          const next = anchorZoom(view, to, H, offset);
          if (!next) continue; // allowed only when the centre cannot follow; asserted below that it is the exception
          const after = unprojectOffset(next, H, offset);
          // The geographic point under the cursor is the same (in metres on a 6371 km planet: well under a millimetre of screen at any zoom).
          const inside = clampToDisc(offset, to, H).onDisc;
          // (zooming out from a cursor near the limb moves the anchor onto the new limb: the identity below is for the cursors inside both discs)
          if (inside) expect(chord(before, after)).toBeLessThan(1e-11);
          // ... and, the other way round, the point is under the cursor to a thousandth of a pixel.
          // (a cursor that the smaller silhouette of a zoom OUT no longer reaches is held at the new limb, in its direction)
          const want = clampToDisc(offset, to, H);
          const o = offsetOf(next, before.lon, before.lat);
          expect(o.u).toBeCloseTo(want.u, 3);
          expect(o.v).toBeCloseTo(want.v, 3);
        }
      }
    });
  }

  it("has a solution for every on-disc cursor away from the poles", () => {
    let none = 0;
    let all = 0;
    for (const lat of [-60, -30, 0, 30, 60]) {
      for (const lon of [-179, -90, 0, 90, 179]) {
        for (const zoom of [1, 3, 6, 10, 15]) {
          const view = { lon, lat, zoom };
          for (const [u, v] of [[0, 0], [100, 100], [-200, 50], [50, -250]] as const) {
            all++;
            if (!anchorZoom(view, zoom + 0.2, H, { u, v })) none++;
          }
        }
      }
    }
    expect(none).toBe(0);
    expect(all).toBeGreaterThan(400);
  });

  it("zooming about the centre does not move the view", () => {
    const view = { lon: 33, lat: -12, zoom: 4 };
    const next = anchorZoom(view, 4.5, H, { u: 0, v: 0 })!;
    expect(next.lon).toBeCloseTo(33, 9);
    expect(next.lat).toBeCloseTo(-12, 9);
    expect(next.zoom).toBe(4.5);
  });

  it("zooming in at a cursor right of the centre moves the centre right (towards the cursor)", () => {
    const view = { lon: 0, lat: 0, zoom: 3 };
    const next = anchorZoom(view, 3.5, H, { u: 300, v: 0 })!;
    expect(next.lon).toBeGreaterThan(0);
    expect(next.lat).toBeCloseTo(0, 9);
  });

  it("crosses the antimeridian without a jump", () => {
    const view = { lon: 179.5, lat: 10, zoom: 5 };
    const next = anchorZoom(view, 5.3, H, { u: 200, v: 40 })!;
    expect(next.lon).toBeGreaterThanOrEqual(-180);
    expect(next.lon).toBeLessThan(180);
    // Whichever side of +-180 it lands, it is a small move.
    expect(angularDistance(view.lon, view.lat, next.lon, next.lat)).toBeLessThan(0.1);
  });

  it("an off-disc cursor still gives a (clamped) answer that stays on the screen", () => {
    const view = { lon: 10, lat: 20, zoom: 1 };
    const out = anchorZoom(view, 1.3, H, { u: 4000, v: 100 });
    expect(out).not.toBeNull();
    expect(Math.abs(out!.lat)).toBeLessThanOrEqual(90);
  });
});

describe("solveCentre", () => {
  it("returns null when the point cannot be at that offset", () => {
    // At whole-globe zoom the silhouette is small: an offset outside it has no surface point.
    expect(solveCentre({ lon: 0, lat: 0 }, { u: 2000, v: 0 }, 1, H)).toBeNull();
  });
});
