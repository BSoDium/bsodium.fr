import { Link } from "react-router";
import { Icon, type IconName } from "~/components/ui";
import type { Trip, TripHop, TripVisit } from "~/lib/journeys";
import { placePath } from "~/lib/projection";
import { cn } from "~/lib/utils";

/** The trip's trail palette (blue, green, ocre, violet) as solid colours: literal class names so Tailwind sees them. */
const FILL = ["bg-trail-blue", "bg-trail-green", "bg-trail-ocre", "bg-trail-violet"] as const;
const ACCENT = ["border-l-trail-blue", "border-l-trail-green", "border-l-trail-ocre", "border-l-trail-violet"] as const;
const EDGE = ["border-trail-blue", "border-trail-green", "border-trail-ocre", "border-trail-violet"] as const;

const MODE_LABEL: Record<TripHop["mode"], string> = { road: "By road", rail: "By train", ferry: "By ferry", flight: "By plane", walk: "On foot", unknown: "" };
const MODE_ICON: Record<TripHop["mode"], IconName> = { road: "road", rail: "rail", ferry: "ferry", flight: "flight", walk: "walk", unknown: "trip" };

/** The rail between two stops echoes the line on the map: solid for a road, dashed for a rail, dotted for the rest. */
const RAIL_STYLE: Record<TripHop["mode"], string> = {
  road: "border-solid",
  walk: "border-dotted",
  rail: "border-dashed",
  ferry: "border-dotted",
  flight: "border-dotted",
  unknown: "border-dotted",
};

/** At most this many cells in the progress strip: a 40-stop route is drawn as 24 cells, a 4-stop route as 4. */
const STRIP_MAX = 24;
/** The first trips are open; the rest sit behind one "more trips" disclosure so a place on many routes stays short. */
const OPEN_TRIPS = 3;

const km = (n: number) => `${n.toLocaleString("en-US")} km`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** One cell per stop (or per slice of stops): the cells before this visit are filled, this one is taller, those to come are outlined. */
function Strip({ trip }: { trip: Trip }) {
  const cells = Math.min(trip.stops, STRIP_MAX);
  const here = new Set(trip.visits.map((v) => (trip.stops <= 1 ? 0 : Math.round(((v.position - 1) / (trip.stops - 1)) * (cells - 1)))));
  const last = Math.max(...here);
  return (
    <div aria-hidden="true" data-slot="trip-strip" className="flex items-end gap-0.5">
      {Array.from({ length: cells }, (_, i) => (
        <span
          key={i}
          className={cn("w-full max-w-4 min-w-0.5 flex-1 border", EDGE[trip.palette], here.has(i) ? cn("h-3", FILL[trip.palette]) : i < last ? cn("h-1.5", FILL[trip.palette]) : "h-1.5 bg-background")}
        />
      ))}
    </div>
  );
}

function Hop({ hop, palette }: { hop: TripHop; palette: number }) {
  const label = MODE_LABEL[hop.mode];
  return (
    <li data-slot="trip-hop" data-mode={hop.mode} className="relative min-h-11 py-2 pl-9">
      <span aria-hidden="true" className={cn("absolute top-0 bottom-0 left-[5px] w-0 border-l-2", EDGE[palette], RAIL_STYLE[hop.mode])} />
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon name={MODE_ICON[hop.mode]} size="inline" />
        <span>{label ? `${label}, about ${km(hop.km)}` : `About ${km(hop.km)}`}</span>
      </span>
    </li>
  );
}

/** A stop beside the one the panel is about: a link to its own place, with a hollow square on the rail. */
function Neighbour({ hop, palette }: { hop: TripHop; palette: number }) {
  return (
    <li data-slot="trip-stop" className="relative flex min-h-8 items-center pl-9">
      <span aria-hidden="true" className={cn("absolute top-1/2 left-0 size-3 -translate-y-1/2 border-2 bg-background", EDGE[palette])} />
      <Link to={placePath(hop.slug)} className="min-w-0 py-1 text-base break-words underline-offset-4 hover:underline">
        {hop.name}
      </Link>
    </li>
  );
}

/** Stops that are not drawn: counted on the rail, dotted, with the end of the route they lead to. */
function Elided({ count, towards, side, palette }: { count: number; towards: string; side: "before" | "after"; palette: number }) {
  return (
    <li data-slot="trip-elided" className="relative min-h-8 py-1.5 pl-9">
      <span aria-hidden="true" className={cn("absolute top-0 bottom-0 left-[5px] w-0 border-l-2 border-dotted", EDGE[palette])} />
      <span className="text-sm text-muted-foreground">{plural(count, side === "before" ? "earlier stop" : "later stop")}, {towards}</span>
    </li>
  );
}

