import { Link } from "react-router";
import { CONTENT_KINDS, KIND_PATHS, KIND_PLURALS } from "~/lib/entries";
import type { ContentKind } from "@catalyst/schemas";

/**
 * The home page when no place is published: the globe stays (sky, slow rotation, nothing marked) and this small plate, which says so and
 * opens the four lists (which may hold entries even without places). It carries the archive's real size (`counts`), so it never claims
 * an emptiness that is not there. Bottom left, clear of the map's credits line. One hairline, no other decoration.
 */
export function ArchiveEmpty({ counts }: { counts: Record<ContentKind, number> }) {
  const total = CONTENT_KINDS.reduce((n, kind) => n + counts[kind], 0);
  return (
    <aside
      aria-labelledby="archive-empty-title"
      data-slot="archive-empty"
      className="pointer-events-auto absolute bottom-24 left-4 z-10 w-[min(20rem,calc(100%-2rem))] border-t border-foreground bg-background/90 px-0 pt-3 pb-2 backdrop-blur-sm max-md:w-[calc(100%-2rem)] md:bottom-14 md:left-6"
    >
      <div className="flex flex-col gap-2">
        <h2 id="archive-empty-title" className="type-display-md m-0 font-extrabold">
          Nothing on the globe yet
        </h2>
        <p className="m-0 font-reading text-base leading-snug font-light text-muted-foreground max-md:hidden">
          {total > 0
            ? "No place is published yet, so the globe has no markers. The entries can already be read in their lists."
            : "Places appear here as markers as soon as they are published. The lists open as soon as there is something in them."}
        </p>
        <ul className="m-0 mt-1 flex list-none flex-col p-0 max-md:grid max-md:grid-cols-2 max-md:gap-x-4">
          {CONTENT_KINDS.map((kind) => (
            <li key={kind}>
              <Link to={KIND_PATHS[kind]} className="flex min-h-11 items-baseline justify-between gap-3 py-2 text-base no-underline hover:underline">
                <span className="min-w-0 truncate">{KIND_PLURALS[kind]}</span>
                <span className="type-meta text-muted-foreground">{counts[kind]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
