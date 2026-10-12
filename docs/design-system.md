# Design system

The UI system for the data display: the side panel and the full-screen view that show places and entries (kinds: article, project, artwork, poem, and the place itself) and the list pages. It sits on the values in [design-tokens.md](design-tokens.md) and does not touch the map, its labels or the globe canvas. Live reference: the dev-only styleguide at `/dev/design` (every token and component, both schemes, sample entries as cards and as a panel mock, the loading / empty / error states). Code: `apps/web/app/components/ui/` (React), `app/app.css` (`ds-*` classes and tokens), `app/lib/{entry-kind,labelling,cover-art,contrast}.ts` (pure logic, tested).

## Principle: a quiet personal archive

The first version of this system (2026-10-08) read the brief ("Y2K art, generative art, labellisation, square edges, Watch Dogs style") as a
HUD: corner brackets on every box, index codes, numbered sections, tracked mono labels everywhere. The owner asked for something "a bit less
AI" (2026-10-11) and the system was restrained (2026-10-12). What stayed of the brief is the square edges, the hairlines, the generative
covers and the one cyan accent; the annotation language is now used only where it carries information.

| Principle | What it means here |
| --- | --- |
| Square edges | Radius 0 everywhere (all `--radius-*` tokens are 0; a test scans the components). No pills, no soft shadows. |
| Few boxes | Spacing and a cover separate things; a hairline box is for the few things that are one (a code block, a link card, the search dialog, an error). A card has no box, a list has no chips, metadata has no inner rules, an empty state is one muted line. No corner brackets anywhere in the UI (the map's detection boxes keep their own corner arms). |
| Label only when it adds information | No decorative numbering (`01 ENTRIES`, `№ 0042`, `000 entries`), no index codes, no eyebrow that repeats the page's title, no kind on a card in a list of one kind, no "Place" on a place. A date, a place, a count, a tag say what they are. |
| One sans scale | Titles, body and secondary text are sans at comfortable sizes (body 16 px or more, secondary 14 px). Mono is for figures that are read as values: dates, coordinates, short codes, the map's own text, the credits line. Sentence case; the tracked uppercase mono micro-label is the exception, not the language. |
| One accent, for state | The cyan `--signal` marks state: the contents entry being read, the highlighted search result, the active Frame, the error tag; and the marks of generated covers. Never decoration (no numerals, no rules, no labels). |
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
| **Accent (one)** | `--signal` | `#00698c` | `#38d4f5` | a cyan: 5.6:1 on the surface (light), 10.6:1 (dark). Fills use `--signal-foreground` (`#fbfbfb` / `#0a0a0a`, 6.0:1 / 11:1). `--signal-wash` is its 8 to 9 % plate for the active Frame. |
| Kind hues | `--kind-article` 275, `-project` 150, `-artwork` 55, `-poem` 340, `-place` (muted grey) | `oklch(.58 .10 H)` | `oklch(.76 .10 H)` | **faint and redundant** (see Kind coding) |
| Inverse set | `--inverse-background/-foreground/-muted/-border/-signal` | the dark scheme's ink on page | and vice versa | what an inverted Frame rebinds the colour tokens to |

The accent is for state and for the generated covers' marks, nothing else: the contents entry being read, the highlighted search result, the active Frame, the error tag. It is not used for numerals, rules, labels or counts. The focus ring stays the foreground (it must never depend on the accent).

### Kind coding

Each kind has a **glyph** on a 12 px grid (article: lines of text; project: terminal prompt `>_`; artwork: two filled squares in a frame; poem: centred verse lines; place: crosshair) AND its word. `KindTag` draws the glyph plain beside the word (no box, no tint) and is used only where kinds are mixed: the search results (glyph; the group heading says the word) and the related entries of an entry. A list of one kind, a place's entries (already grouped under "Articles", "Projects") and an entry's own header do not repeat it as a tag (the entry says it once, in plain words, in its meta line). The kind hues only tint the lightest tone of a generated cover. Text is never set in a kind hue.

### Type

No web font is added. The sans and mono stacks of `design-tokens.md` are system fonts (zero bytes, no layout shift, native rendering), and the system mono already reads as the technical HUD face. Swapping to a vendored OFL face later is one token each (`--font-sans`, `--font-mono`); no component names a family.

| Use | Face | Size / line | Case |
| --- | --- | --- | --- |
| Page title | sans 600, tracking tight | 36 / 40, 48 / 52 from `md` (`text-3xl`, `text-4xl`) | sentence |
| Panel title | sans 600 | 36 / 40 (a place), 28 / 34 (an entry) | sentence |
| Card title | sans 600 | 22 / 30 (`text-xl`) | sentence |
| Section heading | sans 600 | 18 / 28 (`text-lg`) | sentence |
| Summary, reading text | sans | 18 / 28 (`.ds-prose`), blocks limited to `60ch` (about 65 characters), `text-wrap: pretty`; headings `balance` | sentence |
| Body (a card's summary, a row's name) | sans | 16 / 26 | sentence |
| Secondary (meta lines, captions, tags, counts) | sans, muted | 14 / 22 | sentence |
| Date, coordinates (`.ds-meta`) | mono, tabular, slashed zero, muted | 13 / 20 | as written, untracked |
| Buttons | sans 500 | 14 / 22 | sentence |
| Short code (`.ds-micro`, `MicroLabel`): `ERR / 500`, a key cap | mono, tabular | 11 / 16, 0.12em | UPPERCASE |

Body text is never under 16 px and secondary text never under 14 px. The micro-label is for a real code or key cap, never for a title, a kind, a count or a sentence; 11 px is the floor for any text.

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
[web-architecture.md](web-architecture.md#entries-in-the-shell-routes-containers-url-scheme).

Same content, two layouts; `layout` only changes the grid, never the data, the DOM order or the focus order.

```
<article aria-labelledby="panel-heading">                          // panel: half the viewport; full screen: max-w-6xl column
  [Back to <place>]                                                // only when opened from a place panel
  Article · 2026.03.14 · 6 min read · Draft                       // one muted line: the kind in words, the date (mono), reading time, status when it tells something
  h1#panel-heading (text-2xl; text-3xl / 4xl full)                 // the view's one h1, focus target
  summary (60ch)
  [Copy link]
  details: plain key / value rows, tags as muted text, "Open host" primary button (https only, new tab note)
  Cover: authored image (width/height set) or CoverArt seeded by the slug, one hairline, always 1.91:1
  Body: BlockRenderer (h2 / h3 plain, paragraphs, lists, quote, image, verse, code, link cards, divider)
  Places (links to /locations/:slug: name and region)    Contents (full screen: sticky, scroll-spy)
  Related (three EntryCards, the kind said)    Previous / Next of the kind (two plain links)
```

Panel: one column. Full screen: title (8 columns) with the details (4), then reading column (8: cover and body) with the aside
(4: places, then the sticky contents); the related cards and the neighbours close both layouts at full width. The header row of the container
(Close, `ExpandToggle`, both ghost: no box until pointed at) is the panel's, not the view's: it must stay clear of the navbar's links (and, in
full screen, of its logo). On a phone the panel is a dialog with a compact header (the close button alone; the content's heading names the
dialog). Lists of entries use `EntryCard` (via `EntryListCard`) in a `Grid` (`Col spanMd={6}`); an empty list is one muted line (`StatePanel`,
`headingLevel` 2 under the page's h1).

Body blocks (all plain text, no inner HTML anywhere; a test scans the components for it): `paragraph` (hard line breaks as `<br>`),
`heading` (h2/h3 in sentence-case sans with a stable anchor id and a `#` link on hover; no numbering), `list` (square markers / numerals),
`quote` (hairline rule, cite as a plain muted line), `image` (one hairline, width/height to avoid layout shift, lazy, caption as muted
secondary text; an unsafe path is dropped), `verse` (the page's own sans face; one paragraph per stanza, a block per line with its leading
spaces as a `ch` offset and a 2ch hanging indent when it wraps), `code` (a Frame with the language as a small mono label, a
horizontally scrollable focusable `pre`, a copy button that exists only once hydrated and where the clipboard API does), `link`
(consecutive links form one list of cards; https only, `rel="noopener noreferrer"`, new-tab note for assistive tech; an invalid URL
is shown as plain text), `divider` (a plain `hr`; leading, trailing and repeated dividers are dropped). The pure parts live in
`lib/entry-blocks.ts`.

### The place panel

The name (h1), then one quiet line: region and country (each word once; the country derived from the place's country code), the
coordinates at the precision they are stored with (`48.85° N, 2.35° E`: a value written with two decimals is not padded to four, that would be
false precision) and the dates. Then the summary, the text, the images and the entries grouped by kind under their own headings ("Articles 2",
the cards h3). A place without entries shows nothing for them (no section, no empty box). The kind is not said on the cards (the heading says it).

### Reading aids, lists, search (docs/web-architecture.md has the mechanics)

- **Reading.** Computed `N min read` in the meta line for articles without an authored `Reading time`; a **contents** (>= 3 headings, plain
  text, nested ones indented and muted) in the full view only (same markup in the panel, hidden by CSS), the current section marked
  `aria-current="location"` with a signal tick, a "Jump to contents" skip link after the copy-link button; a `#` **anchor** on every heading
  (hover, focus, always on touch); **Copy link** under the summary and **Copy** on code blocks (`CopyButton`); tags are links to the kind's
  filtered list.
- **Lists.** A title and a plain count ("5 articles", "2 of 5 articles" filtered), then a **tag filter**: one row of text links (the chosen
  one heavier and underlined, `aria-current`, no boxes, no counts) above a 1 / 2 / 3 column grid; **year headings** (a plain year) only where
  years group entries. The state is the URL (`?tag=`); on a phone the row scrolls sideways.
- **Empty states.** Home with no place: the globe stays and `ArchiveEmpty` (a small plate with one hairline, "Nothing on the globe yet", one
  line and the four lists with their counts) sits bottom left; a list with no entries is one muted line ("Nothing here yet."); a place
  with none shows no entries section.
- **Search.** A modal dialog on the surface Frame: a combobox input with the glyph, an `Esc` key cap, group headings in sans, rows of kind
  glyph + title + date or region, the highlighted one on the hover grey with a 2 px signal tick, a footer of key hints and the result count.
  The trigger is a 44 px icon button with `⌘ K` / `Ctrl K` from `lg`.
- **Print.** Ink on white, no globe, navigation, controls, contents, related cards or neighbours; external link addresses are written out.

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
