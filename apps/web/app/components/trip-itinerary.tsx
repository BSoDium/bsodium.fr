import { Link } from "react-router";
import { Icon } from "~/components/ui";
import { TripMap } from "~/components/trip-map";
import type { Trip, TripHop, TripVisit } from "~/lib/journeys";
import { placePath } from "~/lib/projection";
import { cn } from "~/lib/utils";

const MODE_LABEL: Record<TripHop["mode"], string> = { road: "By road", rail: "By train", ferry: "By ferry", flight: "By plane", walk: "On foot", unknown: "" };

/** The rail between two stops wears the map's line style: solid for a road, dashed for a rail, dotted for the rest. */
const RAIL_STYLE: Record<TripHop["mode"], string> = {
  road: "border-solid",
  walk: "border-dotted",
  rail: "border-dashed",
  ferry: "border-dotted",
  flight: "border-dotted",
  unknown: "border-dashed",
};

/** The first trips are open; the rest sit behind one "more trips" disclosure so a place on many routes stays short. */
const OPEN_TRIPS = 3;
/** From this many visits a route is listed by visit instead of a rail for each. */
const COMPACT_VISITS = 3;

const km = (n: number) => `${n.toLocaleString("en-US")} km`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** The way and the distance of a hop, in the small type of the map's annotations. */
function hopText(hop: TripHop): string {
  const label = MODE_LABEL[hop.mode];
  return label ? `${label} · ${km(hop.km)}` : km(hop.km);
}

/** A stop on the rail: the node, and the name (a link when it is another place). */
function Stop({ name, slug, here }: { name: string; slug?: string; here?: boolean }) {
  return (
    <li data-slot={here ? "trip-here" : "trip-stop"} {...(here ? { "aria-current": "location" as const } : {})} className="relative flex min-h-9 items-center pl-8">
      <span
        aria-hidden="true"
        className={cn("absolute top-1/2 left-0 -translate-y-1/2 border-2", here ? "size-4 border-trail-to bg-trail-to" : "size-3 border-trail-from bg-background")}
      />
      {here || !slug ? (
        <span className="text-base font-semibold">{name}</span>
      ) : (
        <Link to={placePath(slug)} className="min-w-0 py-1 text-base break-words underline-offset-4 hover:underline">
          {name}
        </Link>
      )}
    </li>
  );
}

function Hop({ hop }: { hop: TripHop }) {
  return (
    <li data-slot="trip-hop" data-mode={hop.mode} className="relative flex min-h-9 items-center py-1 pl-8">
      <span aria-hidden="true" className={cn("absolute top-0 bottom-0 left-[5px] w-0 border-l-2 border-trail-from", RAIL_STYLE[hop.mode])} />
      <span className="ds-meta">{hopText(hop)}</span>
    </li>
  );
}

/** Stops that are not drawn: counted on a dotted rail, with the end of the route they lead to. */
function Elided({ count, text }: { count: number; text: string }) {
  return (
    <li data-slot="trip-elided" className="relative flex min-h-8 items-center py-1 pl-8">
      <span aria-hidden="true" className="absolute top-0 bottom-0 left-[5px] w-0 border-l-2 border-dotted border-trail-from" />
      <span className="ds-meta">
        {plural(count, "stop")} {text}
      </span>
    </li>
  );
}

function Visit({ trip, visit, label }: { trip: Trip; visit: TripVisit; label?: string }) {
  const where = visit.previous === null ? "The trip starts here" : visit.next === null ? "The trip ends here" : `Stop ${visit.position} of ${trip.stops}`;
  const here = trip.stopPoints[visit.position - 1]!;
  return (
    <div data-slot="trip-visit" className="flex flex-col gap-1">
      {label && <p className="m-0 text-sm font-medium">{label}</p>}
      <ol className="m-0 flex list-none flex-col p-0">
        {visit.earlier > 0 && <Elided count={visit.earlier} text={`before, from ${trip.from}`} />}
        {visit.previous && (
          <>
            <Stop name={visit.previous.name} slug={visit.previous.slug} />
            <Hop hop={visit.previous} />
          </>
        )}
        <Stop name={here.name} here />
        {visit.next && (
          <>
            <Hop hop={visit.next} />
            <Stop name={visit.next.name} slug={visit.next.slug} />
          </>
        )}
        {visit.later > 0 && <Elided count={visit.later} text={`after, on to ${trip.to}`} />}
      </ol>
      <p className="m-0 ds-meta pl-8">{where}</p>
    </div>
  );
}

