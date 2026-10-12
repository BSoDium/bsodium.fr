import { useState } from "react";
import { Link, useLocation } from "react-router";
import type { ContentKind } from "@catalyst/schemas";
import { EntryListCard } from "~/components/entry/entry-list-card";
import { Button, Grid, StatePanel } from "~/components/ui";
import { KIND_LABELS, KIND_PLURALS, type EntrySummary } from "~/lib/entries";
import { collectTags, filterByTag, groupByYear, parseTagFilter, shouldGroupByYear, tagSearch, type TagCount } from "~/lib/entry-list";

/** Tags shown before "more": the rest sit one press away (the selected tag is always shown). */
const TAGS_SHOWN = 10;

const colStyle = { "--span": 12, "--span-md": 6, "--span-lg": 4 } as React.CSSProperties;

/**
 * `/projects`, `/articles`, `/artworks`, `/poems`: a title with a plain count, then a grid of entry cards (cover, title, summary, date, place, tags; the
 * kind is not repeated: the page is already "Articles"), each linking to the
 * entry's route (which opens in the shell's side panel), grouped by year (newest first) and filterable by one tag. The filter is the
 * URL (`?tag=rail`: a link, a reload, the back button; works without scripts) and each chip is a link. An empty collection is one muted line. Each card keeps the entry's slug as its anchor id (`/articles#slug`).
 */
export function EntryListPage({ kind, items }: { kind: ContentKind; items: EntrySummary[] }) {
  const { search } = useLocation();
  const tags = collectTags(items);
  const tag = parseTagFilter(search, tags);
  const shown = filterByTag(items, tag);
  const byYear = groupByYear(shown);
  // Newest first either way; the year headings only when they group something (`shouldGroupByYear`).
  const grouped = shouldGroupByYear(byYear);
  const groups = grouped ? byYear : [{ key: "all", year: null, items: byYear.flatMap((g) => g.items) }];
  const cardLevel = grouped ? 3 : 2;
  const plural = KIND_PLURALS[kind].toLowerCase();
  let seen = 0;

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-6 pt-[calc(var(--navbar-height)+3rem)] pb-24 outline-none">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-balance md:text-4xl">{KIND_PLURALS[kind]}</h1>
        <p data-slot="list-count" className="m-0 text-base text-muted-foreground">
          {tag ? `${shown.length} of ${items.length}` : items.length} {items.length === 1 ? KIND_LABELS[kind].toLowerCase() : plural}
        </p>
      </header>

      {tags.length > 0 && items.length > 1 && <TagFilter tags={tags} selected={tag} search={search} label={`Filter ${plural} by tag`} />}
      <p role="status" className="sr-only">
        {tag ? `Showing ${shown.length} of ${items.length} ${plural} tagged ${tag}` : ""}
      </p>

      <div className="mt-10 flex flex-col gap-14">
        {items.length === 0 ? (
          <StatePanel state="empty" headingLevel={2} title="Nothing here yet." />
        ) : (
          groups.map((group) => {
            const id = `year-${group.key}`;
            return (
              <section key={group.key} aria-labelledby={grouped ? id : undefined} data-year={group.key}>
                {grouped && (
                  <h2 id={id} className="ds-year m-0 mb-5 text-xl font-semibold tracking-tight">
                    {group.year ?? "Undated"}
                    <span className="sr-only">, {group.items.length === 1 ? "1 entry" : `${group.items.length} entries`}</span>
                  </h2>
                )}
                <Grid role="list" aria-label={grouped ? `${KIND_PLURALS[kind]} ${group.year ?? "undated"}` : KIND_PLURALS[kind]}>
                  {group.items.map((entry) => {
                    const priority = seen++ < 3;
                    return (
                      <div key={entry.slug} role="listitem" className="ds-col min-w-0 scroll-mt-24" style={colStyle}>
                        <EntryListCard entry={entry} headingLevel={cardLevel} priority={priority} />
                      </div>
                    );
                  })}
                </Grid>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}

/**
 * The tag filter: one text link per tag (and "All"), each to the same page with `?tag=`; the selected one is heavier, underlined and `aria-current`.
 * Links, not buttons: the state is the URL. More than `TAGS_SHOWN` tags fold behind a "more" button (the selected tag stays visible).
 */
function TagFilter({ tags, selected, search, label }: { tags: TagCount[]; selected: string | null; search: string; label: string }) {
  const [open, setOpen] = useState(false);
  const folded = tags.length > TAGS_SHOWN + 2 && !open;
  const visible = folded ? tags.filter((t, i) => i < TAGS_SHOWN || t.tag === selected) : tags;
  const hidden = tags.length - visible.length;
  const link = (to: string | null, text: string, current: boolean, key: string) => (
    <li key={key}>
      <Link to={{ search: tagSearch(search, to) }} preventScrollReset replace aria-current={current ? "true" : undefined} className="ds-filter" data-filter={to ?? "all"}>
        <span>{text}</span>
      </Link>
    </li>
  );
  return (
    <nav aria-label={label} data-slot="tag-filter" className="mt-8">
      <ul className="ds-filter-row flex list-none gap-4">
        {link(null, "All", selected === null, "all")}
        {visible.map((t) => link(t.tag, t.tag, selected === t.tag, t.tag))}
        {(hidden > 0 || (open && tags.length > TAGS_SHOWN + 2)) && (
          <li>
            <Button variant="link" size="sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? "Fewer tags" : `+${hidden} more`}
            </Button>
          </li>
        )}
      </ul>
    </nav>
  );
}
