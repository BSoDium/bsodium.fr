import { Link } from "react-router";
import type { PlaceSummary } from "@catalyst/schemas";
import { PANEL_HEADING_ID } from "~/components/detail-panel";
import { EntryListCard } from "~/components/entry/entry-list-card";
import { Button, Icon, SectionHeader, Stack, StatePanel } from "~/components/ui";
import { safeMediaSrc } from "~/lib/entry-blocks";
import { formatPlaceCoordinates } from "~/lib/labelling";
import { imageSize, placePath, type PlaceDetailData } from "~/lib/projection";

function Figure({ image }: { image: PlaceDetailData["images"][number] }) {
  const src = safeMediaSrc(image.src);
  if (!src) return null;
  const size = imageSize(image);
  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="overflow-hidden outline outline-1 -outline-offset-1 outline-border">
        {size ? (
          <img src={src} alt={image.alt} width={size.width} height={size.height} loading="lazy" decoding="async" className="block h-auto w-full" />
        ) : (
          // Dimensions were not authored: reserve a neutral box so nothing shifts.
          <div className="aspect-[4/3] w-full overflow-hidden bg-accent">
            <img src={src} alt={image.alt} loading="lazy" decoding="async" className="size-full object-cover" />
          </div>
        )}
      </div>
      {image.caption && <figcaption className="text-sm text-muted-foreground">{image.caption}</figcaption>}
    </figure>
  );
}

/** The one quiet line under a place's name: where it is (region and country, when known), its coordinates at the precision they are stored with, its dates. */
function PlaceLine({ place }: { place: PlaceDetailData }) {
  const where = [place.region, place.country].filter((part, i, all): part is string => !!part && all.indexOf(part) === i).join(", ");
  return (
    <p data-slot="place-line" className="m-0 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
      {where && <span>{where}</span>}
      {where && <span aria-hidden="true">&middot;</span>}
      <span className="ds-meta">{formatPlaceCoordinates(place.coordinates.lat, place.coordinates.lon)}</span>
      {place.dates && (
        <>
          <span aria-hidden="true">&middot;</span>
          <time dateTime={place.dates.dateTime} className="ds-meta">
            {place.dates.text}
          </time>
        </>
      )}
    </p>
  );
}

/**
 * Place detail in the panel (docs/design-system.md): the name as the view's h1 with one quiet line under it (country, coordinates, dates),
 * the text, images, and the entries linked to the place as entry cards grouped by kind. Opening a card keeps the panel open (the entry
 * replaces the place in it) and carries `{ from: <place> }` in the router state, which gives the entry a way back. Optional sections are
 * omitted when empty: a place without entries shows no "Entries" section at all.
 */
export function PlaceDetail({ place }: { place: PlaceDetailData }) {
  const count = place.entries.reduce((n, g) => n + g.entries.length, 0);
  return (
    <article aria-labelledby={PANEL_HEADING_ID} data-slot="place-view" data-kind="place" className="px-6 pt-2 pb-10">
      <Stack gap={8}>
        <header className="flex flex-col gap-2">
          <h1 id={PANEL_HEADING_ID} tabIndex={-1} className="m-0 text-3xl font-semibold tracking-tight break-words outline-offset-4">
            {place.name}
          </h1>
          <PlaceLine place={place} />
        </header>
        {place.summary && <p className="m-0 max-w-[60ch] text-lg text-pretty text-muted-foreground">{place.summary}</p>}
        {place.body.length > 0 && (
          <Stack gap={4}>
            {place.body.map((paragraph, i) => (
              <p key={i} className="m-0 max-w-[60ch] text-lg text-pretty">
                {paragraph}
              </p>
            ))}
          </Stack>
        )}
        {place.images.length > 0 && (
          <Stack gap={6}>
            {place.images.map((image) => (
              <Figure key={image.src} image={image} />
            ))}
          </Stack>
        )}
        {count > 0 && (
          <section aria-label="Entries" data-slot="place-entries">
            <Stack gap={8}>
              {place.entries.map((group) => (
                <div key={group.kind} data-kind={group.kind} className="@container flex flex-col gap-4">
                  <SectionHeader as="h2" title={group.label} meta={group.entries.length} />
                  <ul className="m-0 grid list-none grid-cols-1 gap-8 p-0">
                    {group.entries.map((entry) => (
                      <li key={entry.slug} className="min-w-0">
                        <EntryListCard entry={entry} linkState={{ from: place.slug }} headingLevel={3} orientation="horizontal" />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Stack>
          </section>
        )}
      </Stack>
    </article>
  );
}

/** Shown inside the panel when the slug does not exist (HTTP 404). */
export function PlaceNotFound({ places }: { places: PlaceSummary[] }) {
  return (
    <div className="px-6 pt-2 pb-10">
      <Stack gap={6}>
        <StatePanel
          state="empty"
          headingLevel={1}
          titleId={PANEL_HEADING_ID}
          title="Place not found"
          description="There is no place at this address. It may have been renamed or removed."
          action={
            <Button asChild variant="secondary">
              <Link to="/">
                <Icon name="arrow-left" size="inline" />
                See all places
              </Link>
            </Button>
          }
        />
        {places.length > 0 && (
          <nav aria-label="All places">
            <ul className="m-0 list-none p-0">
              {places.map((place) => (
                <li key={place.slug}>
                  <Link to={placePath(place.slug)} className="flex min-h-11 items-center py-2 text-base no-underline hover:underline">
                    <span className="min-w-0 flex-1 truncate">{place.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </Stack>
    </div>
  );
}