/** A place a route passes many times: one line per visit instead of a rail each, so the card stays the size of the route and not of the visits. */
function Visits({ trip }: { trip: Trip }) {
  return (
    <ol data-slot="trip-visits" className="m-0 flex list-none flex-col gap-3 p-0">
      {trip.visits.map((v, i) => (
        <li key={v.position} className="relative flex flex-col gap-0.5 pl-8">
          <span aria-hidden="true" className="absolute top-1.5 left-0 size-3 border-2 border-trail-to bg-trail-to" />
          <span className="ds-meta">
            Visit {i + 1} of {trip.visits.length} · stop {v.position} of {trip.stops}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base">
            {v.previous ? (
              <Link to={placePath(v.previous.slug)} className="underline-offset-4 hover:underline">
                {v.previous.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">Start of the trip</span>
            )}
            <Icon name="arrow-right" size="inline" className="self-center text-muted-foreground" />
            {v.next ? (
              <Link to={placePath(v.next.slug)} className="underline-offset-4 hover:underline">
                {v.next.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">End of the trip</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * One trip that stops at the place, as a card: its map (the coast, the legs from a blue tail to a violet head, this place ringed), the trip's own name,
 * its dates and the owner's few words about it, then the stop before, this place and the stop after on a rail whose hops wear the maps' line styles.
 * A place a trip passes three or more times is listed by visit. Colours are the trail gradient's two ends, solid.
 */
export function TripItinerary({ trip, here }: { trip: Trip; here: string }) {
  const facts = [trip.dates?.text, plural(trip.stops, "stop"), `about ${km(trip.km)}`].filter(Boolean).join(" · ");
  return (
    <article data-slot="trip" className="flex flex-col overflow-hidden border border-border">
      <TripMap trip={trip} here={here} />
      <div className="flex flex-col gap-4 p-4">
        <header className="flex flex-col gap-1.5">
          <h3 className="m-0 text-xl font-semibold tracking-tight text-balance">{trip.title}</h3>
          <p className="m-0 ds-meta">{facts}</p>
          {trip.summary && <p className="m-0 mt-1 text-base text-pretty text-muted-foreground">{trip.summary}</p>}
        </header>
        {trip.visits.length >= COMPACT_VISITS ? (
          <Visits trip={trip} />
        ) : (
          <div className="flex flex-col gap-4">
            {trip.visits.map((visit, i) => (
              <Visit key={visit.position} trip={trip} visit={visit} {...(trip.visits.length > 1 ? { label: `Visit ${i + 1} of ${trip.visits.length}` } : {})} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

/** All the trips of the place: the first three open, the others behind one disclosure. */
export function Trips({ trips, here }: { trips: Trip[]; here: string }) {
  const open = trips.slice(0, OPEN_TRIPS);
  const rest = trips.slice(OPEN_TRIPS);
  return (
    <div data-slot="trips" className="flex flex-col gap-6">
      {open.map((trip) => (
        <TripItinerary key={trip.id} trip={trip} here={here} />
      ))}
      {rest.length > 0 && (
        <details data-slot="trips-more" className="group flex flex-col gap-4">
          <summary className="flex min-h-11 cursor-pointer items-center text-base underline-offset-4 hover:underline">
            <span className="group-open:hidden">Show {plural(rest.length, "more trip")}</span>
            <span className="hidden group-open:inline">Hide {plural(rest.length, "trip")}</span>
          </summary>
          <div className="mt-4 flex flex-col gap-6">
            {rest.map((trip) => (
              <TripItinerary key={trip.id} trip={trip} here={here} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
