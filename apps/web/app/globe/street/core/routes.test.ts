import { describe, expect, it } from "vitest";
import { angularDistance } from "../../engine/geo";
import { encodePolyline5 } from "../../paths/polyline";
import { greatCircle, legFeatures, legKeysAt, splitAtAntimeridian } from "./routes";

describe("greatCircle", () => {
  it("keeps both ends exact and steps at most `step` degrees", () => {
    const pts = greatCircle([2.35, 48.86], [139.69, 35.68], 0.5);
    expect(pts[0]).toEqual([2.35, 48.86]);
    expect(pts[pts.length - 1]).toEqual([139.69, 35.68]);
    for (let i = 1; i < pts.length; i++) {
      const d = (angularDistance(pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1]) * 180) / Math.PI;
      expect(d).toBeLessThanOrEqual(0.5 + 1e-6);
    }
    // the middle of the Paris-Tokyo great circle is far north of the straight lon/lat line
    const mid = pts[Math.floor(pts.length / 2)]!;
    expect(mid[1]).toBeGreaterThan(55);
  });
  it("handles identical and antipodal-ish points without NaN", () => {
    expect(greatCircle([10, 10], [10, 10])).toEqual([[10, 10], [10, 10]]);
    for (const p of greatCircle([0, 0], [179.9, 0.1], 5)) expect(p.every(Number.isFinite)).toBe(true);
  });
});

describe("splitAtAntimeridian", () => {
  it("leaves a line that does not cross it alone", () => {
    expect(splitAtAntimeridian([[10, 0], [20, 5]])).toEqual([[[10, 0], [20, 5]]]);
  });
  it("splits an eastward crossing onto both edges at the interpolated latitude", () => {
    const parts = splitAtAntimeridian([[170, 0], [-170, 20]]);
    expect(parts).toHaveLength(2);
    expect(parts[0]![parts[0]!.length - 1]).toEqual([180, 10]);
    expect(parts[1]![0]).toEqual([-180, 10]);
    expect(parts[1]![1]).toEqual([-170, 20]);
  });
  it("splits a westward crossing too", () => {
    const parts = splitAtAntimeridian([[-175, -10], [175, 10]]);
    expect(parts).toHaveLength(2);
    expect(parts[0]![1]).toEqual([-180, 0]);
    expect(parts[1]![0]).toEqual([180, 0]);
  });
});

describe("legFeatures", () => {
  const points = [{ lat: 10.78, lon: 106.7 }, { lat: 16.46, lon: 107.59 }, { lat: 21.03, lon: 105.85 }];
  const route = { id: "r1", title: "Route", points };
  it("makes one feature per leg, keyed by route and position, through the stops in order", () => {
    const fc = legFeatures([route, { id: "lonely", title: "x", points: [{ lat: 0, lon: 0 }] }, { id: "none", title: "y", points: [] }]);
    expect(fc.features).toHaveLength(2);
    expect(fc.features.map((f) => f.properties)).toEqual([
      { id: "r1", key: "r1:0", mode: "unknown" },
      { id: "r1", key: "r1:1", mode: "unknown" },
    ]);
    const first = fc.features[0]!.geometry.coordinates[0]!;
    expect(first[0]).toEqual([106.7, 10.78]);
    expect(first[first.length - 1]).toEqual([107.59, 16.46]);
  });
  it("follows a leg's polyline and tags its mode; a flight's polyline is ignored (an arc)", () => {
    const pl = encodePolyline5([106.7, 10.78, 106.9, 13.2, 107.59, 16.46]);
    const fc = legFeatures([{ ...route, legs: [{ mode: "rail", polyline: pl }, { mode: "flight", polyline: pl }] }]);
    expect(fc.features[0]!.properties).toEqual({ id: "r1", key: "r1:0", mode: "rail" });
    expect(fc.features[0]!.geometry.coordinates[0]).toEqual([[106.7, 10.78], [106.9, 13.2], [107.59, 16.46]]);
    expect(fc.features[1]!.properties!.mode).toBe("flight");
    expect(fc.features[1]!.geometry.coordinates[0]!.length).toBeGreaterThan(3);
  });
  it("skips a leg between the same place twice and draws nothing for no routes", () => {
    expect(legFeatures([{ id: "x", title: "x", points: [points[0]!, points[0]!, points[1]!] }]).features.map((f) => f.properties!.key)).toEqual(["x:1"]);
    expect(legFeatures([]).features).toEqual([]);
  });
  it("splits a leg across the antimeridian", () => {
    const fc = legFeatures([{ id: "pac", title: "p", points: [{ lat: -17, lon: 178 }, { lat: -18, lon: -176 }] }]);
    expect(fc.features[0]!.geometry.coordinates).toHaveLength(2);
  });
});

describe("legKeysAt", () => {
  const route = { id: "r", title: "R", points: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }, { lat: 3, lon: 3 }] };
  const other = { id: "o", title: "O", points: [{ lat: 2, lon: 2 }, { lat: 5, lon: 5 }] };
  it("is the leg that arrives and the one that leaves, on every route through the place", () => {
    expect(legKeysAt([route, other], { lat: 2, lon: 2 })).toEqual(["r:0", "r:1", "o:0"]);
    expect(legKeysAt([route], { lat: 1, lon: 1 })).toEqual(["r:0"]);
    expect(legKeysAt([route], { lat: 3, lon: 3 })).toEqual(["r:1"]);
  });
  it("is empty for no place or a place on no route", () => {
    expect(legKeysAt([route], undefined)).toEqual([]);
    expect(legKeysAt([route], { lat: 9, lon: 9 })).toEqual([]);
  });
});
