/**
 * The text twin of the paths on the map: the legs next to a place, as sentences. The globe and the street map draw them
 * (aria-hidden), the place panel lists them, so someone who cannot see the lines still gets "where did this place's journeys
 * come from and go to". Derived from the projection's routes only (their stops and legs): no timestamps, no durations, nothing
 * that is not already published.
 *
 *   Arrived from Hue by road, about 190 km
 *   Left for Zagreb by train, about 540 km
 *
 * The distance is the length of the leg's polyline, or the great-circle distance between its stops when it has none, rounded to
 * 10 km ("about"). The mode is a noun phrase; an unknown mode says nothing about how.
 */
import type { PublishedProjection } from "@catalyst/schemas";
import { legLengthM } from "~/globe/paths/network";
import { paletteOf } from "~/globe/paths/trail";
import type { GlobeLeg } from "~/globe/types";

type LegMode = GlobeLeg["mode"];

export interface Journey {
  /** `arrived`: the leg ends at the place; `left`: it starts there. */
  direction: "arrived" | "left";
  /** The place at the other end. */
  slug: string;
  name: string;
  mode: LegMode;
  /** Rounded to 10 km, at least 10. */
  km: number;
  text: string;
  /** The route's trail palette (0 blue, 1 green, 2 ocre, 3 violet: its position among the published routes, modulo 4): the swatch beside the line. */
  palette: number;
}

const BY: Record<LegMode, string> = { road: " by road", rail: " by train", ferry: " by ferry", flight: " by plane", walk: " on foot", unknown: "" };

/** Whole kilometres rounded to the nearest 10, never below 10. */
export const roundKm = (m: number): number => Math.max(10, Math.round(m / 10_000) * 10);

export function journeyText(direction: Journey["direction"], name: string, mode: LegMode, km: number): string {
  const n = km.toLocaleString("en-US");
  return `${direction === "arrived" ? "Arrived from" : "Left for"} ${name}${BY[mode]}, about ${n} km`;
}

/** `nameOf`: how the panel names a place (the caller owns that rule: it also strips a trailing country). */
export function journeysOf(projection: PublishedProjection, slug: string, nameOf: (place: PublishedProjection["places"][number]) => string = (p) => p.name): Journey[] {
  const bySlug = new Map(projection.places.map((p) => [p.slug, p]));
  const out: Journey[] = [];
  const seen = new Set<string>();
  projection.routes.forEach((route, order) => {
    route.stops.forEach((stop, i) => {
      if (stop !== slug) return;
      const add = (legIndex: number, otherSlug: string | undefined, direction: Journey["direction"]) => {
        const leg = route.legs?.[legIndex];
        const other = otherSlug ? bySlug.get(otherSlug) : undefined;
        const a = bySlug.get(route.stops[legIndex]!);
        const b = bySlug.get(route.stops[legIndex + 1]!);
        if (!other || !a || !b || otherSlug === slug) return;
        const metres = legLengthM({ lat: a.coordinates.lat, lon: a.coordinates.lon }, { lat: b.coordinates.lat, lon: b.coordinates.lon }, leg);
        const mode: LegMode = leg?.mode ?? "unknown";
        const km = roundKm(metres);
        const name = nameOf(other);
        const text = journeyText(direction, name, mode, km);
        if (seen.has(text)) return;
        seen.add(text);
        out.push({ direction, slug: other.slug, name, mode, km, text, palette: paletteOf(order) });
      };
      if (i > 0) add(i - 1, route.stops[i - 1], "arrived");
      if (i + 1 < route.stops.length) add(i, route.stops[i + 1], "left");
    });
  });
  return out;
}

/** One hop of a trip as seen from a stop: the place at the other end, how, how far, and the sentence that says it. */
export interface TripHop {
  slug: string;
  name: string;
  mode: LegMode;
  km: number;
  text: string;
}

/** One visit of the place in a trip (a place can be a stop of a route twice). */
export interface TripVisit {
  /** 1-based position among the route's stops. */
  position: number;
  /** The hop that brought the trip here; null when the trip starts here. */
  previous: TripHop | null;
  /** The hop that leaves; null when the trip ends here. */
  next: TripHop | null;
  /** Stops before the previous one / after the next one: the itinerary shows one on each side and counts the rest. */
  earlier: number;
  later: number;
}

/** A published route that stops at the place: the panel's itinerary card. */
export interface Trip {
  id: string;
  title: string;
  palette: number;
  /** Stops in the route / whole route length, rounded to 10 km. */
  stops: number;
  km: number;
  /** Where the route starts and ends, by name. */
  from: string;
  to: string;
  visits: TripVisit[];
}

/** The routes that stop at `slug`, each with the hop before and the hop after every visit. Same inputs and rounding as `journeysOf`. */
export function tripsOf(projection: PublishedProjection, slug: string, nameOf: (place: PublishedProjection["places"][number]) => string = (p) => p.name): Trip[] {
  const bySlug = new Map(projection.places.map((p) => [p.slug, p]));
  const trips: Trip[] = [];
  projection.routes.forEach((route, order) => {
    const places = route.stops.map((s) => bySlug.get(s));
    if (places.some((p) => !p) || !route.stops.includes(slug)) return;
    const hop = (legIndex: number, other: number, direction: Journey["direction"]): TripHop => {
      const a = places[legIndex]!;
      const b = places[legIndex + 1]!;
      const leg = route.legs?.[legIndex];
      const mode: LegMode = leg?.mode ?? "unknown";
      const km = roundKm(legLengthM({ lat: a.coordinates.lat, lon: a.coordinates.lon }, { lat: b.coordinates.lat, lon: b.coordinates.lon }, leg));
      const name = nameOf(places[other]!);
      return { slug: places[other]!.slug, name, mode, km, text: journeyText(direction, name, mode, km) };
    };
    const visits: TripVisit[] = [];
    route.stops.forEach((stop, i) => {
      if (stop !== slug) return;
      visits.push({
        position: i + 1,
        previous: i > 0 ? hop(i - 1, i - 1, "arrived") : null,
        next: i + 1 < route.stops.length ? hop(i, i + 1, "left") : null,
        earlier: Math.max(0, i - 1),
        later: Math.max(0, route.stops.length - i - 2),
      });
    });
    let total = 0;
    for (let i = 0; i + 1 < places.length; i++) {
      const a = places[i]!.coordinates;
      const b = places[i + 1]!.coordinates;
      total += legLengthM({ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }, route.legs?.[i]);
    }
    trips.push({
      id: route.id,
      title: route.title,
      palette: paletteOf(order),
      stops: route.stops.length,
      km: roundKm(total),
      from: nameOf(places[0]!),
      to: nameOf(places[places.length - 1]!),
      visits,
    });
  });
  return trips;
}
