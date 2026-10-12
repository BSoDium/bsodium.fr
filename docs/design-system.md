# Design system

The UI system for the data display: the side panel and the full-screen view that show places and entries (kinds: article, project, artwork, poem, and the place itself) and the list pages. It sits on the values in [design-tokens.md](design-tokens.md) and does not touch the map, its labels or the globe canvas. Live reference: the dev-only styleguide at `/dev/design` (every token and component, both schemes, sample entries as cards and as a panel mock, the loading / empty / error states). Code: `apps/web/app/components/ui/` (React), `app/app.css` (`ds-*` classes and tokens), `app/lib/{entry-kind,labelling,cover-art,contrast}.ts` (pure logic, tested).

## Principle: a quiet personal archive

The first version of this system (2026-10-08) read the brief ("Y2K art, generative art, labellisation, square edges, Watch Dogs style") as a
HUD: corner brackets on every box, index codes, numbered sections, tracked mono labels everywhere. The owner asked for something "a bit less
AI" (2026-10-11) and the system was restrained (2026-10-12). What stayed of the brief is the square edges, the hairlines, the generative
covers and the one accent (cyan until 2026-10-12, orange now); the annotation language is now used only where it carries information.

| Principle | What it means here |
| --- | --- |
| Square edges | Radius 0 everywhere (all `--radius-*` tokens are 0; a test scans the components). No pills, no soft shadows. |
| Few boxes | Spacing and a cover separate things; a hairline box is for the few things that are one (a code block, a link card, the search dialog, an error). A card has no box, a list has no chips, metadata has no inner rules, an empty state is one muted line. No corner brackets anywhere in the UI (the map's detection boxes keep their own corner arms). |
| Label only when it adds information | No decorative numbering (`01 ENTRIES`, `№ 0042`, `000 entries`), no index codes, no eyebrow that repeats the page's title, no kind on a card in a list of one kind, no "Place" on a place. A date, a place, a count, a tag say what they are. |
| Type is the voice | Display type in a very heavy weight against a very thin one, a reading serif for long text, mono for metadata (see "Type"). Interface text (buttons, filters, tags) stays sans at comfortable sizes (16 px or more, secondary 14 px), sentence case; the tracked uppercase mono micro-label is the exception, not the language. |
| One accent, for state | The orange `--signal` marks state: the contents entry being read, the highlighted search result, the active Frame, the error tag; and the marks of generated covers. Never decoration (no numerals, no rules, no labels). |
| Generative art | Entries without an image get a **seeded procedural cover**: a small dithered grid in the palette plus one signal mark. Deterministic, subtle, never carrying information. |
| Clean grid | 4 px base grid; 12-column panel grid with 16 px gutters; 24 px panel padding. |

## Tokens

All in `app.css`; light and dark keep the map's near-black / near-white family. Contrast values are tested (`lib/design-system.test.ts`) and shown live on `/dev/design`.

### Colour roles

| Role | Token | Light | Dark | Notes |
| --- | --- | --- | --- | --- |
| Page | `--background` | `#fbfbfb` | `#0a0a0a` | unchanged |
| Panel plate | `--surface` | `#f4f4f4` | `#121212` | the Frame's fill: one step off the page, replaces elevation |
| Sunken / hover | `--accent` | `#ececec` | `#1f1f1f` | hover rows, cover background; muted text stays AA on it, `--subtle-foreground` does not (4.25:1): never use subtle there |
| Text | `--foreground` / `--muted-foreground` | `#0a0a0a` / `#595959` | `#f5f5f5` / `#a3a3a3` | 18:1 / 6.4:1 on the surface (light) |
| Hairline / control line | `--border` / `--border-strong` | 14 % / 40 % ink | 16 % / 45 % ink | strong is 2.8:1 or more (control outline) |
| Texture | `--line-faint` | 7 % ink | 9 % ink | the 16 px grid and hatch only |
| **Accent (one)** | `--signal` | `#ea6024` | `#f26a2e` | an orange (the owner's `#f26a2e`, deepened in light to reach 3:1): for large display text (24 px and up) and marks and fills, 3.1:1 on the surface (light), 6.1:1 (dark). Text under 24 px takes `--signal-text` (`#b8420f` / `#f26a2e`: 5.0:1 / 6.1:1 on the surface). Text on a fill is `--signal-foreground` (`#0a0a0a`, 5.8:1 / 6.5:1). `--signal-wash` is its 8 to 9 % plate for the active Frame. |
| Kind hues | `--kind-article` 275, `-project` 150, `-artwork` 55, `-poem` 340, `-place` (muted grey) | `oklch(.58 .10 H)` | `oklch(.76 .10 H)` | **faint and redundant** (see Kind coding) |
| Inverse set | `--inverse-background/-foreground/-muted/-border/-signal` | the dark scheme's ink on page | and vice versa | what an inverted Frame rebinds the colour tokens to |

The accent is for state and for the generated covers' marks, nothing else: the contents entry being read, the highlighted search result, the active Frame, the error tag. It is not used for numerals, rules, labels or counts. The focus ring stays the foreground (it must never depend on the accent).

### Kind coding

Each kind has a **glyph** on a 12 px grid (article: lines of text; project: terminal prompt `>_`; artwork: two filled squares in a frame; poem: centred verse lines; place: crosshair) AND its word. `KindTag` draws the glyph plain beside the word (no box, no tint) and is used only where kinds are mixed: the search results (glyph; the group heading says the word) and the related entries of an entry. A list of one kind, a place's entries (already grouped under "Articles", "Projects") and an entry's own header do not repeat it as a tag (the entry says it once, in plain words, in its meta line). The kind hues only tint the lightest tone of a generated cover. Text is never set in a kind hue.

### Type

The direction (2026-10-12): the pixel globe is the only illustrative element; everything else is type. A very heavy display weight against a very thin one (the name: "Cata" 200, "lyst" 800), a reading serif for long text, mono for metadata, hairline rules, one accent. Three self-hosted families (`design-tokens.md`, "Typography": files, fallbacks, weights, the scale with its numbers) over the unchanged system stacks. Each role is a class in `app.css` (`.type-*`); a component composes them and names no family itself.

| Role | Face | Where |
| --- | --- | --- |
| `display-xl` (`.type-display-xl`) | Bricolage Grotesque 800, "Cata" at 200 (`.type-thin`), tight (0.88 leading, -0.045em), 56 to 158 px | the wordmark on the home page |
| `display-lg` | Bricolage 800, 36 to 72 px, 0.98 leading | a list's year numerals (`.type-thin`), specimens; an entry's headline is `.entry-title` (Newsreader 700, see "Entry pages") |
| `display-md` | Bricolage 700, 26 to 36 px | a card's title, a section of a list |
| `standfirst` | Newsreader italic 300, 24 to 30 px, balanced | the line under a headline |
| `reading` (`.type-reading`, `.ds-prose`) | Newsreader 400, 18 to 20 px / 1.65, 66 characters per line (`--measure-reading`), `pretty`; `.drop-cap` for the first paragraph (Newsreader 700, in the ink); links underlined in the accent; a quote is `.type-pullquote` (300 italic, 24 to 40 px, between two ink rules); headings Bricolage (h2 800, h3 300) | the body of an entry, the place's text; an entry page sets it at 18 to 21 px / 1.55 |
| `meta` (`.type-meta`) | JetBrains Mono 500, 12 px, uppercase, 0.1em | page metadata: a date, a place, a count, a reading time. Never the map's text |
| interface (existing) | system sans and mono as in the table below | buttons, filters, tags, controls, code blocks, the map and its credits |

The accent as text: `--signal` (large display text and marks) or `--signal-text` (under 24 px); see `design-tokens.md`, "Accent". Colour is never part of a role, and a role never sets a width: the reading column is `.type-measure`.

What is still the system sans until a component takes a role (the previous table, kept as the interface's scale):

| Use | Face | Size / line | Case |
| --- | --- | --- | --- |
| Page title | sans 600, tracking tight | 36 / 40, 48 / 52 from `md` (`text-3xl`, `text-4xl`) | sentence |
| Panel title | sans 600 | 36 / 40 (a place), 28 / 34 (an entry) | sentence |
| Card title | sans 600 | 22 / 30 (`text-xl`) | sentence |
| Section heading | sans 600 | 18 / 28 (`text-lg`) | sentence |
| Body (a card's summary, a row's name) | sans | 16 / 26 | sentence |
| Secondary (meta lines, captions, tags, counts) | sans, muted | 14 / 22 | sentence |
| Date, coordinates (`.ds-meta`) | mono, tabular, slashed zero, muted | 13 / 20 | as written, untracked |
| Buttons | sans 500 | 14 / 22 | sentence |
| Short code (`.ds-micro`, `MicroLabel`): `ERR / 500`, a key cap | mono, tabular | 11 / 16, 0.12em | UPPERCASE |

Body text is never under 16 px (reading 18 px) and secondary text never under 14 px. The micro-label is for a real code or key cap, never for a title, a kind, a count or a sentence; 11 px is the floor for any text. The two uppercase mono units are `.ds-micro` and `.type-meta`; `design-system.test.ts` counts them.

### Spacing, lines, layout

- 4 px base: Tailwind's scale (`gap-1` = 4 px). Panel padding 24 px (`--panel-pad`), 16 px inside a box.
- `--hairline` 1 px for every frame, divider and control line; the optional tick scale of a divider (`--tick-step` 8 px) is for the styleguide only.
- 12-column grid, 16 px gutter (`--grid-gap`): `Grid` and `Col span spanMd`. Side panel (half the viewport, at least 440 px): one column of blocks. Full screen: reading column 8 + aside 4 (`spanMd`).
- Controls: `--control-h` 44 px below `md` (touch), 36 px from `md`; small 44 / 32 px.

### Elevation

None. No shadows. Separation is space first; where a line is needed, a hairline, the step from `--background` to `--surface`, the active Frame's wash, or an inverted Frame. The detail panel keeps its existing 85 % page colour with backdrop blur (it lets the map continue faintly beneath it); that is a panel property, not a component elevation.

### Motion

Durations are the existing tokens (`design-tokens.md`, "Motion"). Hover and focus colour changes use `--duration-fast` (120 ms); toggles, reveals and state changes `--duration-base` (220 ms); the panel slide `--duration-slow`. The map's own timed transitions (150 to 200 ms) sit between fast and base, so one product feels like one clock. Easing is always `--ease-standard`. Nothing moves on hover (no lift, no scale): only line, fill and text colour change. The loading skeleton's sweep is the one ambient loop (`--duration-scan`); under `prefers-reduced-motion` it is removed and the global rule collapses the rest to ~0.

### Focus and density

The global focus ring (2 px `--ring`, 2 px offset, square) applies to everything. An inverted Frame rebinds `--ring`, so it stays visible there. Cards keep one tab stop (the title link); the pointer underlines the title and `:has(:focus-visible)` draws the focus ring around the whole card. Density is one knob, `--control-h`, plus the `sm` size; there is no separate compact theme.

## Components

All in `app/components/ui/`, importable from `~/components/ui` (barrel) or by file. All are presentational and composable: they take data, not routes or loaders.

| Component | Anatomy | States / variants |
| --- | --- | --- |
| `Frame` | hairline box on `--surface`; no decoration | `variant` plain, active (strong line and a faint signal wash), inverted (opposite scheme tokens rebound for the subtree); `interactive` (hover line, focus ring), `padding` none, sm 12, md 16, lg 24; `as` element |
| `MicroLabel` | `.ds-micro` text: a short code in mono capitals | `tone` muted, strong, signal; `as` element. Rare. |
| `KindTag` | the kind's 12 px glyph plain, and its word | `iconOnly` (word stays for assistive tech), `solid` (glyph in the foreground). Mixed lists only. |
| `StatusTag` | one plain word ("Draft") | `tone` muted (default), default, signal, solid, signal-solid; any string. Shown only when it tells something. |
| `DataList`, `DataRow` | `dl > div > dt + dd`, two columns: the key muted, the value beside it; no rules, no leaders | `mono` values (`.ds-meta`) |
| `Divider` | one hairline, optional tick scale and set-in label (styleguide) | `decorative` (default; `false` renders an `hr`) |
| `Button` | square, sans 500 14 px, 1 px line, 44 px high below md | `primary`, `secondary`, `ghost`, `link` (`default` and `outline` kept as aliases of primary / secondary); size default, sm; hover, focus-visible, disabled; `asChild` |
| `IconButton` | square `Button` with a 16 px glyph; `label` is required (the accessible name) | same variants; the panel's close is `ghost` |
| `Toggle` | `Button` with `aria-pressed`; pressed = inverted fill (a ghost toggle: the hover grey) | name never changes with state |
| `ExpandToggle` | ghost `Toggle` of the panel / full-screen switch; glyph swaps outward / inward corners | `expanded`, `showLabel`, size |
| `SegmentedControl` | group of `Toggle`s sharing 1 px lines (wraps on phones) | one value; the scheme choice in the styleguide |
| `CoverArt` | inline SVG of a dithered grid; `aria-hidden`; box takes the grid's aspect ratio | `seed`, `kind` (tint), `cols`, `rows`, `pattern` (field, bars, rings, stream, lattice; default: the seed picks) |
| `MetadataStrip` | `dl` of plain lines (date, place); the keys are for assistive technology only | one line each, truncated |
| `SectionHeader` | the heading in sans 18 px, a muted count after it; no number, no rule | `as` h2, h3, h4; `meta` |
| `TagList` | `ul` of muted text separated by middle dots (CSS) | static or links (44 px hit area on phones via `::before`) |
| `Stack`, `Grid`, `Col` | flex column with a 4 px-scale gap; the 12-column grid; a column with `span` / `spanMd` | |
| `Skeleton`, `StatePanel` | skeleton block with a scan sweep; the three non-content states; `headingLevel` (1 to 4) and `titleId` (focus target) | `state` loading (polite `role=status`, `aria-busy`, no frame), empty (one muted line: no frame, glyph or code), error (`role=alert`, an active Frame, the `ERR / 500` code in mono, `Error`, a retry action) |
| `EntryCard` | cover (authored image or generated, 16:9, one hairline) + optional kind (`showKind`, mixed lists only) + title + three-line summary + status + date and places as two plain lines + the first three tags as muted text | one link (the title), stretched over the card with `::after`; hover underlines the title, focus-within draws a ring; `orientation="horizontal"` puts the cover beside the text inside an `@container` of 28 rem or more (the place panel), `priority` loads the image at once (the first cards of a list) |
| `CopyButton` | ghost button that copies a string (or a function of the window) and confirms in place: its word turns to `Copied` (or `Not copied`) for 2 s, a polite status says it; no toast | drawn only once hydrated; clipboard API with an `execCommand` fallback; `glyph`, `label` (the accessible name), `announcement` |
| `Glyph` | the glyph set (5 kinds, close, expand, collapse, arrows, copy, link, check, search, hash) | decorative (`aria-hidden`) |

### Generative cover art

`lib/cover-art.ts`: `coverArt(seed, { cols, rows, pattern })` is a pure function of the seed (FNV-1a hash, mulberry32 generator, 4x4 Bayer dither): a `Uint8Array` of tonal levels 0 to 3, plus one or two signal marks, all within the grid; sizes clamp to 4..96 cells. `coverPaths` merges horizontal runs into one SVG path per level. Same seed gives the same art on the server and in the browser (no hydration mismatch, nothing stored). Level 1 is the kind's hue at 22 %, levels 2 and 3 are the ink at 20 % and 42 %, the marks are `--signal`. Use the entry's slug or id as the seed (stable across edits).

### Entry view (the panel and the full-screen view)

Implemented: `components/entry/entry-view.tsx` (one component for both containers), `components/entry/blocks.tsx` (the body renderer),
`components/place-detail.tsx` (the place), `components/entry-list-page.tsx` (the four list pages). Routes, URL scheme and focus rules:
[web-architecture.md](web-architecture.md#entries-in-the-shell-routes-containers-url-scheme). The typography and the grid are in "Entry pages" below.

Same content, two layouts; `layout` only changes the grid (CSS), never the data, the DOM order or the focus order.

```
<article class="entry" data-surface="reading" aria-labelledby="panel-heading">   // a container: the type scales with its width (cqi)
  [Back to <place>]                                                // only when opened from a place panel
  double rule                                                      // 3 px, 3 px gap, 1 px
  ARTICLE · Ljubljana, Zagreb +2                       6 min read   // kicker (mono, uppercase): kind, places, status / reading time
  h1#panel-heading                                                 // Newsreader 700; the clause after a comma / colon / dash at 300
  summary                                                          // standfirst: Newsreader italic 300
  2026.03.14   Ljubljana ↗ open on the globe              Copy link // dateline (mono), under an ink rule
  Marginalia: Where, Written, Linked, the authored facts, tags, "Open host", Contents
  Lead image (authored; a generated cover only for an artwork)
  Text: BlockRenderer (drop cap, headings, pull quotes, lists, verse, code, link cards)
  Figures (article, project): the images set apart from the text, numbered "Fig. N"
  Related (three EntryCards)    Previous / Next of the kind
```

Both layouts are one column on a phone and in the half panel (header, dateline, marginalia in a compact grid, text, figures). A full screen from 1024 px is a 12-column grid with 28 px gutters: marginalia in columns 1 to 3 (sticky contents), text in 4 to 9, figures in 10 to 12 (an artwork: image and text in 4 to 12; a poem: title and lines in 4 to 10, marginalia beside the title). The header row of the container
(Close, `ExpandToggle`, both ghost: no box until pointed at) is the panel's, not the view's: it must stay clear of the navbar's row (centred over the map while the panel is open, over the viewport in full screen: it is
clear of both, see "Brand and header"). On a phone the panel is a dialog with a compact header (the close button alone; the content's heading names the
dialog). Lists of entries are hairline rows (`EntryRow`: "Entry pages" below); `EntryCard` (cover, title, summary) remains for the place panel and the related entries. An empty list is one muted line (`StatePanel`,
`headingLevel` 2 under the page's h1).

Body blocks (all plain text, no inner HTML anywhere; a test scans the components for it): `paragraph` (hard line breaks as `<br>`),
`heading` (h2/h3 in the display face, 800 / 300, sentence case, with a stable anchor id and a `#` link on hover; no numbering), `list` (square markers / numerals),
`quote` (the pull quote role, cite as a mono caption), `image` (a figure under an ink rule, no box, width/height to avoid layout shift, lazy, a mono caption that starts with "Fig. N"; an unsafe path is dropped), `verse` (the reading face, 300 at the poem's scale; one paragraph per stanza, a block per line with its leading
spaces as a `ch` offset and a 2ch hanging indent when it wraps, a 1.4 em stanza gap), `code` (a Frame with the language as a small mono label, a
horizontally scrollable focusable `pre`, a copy button that exists only once hydrated and where the clipboard API does), `link`
(consecutive links form one list of cards; https only, `rel="noopener noreferrer"`, new-tab note for assistive tech; an invalid URL
is shown as plain text), `divider` (a plain `hr`; leading, trailing and repeated dividers are dropped). The pure parts live in
`lib/entry-blocks.ts`.

### Entry pages (typography)

The grammar of the "Article on paper" and "Poem at night" boards of the owner's canvas (2026-10-12), in words. Tokens and numbers: `design-tokens.md`, "Typography" and "Reading surface"; code: `app.css` (reading section, `.entry-*`), `components/entry/`, `lib/entry-typography.ts` (tested). Live: `/dev/design`, section 13.

- **Surface.** Paper (`#efeadf`, ink `#16130f`) in the light scheme, night (`#0b0c0f`, ink `#ece8df`) in the dark, for an entry (panel and full screen) and for the four lists; the map, the place panel and the home page keep the neutral page. One accent, `--paper-signal` for marks and large text, `--paper-signal-text` for small text.
- **Heavy against thin.** A headline in Newsreader 700 at up to 132 px (0.92, -0.03em, optical size 72), its clause after a comma, a colon or a dash at 300; the standfirst thin italic (300, 24 to 30 px); a pull quote thin italic at up to 40 px between two ink rules; section headings Bricolage 800, third level 300; a list's year numerals Bricolage 200 at the headline scale against titles at 800. A poem's title is Newsreader italic 200 at up to 128 px over lines at 300 (up to 36 px, 1.38).
- **Mono is the apparatus.** Kicker, dateline, marginalia, contents, captions, tags in the marginalia: JetBrains Mono 12 px, muted, the labels (Where, Written, Linked, the authored fact names) uppercase in the ink. Interface text (buttons, filters) stays sans.
- **Rules, not boxes.** A double rule under the masthead (3 px, 3 px gap, 1 px) and 1 px ink rules over the dateline, the marginalia, the text, each figure and "Related". No cards, no borders, no brackets, no numbering except "Fig. N" before a caption.
- **Computed, never invented.** The marginalia rows are the places (links, with their region as published), the month and year of the date, and the counts of linked places and entries (the entries count only when the list is not capped); an authored fact of the same name wins. There is no author line: none is published. Reading time is computed (`reading.ts`) unless the entry authors one.
- **Figures.** In an article or a project the images are set apart from the text (third column; after the text on a phone, same DOM order) and numbered in the order they appear. An artwork's image stays the hero and its images stay in the text, wide. A generated cover stands in only for an artwork without an image: text is the page elsewhere, and a placeholder would be decoration.
- **Drop cap.** The first paragraph of an article or a project when it is a paragraph of 200 characters or more starting with a letter: Newsreader 700, 5.33 em, in the ink.
- **Poem.** Title and lines in columns 4 to 10, marginalia (place, date, "open on the globe", the note about the poem) beside the title, lines exactly as authored, one block per line, leading spaces kept; on a phone the title, the lines, then the marginalia.
- **Lists.** The double rule, a mono count, the section's name at the headline scale, an ink rule, the tag filter (text links, the chosen one heavier and underlined), then hairline rows: a mono column (date, places, status), the title in Bricolage 800 over a summary in Newsreader 300, the image where there is one; years as thin numerals only where a year holds more than one entry.
- **Scale.** The entry is a container: headline, body and poem scale with its width (`cqi`), so the half panel and the full screen are one design at two widths; the clamps are in `app.css` (`--entry-title`, `--entry-body`, `--poem-title`, `--poem-size`).

### The place panel

The name (h1), then one quiet line: region and country (each word once; the country derived from the place's country code), the
coordinates at the precision they are stored with (`48.85° N, 2.35° E`: a value written with two decimals is not padded to four, that would be
false precision) and the dates. Then the summary, the text, the images and the entries grouped by kind under their own headings ("Articles 2",
the cards h3). A place without entries shows nothing for them (no section, no empty box). The kind is not said on the cards (the heading says it).

### Reading aids, lists, search (docs/web-architecture.md has the mechanics)

- **Reading.** Computed `N min read` in the meta line for articles without an authored `Reading time`; a **contents** (>= 3 headings, plain
  text, nested ones indented and muted) in the full view only (same markup in the panel, hidden by CSS), the current section marked
  `aria-current="location"` with a signal tick, a "Jump to contents" skip link beside the copy-link button; a `#` **anchor** on every heading
  (hover, focus, always on touch); **Copy link** in the dateline (a poem: in its marginalia) and **Copy** on code blocks (`CopyButton`); tags are links to the kind's
  filtered list.
- **Lists.** A plain count ("5 articles", "2 of 5 articles" filtered) in mono over the section's name at the headline scale, then a **tag filter**: one row of text links (the chosen
  one heavier and underlined, `aria-current`, no boxes, no counts) under an ink rule, above hairline rows; **year headings** (thin display numerals) only where
  years group entries. The state is the URL (`?tag=`); on a phone the row scrolls sideways.
- **Empty states.** Home with no place: the globe stays and `ArchiveEmpty` (a small plate under one ink rule, "Nothing on the globe yet" in the display face, one
  line in the reading face and the four lists with their counts in mono) sits bottom left; a list with no entries is one muted line ("Nothing here yet."); a place
  with none shows no entries section.
- **Search.** A modal dialog on the surface Frame: a combobox input with the glyph, an `Esc` key cap, group headings in mono, rows of kind
  glyph + title (display face, 700) + date or region, the highlighted one on the hover grey with a 2 px signal tick, a footer of key hints and the result count.
  The trigger is a 44 px icon button with `⌘ K` / `Ctrl K` from `lg`.
- **Print.** Ink on white, no globe, navigation, controls, contents, related cards or neighbours; external link addresses are written out.

## Brand and header

**The mark** (2026-10-12; `scripts/brand/mark.mjs`, `components/ui/logo-mark.tsx`, section 12 of `/dev/design`): a square and a disc
overlapping, the overlap knocked out. The square is the bounding box, the disc is the globe: the two things the map is made of. 16 x 16
grid, one bit per cell, solid shapes, no outline, no gradient, `currentColor`; whole multiples of 16 px stay crisp, and it is legible
at 16 px. It says nothing in words, so it survives a rename; the name sits beside it as the **wordmark** (`LogoWordmark`: the mark and
the site's name as text in the display weight, semibold and tight, the mark at the height of the capitals). Both are monochrome: the
accent stays for state. The look of the site is a studio's (heavy typographic work, big bold display type against thin text, mono
accents, hairline grids, restraint) over the pixel-art globe: the mark is the one geometric shape of that language and it never
carries texture. Where it is used: the favicon (SVG, follows the scheme; ICO at 16, 32, 48 px on the dark tile), the home-screen and
manifest icons, the styleguide, and `LogoMark` / `LogoWordmark` for the places that want them (neither is in the header). To change it,
edit `MARK` in `mark.mjs`, run `pnpm --filter @catalyst/web brand`, paste the new path into `logo-mark.tsx`; the test says when they
differ. Alternatives that were drawn and set aside: a pixel sphere with a dithered shadow side inside a dashed bounding box (the first
choice: it carried the globe's own look, but its texture is noise at 16 px and it does not sit beside a wordmark); a solid disc with
a bounding box cut out of it (bold, but a round silhouette like any button); a C-shaped globe holding a place (a monogram that ties the
mark to the name "Catalyst"); a disc with one squared corner (a leaf shape, generic).

**The header** (`components/navbar.tsx`): one centred row of text and no logo (owner: the icon in the corner went). In order: the
site's name as a plain text link home (the wordmark as text: foreground colour, semibold, tight; a hairline after it), Projects, Articles, Artworks, Poems (muted; the
current one in the foreground and underlined, `aria-current="page"`), the search trigger. Centred over the viewport; while the place
or entry panel is open beside the globe it is centred over the map (the left half), so it never meets the panel's Close and expand
controls, and it glides with the panel. Its width decides what it shows (container query): the name and the four sections always,
the search trigger from 28 rem, its key hint from 36 rem. 44 px targets. Over content that scrolls (lists, 404, errors) it has the
page scrim; over the globe and the map a soft fade of its own, 85 % of the page colour at the top edge easing to nothing, only as wide
as the row (design-tokens.md, "Nav fade"). Details and measurements: [web-architecture.md](web-architecture.md#floating-navbar-and-scrim).

## Accessibility rules

- Contrast: all text AA (4.5:1) in both schemes on the page, the surface and, for muted text, the hover grey; body text 7:1 or more; control outlines 2.8:1 or more; the hairlines are deliberately quiet (decorative). `--subtle-foreground` only on the page and the surface. Enforced by `design-system.test.ts`.
- Hue never carries meaning: kind = glyph + word, status = the word, error = the word and an inverted tag, selected = inverted fill and `aria-pressed` (a ghost toggle: the hover grey and its swapped glyph).
- Touch targets 44 px below `md` (`--control-h`, link tags' and heading anchors' `::before`, filter links and place rows `min-h-11`).
- Keyboard: DOM order is reading order (header controls, title, sections, footer); one tab stop per card; toggles are real buttons with `aria-pressed`; Escape behaviour stays the panel's.
- Focus is always visible (global ring); no component removes the outline except the card link, whose card shows the focus instead (`:has(:focus-visible)` ring around the card).
- No text in images: covers are generated art with no glyphs and are `aria-hidden`; authored images need `alt`.
- Decoration (the styleguide's grid, hatch and tick scale) is `aria-hidden` or pure CSS and removable without losing information; the middle dots between tags are CSS content with an empty alternative text. Forced colours: pressed buttons use `Highlight`.
- Reduced motion: no ambient animation, transitions collapse to ~0.
- Live regions: loading is `role=status`, errors `role=alert`, the list filter, the search results and "Copied" are polite statuses.

## Dev styleguide

`/dev/design` (`routes/dev-design.tsx`) is guarded exactly like `/dev/street`: `routes.ts` registers it only when `NODE_ENV !== "production"` or the build sets `CATALYST_DEV_ROUTES=1`, and its loader answers 404 anywhere else. Production builds contain neither the route nor its sample strings (made-up placeholders only). `?scheme=light|dark` or the on-page toggle sets `data-scheme` on `<html>`; the "Both schemes" section forces each scheme per block, whatever the toggle says.
