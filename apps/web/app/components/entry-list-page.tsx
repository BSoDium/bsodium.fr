import { useState } from "react";
import { Link, useLocation } from "react-router";
import type { ContentKind } from "@catalyst/schemas";
import { EntryRow } from "~/components/entry/entry-list-card";
import { Button, StatePanel } from "~/components/ui";
import { KIND_NOUNS, KIND_PLURALS, type EntrySummary } from "~/lib/entries";
import { collectTags, filterByTag, groupByYear, parseTagFilter, shouldGroupByYear, tagSearch, type TagCount } from "~/lib/entry-list";

/** Tags shown before "more": the rest sit one press away (the selected tag is always shown). */
const TAGS_SHOWN = 10;

/**
 * `/projects`, `/articles`, `/artworks`, `/poetry`: the section's front page, set as type (docs/design-system.md, "Entry pages"): the double
 * rule, a mono line with the plain count, the section name at the headline scale, then a rule and the tag filter, then the entries as hairline rows
 * (`EntryRow`: date and places in mono, the title heavy over a thin summary, the image where there is one), grouped by year (newest first)
 * when a year holds more than one. The filter is the URL (`?tag=rail`: a link, a reload, the back button; works without scripts) and each
 * choice is a link. An empty collection is one muted line. Each row keeps the entry's slug as its anchor id (`/articles#slug`).
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
  // The section's name for labels ("Filter poetry by tag"), the count noun for counts ("4 poems").
  const section = KIND_PLURALS[kind].toLowerCase();
  const nouns = KIND_NOUNS[kind];
  let seen = 0;

  return (
    <main
      id="main"
      tabIndex={-1}
      data-surface="reading"
      data-layout="full"
      className="entry mx-auto max-w-[90rem] px-4 pt-[calc(var(--navbar-height)+3rem)] pb-24 outline-none md:px-14"
    >
      <header className="flex flex-col">
        <div aria-hidden="true" className="entry-rule" />
        <p data-slot="list-count" className="type-meta m-0 mt-[1.375rem] text-muted-foreground">
          {tag ? `${shown.length} of ${items.length}` : items.length} {items.length === 1 ? nouns.one : nouns.many}
        </p>
        <h1 className="entry-title mt-[1.625rem]">{KIND_PLURALS[kind]}</h1>
      </header>

      {tags.length > 0 && items.length > 1 && <TagFilter tags={tags} selected={tag} search={search} label={`Filter ${section} by tag`} />}
      <p role="status" className="sr-only">
        {tag ? `Showing ${shown.length} of ${items.length} ${nouns.many} tagged ${tag}` : ""}
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
                  <h2 id={id} className="ds-year type-display-lg type-thin m-0 mb-6">
                    {group.year ?? "Undated"}
                    <span className="sr-only">, {group.items.length === 1 ? "1 entry" : `${group.items.length} entries`}</span>
                  </h2>
                )}
                <div role="list" aria-label={grouped ? `${KIND_PLURALS[kind]} ${group.year ?? "undated"}` : KIND_PLURALS[kind]} className="flex flex-col">
                  {group.items.map((entry) => {
                    const priority = seen++ < 3;
                    return (
                      <div key={entry.slug} role="listitem" className="min-w-0">
                        <EntryRow entry={entry} headingLevel={cardLevel} priority={priority} className="scroll-mt-24" />
                      </div>
                    );
                  })}
                </div>
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
    <nav aria-label={label} data-slot="tag-filter" className="mt-9 border-t border-foreground pt-3">
      <ul className="ds-filter-row flex list-none gap-0">
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
