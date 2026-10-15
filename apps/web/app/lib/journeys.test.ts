import { describe, expect, it } from "vitest";
import { EMPTY_PROJECTION, encodePolyline5, type PublishedProjection } from "@catalyst/schemas";
import { journeyText, journeysOf, roundKm } from "./journeys";

const place = (slug: string, name: string, lat: number, lon: number, countryCode?: string) => ({
  slug, name, coordinates: { lat, lon }, labelPriority: 0, body: [], images: [], related: [], ...(countryCode ? { countryCode } : {}),
});

// Fictional: three points about 55 km and 50 km apart along a meridian-ish line.
const poly = (a: [number, number], b: [number, number], n = 20) =>
  encodePolyline5(Array.from({ length: n }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / (n - 1), a[1] + ((b[1] - a[1]) * i) / (n - 1)] as [number, number]));

const projection: PublishedProjection = {
  ...EMPTY_PROJECTION,
  places: [place("alpha", "Alpha", 10, 10), place("beta", "Beta", 10.5, 10), place("gamma", "Gamma", 10.95, 10), place("delta", "Delta", 30, 40)],
  routes: [
    {
      id: "r1",
      title: "R1",
      stops: ["alpha", "beta", "gamma", "delta"],
      legs: [{ mode: "road", polyline: poly([10, 10], [10.5, 10]) }, { mode: "rail", polyline: poly([10.5, 10], [10.95, 10]) }, { mode: "flight" }],
    },
  ],
};

describe("journeys", () => {
  it("rounds to 10 km, never under 10", () => {
    expect(roundKm(0)).toBe(10);
    expect(roundKm(4_000)).toBe(10);
    expect(roundKm(190_400)).toBe(190);
    expect(roundKm(194_900)).toBe(190);
    expect(roundKm(195_100)).toBe(200);
  });
  it("words the legs next to a place, arrival first, with the mode as a noun phrase", () => {
    const j = journeysOf(projection, "beta");
    expect(j.map((x) => x.text)).toEqual(["Arrived from Alpha by road, about 60 km", "Left for Gamma by train, about 50 km"]);
    expect(j.map((x) => [x.direction, x.slug, x.mode])).toEqual([["arrived", "alpha", "road"], ["left", "gamma", "rail"]]);
  });
  it("a leg with no polyline uses the distance between its stops; a flight reads 'by plane'", () => {
    const j = journeysOf(projection, "delta");
    expect(j).toHaveLength(1);
    expect(j[0]!.text).toMatch(/^Arrived from Gamma by plane, about [\d,]+ km$/);
    expect(j[0]!.km).toBeGreaterThan(2000);
    expect(journeysOf(projection, "alpha").map((x) => x.text)).toEqual(["Left for Beta by road, about 60 km"]);
  });
  it("says nothing about how when the mode is unknown, and 'on foot' for a walk", () => {
    expect(journeyText("left", "Y", "unknown", 190)).toBe("Left for Y, about 190 km");
    expect(journeyText("arrived", "X", "walk", 20)).toBe("Arrived from X on foot, about 20 km");
    expect(journeyText("arrived", "X", "ferry", 1430)).toBe("Arrived from X by ferry, about 1,430 km");
  });
  it("a route without legs gives arcs of unknown mode; a place on no route gives none; no timestamps anywhere", () => {
    const noLegs: PublishedProjection = { ...projection, routes: [{ id: "r", title: "R", stops: ["alpha", "beta"] }] };
    expect(journeysOf(noLegs, "beta").map((x) => x.text)).toEqual(["Arrived from Alpha, about 60 km"]);
    expect(journeysOf(projection, "nowhere")).toEqual([]);
    for (const x of journeysOf(projection, "beta")) expect(x.text).not.toMatch(/\d{4}|ago|hour|day/);
  });
  it("lists a repeated sentence once", () => {
    const twice: PublishedProjection = { ...projection, routes: [projection.routes[0]!, { ...projection.routes[0]!, id: "r2" }] };
    expect(journeysOf(twice, "beta")).toHaveLength(2);
  });
});