function Visit({ trip, visit, label }: { trip: Trip; visit: TripVisit; label?: string }) {
  const p = trip.palette;
  const where = visit.previous === null ? "The trip starts here" : visit.next === null ? "The trip ends here" : `Stop ${visit.position} of ${trip.stops}`;
  return (
    <div data-slot="trip-visit" className="flex flex-col gap-1">
      {label && <p className="m-0 text-sm font-medium">{label}</p>}
      <ol className="m-0 flex list-none flex-col p-0">
        {visit.earlier > 0 && <Elided count={visit.earlier} side="before" towards={`from ${trip.from}`} palette={p} />}
        {visit.previous && (
          <>
            <Neighbour hop={visit.previous} palette={p} />
            <Hop hop={visit.previous} palette={p} />
          </>
        )}
        <li data-slot="trip-here" aria-current="location" className="relative flex min-h-11 flex-col justify-center pl-9">
          <span aria-hidden="true" className={cn("absolute top-1/2 left-[-2px] size-4 -translate-y-1/2 border-2", EDGE[p], FILL[p])} />
          <span className="text-base font-semibold">Here</span>
          <span className="text-sm text-muted-foreground">{where}</span>
        </li>
        {visit.next && (
          <>
            <Hop hop={visit.next} palette={p} />
            <Neighbour hop={visit.next} palette={p} />
          </>
        )}
        {visit.later > 0 && <Elided count={visit.later} side="after" towards={`on to ${trip.to}`} palette={p} />}
      </ol>
    </div>
  );
}

/** A place a route passes many times: one line per visit instead of a rail each, so the card stays the size of the route and not of the visits. */
function Visits({ trip }: { trip: Trip }) {
  const p = trip.palette;
  const hop = (h: TripHop | null, side: "previous" | "next") =>
    h ? (
      <Link to={placePath(h.slug)} className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
        {side === "next" && <Icon name={MODE_ICON[h.mode]} size="inline" />}
        <span>{h.name}</span>
        {side === "previous" && <Icon name={MODE_ICON[h.mode]} size="inline" />}
      </Link>
    ) : (
      <span className="text-muted-foreground">{side === "previous" ? "Start of the trip" : "End of the trip"}</span>
    );
  return (
    <ol data-slot="trip-visits" className="m-0 flex list-none flex-col gap-3 p-0">
      {trip.visits.map((v, i) => (
        <li key={v.position} className="relative flex flex-col gap-0.5 pl-9">
          <span aria-hidden="true" className={cn("absolute top-1.5 left-0 size-3 border-2", EDGE[p], FILL[p])} />
          <span className="text-sm text-muted-foreground">
            Visit {i + 1} of {trip.visits.length} · stop {v.position} of {trip.stops}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base">
            {hop(v.previous, "previous")}
            <Icon name="arrow-right" size="inline" className="text-muted-foreground" />
            {hop(v.next, "next")}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** From this many visits a route is listed by visit, not drawn as a rail for each. */
const COMPACT_VISITS = 3;

/**
 * One route that stops at the place, as a small itinerary: its title and size, a strip that says where in the route this place
 * is, and the rail of the stop before, this place and the stop after, joined by hops that wear the map's line style. A place a
 * route passes twice shows both visits. Colours are the trip's trail palette, solid; the strip, the rail and the squares are
 * decoration (the text says all of it).
 */
export function TripItinerary({ trip }: { trip: Trip }) {
  const meta = [plural(trip.stops, "stop"), `about ${km(trip.km)}`, trip.from === trip.to ? `round trip from ${trip.from}` : `${trip.from} to ${trip.to}`].join(" · ");
  return (
    <article data-slot="trip" data-palette={trip.palette} className={cn("flex flex-col gap-4 border border-l-4 border-border p-4", ACCENT[trip.palette])}>
      <header className="flex flex-col gap-1">
        <h3 className="m-0 text-base font-semibold text-balance">{trip.title}</h3>
        <p className="m-0 text-sm text-muted-foreground">{meta}</p>
      </header>
      <Strip trip={trip} />
      {trip.visits.length >= COMPACT_VISITS ? (
        <Visits trip={trip} />
      ) : (
        <div className="flex flex-col gap-4">
          {trip.visits.map((visit, i) => (
            <Visit key={visit.position} trip={trip} visit={visit} {...(trip.visits.length > 1 ? { label: `Visit ${i + 1} of ${trip.visits.length}` } : {})} />
          ))}
        </div>
      )}
    </article>
  );
}

/** All the trips of the place: the first three open, the others behind one disclosure. */
export function Trips({ trips }: { trips: Trip[] }) {
  const open = trips.slice(0, OPEN_TRIPS);
  const rest = trips.slice(OPEN_TRIPS);
  return (
    <div data-slot="trips" className="flex flex-col gap-4">
      {open.map((trip) => (
        <TripItinerary key={trip.id} trip={trip} />
      ))}
      {rest.length > 0 && (
        <details data-slot="trips-more" className="group flex flex-col gap-4">
          <summary className="flex min-h-11 cursor-pointer items-center text-base underline-offset-4 hover:underline">
            <span className="group-open:hidden">Show {plural(rest.length, "more trip")}</span>
            <span className="hidden group-open:inline">Hide {plural(rest.length, "trip")}</span>
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            {rest.map((trip) => (
              <TripItinerary key={trip.id} trip={trip} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
