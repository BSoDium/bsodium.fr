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
  for (const route of projection.routes) {
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
        out.push({ direction, slug: other.slug, name, mode, km, text });
      };
      if (i > 0) add(i - 1, route.stops[i - 1], "arrived");
      if (i + 1 < route.stops.length) add(i, route.stops[i + 1], "left");
    });
  }
  return out;
}
