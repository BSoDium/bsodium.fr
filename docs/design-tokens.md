# Design tokens

The UI system built on these tokens (frames, type roles, kind coding, components) is in [design-system.md](design-system.md); this file keeps the values.

Source of truth: `apps/web/app/app.css`. Colors, radii, motion and layout are CSS variables on `:root`;
Tailwind 4 reads them through `@theme` / `@theme inline`. Light and dark follow `prefers-color-scheme`
(no toggle for visitors; `[data-scheme="light"|"dark"]` forces a scheme on a subtree and is set only by the dev styleguide). Names match shadcn/ui's contract so selectively added components work unchanged.

Principles: monochrome with one accent, generous spacing, clear hierarchy. The system stack plus three self-hosted fonts (display, reading, metadata), no remote font requests.
The navbar has no surface of its own: it floats over the page and a gradient (a scrim over content, a fade over the globe) keeps it readable (see "Nav scrim").

## Color

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--background` | `#fbfbfb` | `#0a0a0a` | page |
| `--foreground` | `#0a0a0a` | `#f5f5f5` | text, primary fill |
| `--accent` | `#ececec` | `#1f1f1f` | hover and selected rows |
| `--muted-foreground` | `#595959` | `#a3a3a3` | secondary text (AA: 6.8:1 light, 7.9:1 dark) |
| `--subtle-foreground` | `#6f6f6f` | `#8a8a8a` | the map's credits line: dimmer than muted text by COLOUR (4.9:1 light, 5.7:1 dark against the page; muted is 6.8 / 7.9), never by opacity; hover and keyboard focus raise it to `--foreground` |
| `--border` | `rgb(0 0 0 / .14)` | `rgb(255 255 255 / .16)` | hairlines |
| `--border-strong` | `rgb(0 0 0 / .4)` | `rgb(255 255 255 / .45)` | outlined buttons (not the credits dialog, which uses `--border`) |
| `--ring` | `#0a0a0a` | `#f5f5f5` | focus ring (2px outline, 2px offset, all focusable elements) |
| `--primary` / `--primary-foreground` | `#0a0a0a` / `#fbfbfb` | `#f5f5f5` / `#0a0a0a` | default button |
| `--signal` | `#ea6024` | `#f26a2e` | the one accent: LARGE display text (24 px, or 18.66 px bold, and up), non-text marks (underline, tick, rule, a cover's mark) and fills. 3.27:1 on the page and 3.08:1 on the surface in light, 6.5:1 and 6.1:1 in dark. See "Accent" below |
| `--signal-text` | `#b8420f` | `#f26a2e` | the accent as text of any size under 24 px: 5.31:1 on the page, 4.99:1 on the surface, 4.65:1 on the hover grey (light); 6.5 / 6.1 / 5.4:1 (dark) |
| `--signal-foreground` | `#0a0a0a` | `#0a0a0a` | text on a `--signal` fill: 5.84:1 (light), 6.48:1 (dark) |
| `--globe-grid`, `--globe-limb` | `rgb(0 0 0 / .12)`, `rgb(0 0 0 / .3)` | `rgb(255 255 255 / .14)`, `rgb(255 255 255 / .34)` | no longer read by the map: the graticule is the palette's `faint` level (level 3) and the horizon outline is one level fainter (level 2, `outlineLevel` in `engine/colors.ts`: 1.24:1 light, 1.21:1 dark against the page; it was `soft` until 2026-10-07 and `faint` until 2026-10-08, when the owner found the globe's ring still too visible; floor 1.2:1, `colors.test.ts`); the tokens remain for any other use |

### Map palette

The globe and the street map draw with one grey palette derived from `--background` and `--foreground` only (OKLab interpolation, `app/globe/engine/palette.ts`, `PALETTE_LEVELS` = 12 levels: page colour, 10 map greys, full ink). The map greys (levels 1 to 9) only reach `MAP_CONTRAST` (0.40 light, 0.42 dark; it was 0.55 / 0.58 until 2026-10-08, when the owner asked to wash the map out so the boxes and labels stand out) of the way to the ink, so everything the map draws is recessive: the loudest map tone (`coast`: coastlines, country borders, the water's edge) is 3.1:1 / 3.2:1 against the page (was 5.2:1 / 5.5:1, floor 1.5:1), the roads are below it (motorways level 7, primary 6, secondary 5, tertiary 3, the decor 2 and 1: 2.1:1 at the loudest, 1.42:1 for tertiary, the faint end untouched at 1.10 / 1.24 / 1.42 light, see `docs/street-architecture.md`, "Road hierarchy"), so a box at rest dominates the map. One level above the coast, `peak` (level 10) is the box at rest and keeps its old tone, `BOX_CONTRAST` (0.55 / 0.58: 5.2:1 / 5.5:1, 1.7 times the coast's contrast), so the box stays the loudest of the greys by a wide margin. The full ink (`ink`, 19:1 / 18:1) is kept for the hovered, focused or selected detection box and for the route; a box at rest is the `peak` level (above the coast); the LABELS are HTML text in the page's `--foreground` in every state, see "Typography" (the pixel label tones, `textFloorLevel` in `palette.ts`, remain for pixel text that is part of the map), see `docs/web-architecture.md`, "Detection boxes". Named roles: `wash` (building fills), `faint` (graticule; the globe's horizon outline is the level below it), `soft` (rail, paths, horizon, the dots of parks and dashes of water), `mid` (region borders, building outlines), `strong` (rivers, lakes), `coast` (coast, country borders, the water's edge: the loudest the map gets), `peak` (the box at rest), `ink`. Contrast against the page per level at 12 levels, light / dark: 1.10 / 1.08, 1.24 / 1.20, 1.42 / 1.39, 1.48 / 1.45, 1.61 / 1.58, 1.81 / 1.79, 2.10 / 2.10, 2.52 / 2.55, `coast` 3.12 / 3.18, `peak` 5.23 / 5.51, `ink` 19.1 / 18.2. A token change reaches both renderers with no code change, light and dark; `app/globe/engine/readability.test.ts` recomputes the contrast of labels, markers, attribution and nav over the map from the tokens. Spec and comparison: `docs/pixel-line-rules.md` section 7 and `docs/palette/`.

The globe's ocean has no token of its own: it is `--background` (the disc and the clear colour are exactly the page colour, so the canvas never shows a seam). The detail panel uses `--background` at 85% with a backdrop blur.

UI-system additions (2026-10-08, values and use in design-system.md): `--surface` (`#f4f4f4` / `#121212`, the panel plate), `--line-faint` (grid and tick texture), the one accent `--signal` with `--signal-text`, `--signal-foreground` and `--signal-wash` (see "Accent" below; it was a cyan until 2026-10-12), the `--inverse-*` set (an inverted frame's rebinding, including `--inverse-signal` and `--inverse-signal-text`), and a faint hue per kind (`--kind-article|project|artwork|poem|place`, the generated covers' lightest tone only). `design-system.test.ts` keeps the four copies of the colour list (light, dark, and the two forced-scheme rules) identical and asserts the AA pairs.

### Accent

The one accent is orange. The owner's value is `#f26a2e`; it is used as is in the dark scheme (6.48:1 on the page, so it is AA even as small text there). In the light scheme `#f26a2e` is 2.95:1 on `#fbfbfb` and 2.78:1 on `#f4f4f4`, a little under the 3:1 that large text and graphics need, so `--signal` is `#ea6024` there (3.27:1 on the page, 3.08:1 on the surface; the same hue, 8 / 10 / 10 steps of RGB deeper). Changing the accent later is the five accent lines of `app.css` (`--signal`, `--signal-text`, `--signal-foreground`, `--signal-wash`, and the two `--inverse-signal*`), times the four copies of the list; the tests say what no longer holds.

| Use | Token | Rule |
| --- | --- | --- |
| Display text of 24 px and up (or 18.66 px and up in bold), the drop cap, `text-signal` | `--signal` | 3:1 on the page and the surface (`design-system.test.ts`) |
| Non-text marks: link underline, the active tick, the progress line, a cover's mark, a rule | `--signal` | 3:1 |
| Any text under that size (a status word, a micro-label, a meta line) | `--signal-text` (`text-signal-text`) | 4.5:1 on the page, the surface and the hover grey |
| Text on a filled accent block | `--signal-foreground` on `--signal` | 4.5:1; the fill is orange with ink on it in both schemes |
| Inside an inverted frame | `--signal` and `--signal-text` are rebound to `--inverse-signal` / `--inverse-signal-text` | 3:1 and 4.5:1 on the inverted page |

The accent stays out of the map and the globe (they are monochrome); on paper (`@media print`) both tokens are black.

Tailwind utilities: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-accent`, etc.
The map and the globe stay monochrome: the accent `--signal` and the kind hues are for the data-display UI only, and there is no destructive color on purpose (an error is the word Error in an inverted tag).

### Sky

The globe's skybox (`SKY` in `app/globe/engine/tuning.ts`; architecture in web-architecture.md, "Skybox") uses no colour of its own: its tones are palette levels, so a token change reaches it. The band is BELOW the graticule and the horizon outline's neighbour: its two tones are levels 1 and 2 (`skyTop(levels)`, one below `faint`), measured dark 20 and 31 on the page's 10 (graticule 43), light 240 and 227 on 251 (graticule 213). The stars add a third tone, capped at the graticule's own level (`starTop`, level 3; never above it, so the sky cannot outshine the boxes, labels or the graticule's dots): three tiers (levels 1, 2, 3) with a heavy-tailed share, 60 / 28 / 12 %. The horizon outline is level 2 (`outlineLevel`, design-tokens "Map palette"), the band's bright tone. Quantised with a 4x4 Bayer dither on the art cell, never a gradient.

| Constant | Value | Meaning |
| --- | --- | --- |
| `fade.from`, `fade.to`, `fade.limb` | 1, 1.55, 0.55 | earth radii from the disc's centre. The sky is DIMMED, never removed, towards the earth: `limb` (55 %) of its strength from the silhouette to `from`, easing up to all of it at `to` (smoothstep, applied before the dither; stars are thinned at random, not dimmed). It was a cut (nothing inside 1.06 radii, all of it from 1.55) until 2026-10-08, when the owner found it masked the background around the planet |
| `onRho.rho`, `band` | 1.75, 0.05 | the sky is on while the picture's farthest corner is beyond this many radii (hysteresis +-band); timed 200 ms switch |
| `band.gain` | 0.9 | brightest the band gets, of the top tone (1 = the second tone solid) |
| `band.brightness` | edge 0.5, core 1 | anticentre and galactic centre |
| `band.thicknessDeg` | edge 5.5, core 10 | 1 sigma half thickness in degrees of galactic latitude |
| `band.bulge`, `band.rift` | 0.5 share, 7 deg; depth 0.8, 2.6 deg wide | nuclear bulge and the Great Rift dust lane |
| `band.noise` | 3 octaves, floor 0.5, breaks below 0.34 | mottling and dust breaks |
| `stars.count`, `bandBoost`, `tierShares` | 20000, 1.8, [0.6, 0.28, 0.12] | about 430 to 510 in view at the whole-globe view on a desktop (about 46 lit pixels at the brightest tone); up to 1.8x denser along the band. Tones: level 1, level 2, level 3 (the graticule's: the cap). One cell each, no sparkles. Owner 2026-10-08: "not super bright, just a bit brighter", for noise over the band and the open sky |
| `eraDeg` | 70 | the earth rotation angle at load (the sky's one placement against the earth) |
| `seed` | `0x5ca1ab1e` | every random choice (positions, tiers, keep ranks) |

Light scheme: kept (dark specks of 11 and 24 levels below the page colour on 251), because at those values it reads as the same barely-there haze as the dark one and the stipple does not compete with the boxes; `?no-sky` is the off switch.

### Map card and credits line

`MAP_CARD` (`app/lib/map-card.ts`) is the small card that sits over the map: `rounded-sm border border-border bg-background/80 px-1.5 py-0.5 font-mono text-[10px] leading-4 tracking-wide backdrop-blur-sm`. Two things use it, so they match: the dev-only content badge (`PREVIEW local data not published`, bottom left, muted text, above the credits on phones) and the credits line. A test (`components/map-card.test.ts`) fails if either drops a class of it. Colour is not part of it.

`AttributionButton` (`components/attribution-button.tsx`) is the credits line: one line of selectable mono text with the main contributors ("© OpenStreetMap · OpenFreeMap · Natural Earth", from `core/attribution.ts`), in the dim `--subtle-foreground` at full opacity, then one more middle dot (the same separator as between the credits: "… · Natural Earth · See more ↖"; an `aria-hidden` span of the card's flex row, OUTSIDE the clipped text, so it stays beside the button when the line is clipped), then a "See more" button with a lucide `ArrowUpLeft` (`aria-hidden`), at the bottom right of the map, left of the detail panel's inset. The text is clipped, never wrapped, when the screen is narrow (last items first). The button is a `<button aria-haspopup="dialog" aria-label="See more credits">` that opens the credits dialog; it is 16 px high with an invisible `::after` that makes the touch target 44 px below `md`. Hover and keyboard focus raise the colour to `--foreground`, plus the global focus ring. The text halo of the old link (`.credits-link`) is gone: the card's plate does its job (worst case, a full-strength peak map line under a glyph, is 3.7:1 in light; `readability.test.ts`, which reads the plate from `MAP_CARD`). The credits dialog uses `--border` (the card's hairline) for its panel and its Close button, not `--border-strong`.

## Typography

Three self-hosted font families sit beside the system stack. They are SIL Open Font License 1.1 (licences beside the files in `apps/web/public/fonts/`), Latin subset, variable, from `@fontsource-variable` 5.3.0, declared in `app.css` with `font-display: swap`. Nothing is requested from another origin (`font-src 'self'`). Characters outside the Latin subset (Vietnamese place names, Arabic ...) are set glyph by glyph in the system stack (`unicode-range`).

| Token | Stack | File (version in the name: cached `immutable` for a year) | Use |
| --- | --- | --- | --- |
| `--font-display` | `"Bricolage Grotesque Variable"`, `"Bricolage Grotesque Fallback"`, `--font-sans` | `bricolage-grotesque-5.3.0-latin-wght-opsz.woff2`, 77 kB, wght 200 to 800, opsz 12 to 96 | the owner's name on the home page, headlines, headings: heavy against thin |
| `--font-reading` | `"Newsreader Variable"`, `"Newsreader Fallback"`, `ui-serif, Georgia, "Times New Roman", serif` | `newsreader-5.3.0-latin-wght-opsz.woff2` (132 000 B) and `-italic` (146 872 B), wght 200 to 800 and opsz 6 to 72 | the body of an entry, an entry's headline (700), a poem's title and lines, the standfirst, pull quotes |
| `--font-meta` | `"JetBrains Mono Variable"`, `--font-mono` | `jetbrains-mono-5.3.0-latin-wght.woff2`, 40 kB, wght 100 to 800 | page metadata (`.type-meta`) only |
| `--font-sans`, `--font-mono` | the system stacks below, unchanged | none | the interface until a component takes a role; the map's labels, the credits line and the planner's measurement (`--font-mono`) |

Newsreader's optical size (2026-10-12, with the entry pages): the owner's article and poem boards set the headline (132 px, 700) and the poem's title (128 px, 200 italic) at optical size 72, whose forms are finer, tighter and higher in contrast than the text cut (18) of the plain `wght` files. The two files that carry `opsz` replace the two `wght` ones: 132 000 and 146 872 bytes against 58 084 and 64 520, so an entry page that draws both the roman and the italic asks for 156 kB more (woff2, cached `immutable` for a year, not preloaded, requested only where a glyph is drawn). `font-optical-sizing: auto` (in every role) maps the font size in px to the axis, so no `font-variation-settings` is needed: 40 px asks for 40, anything above 72 px gets 72. The fallback faces are unchanged (same hhea metrics; the display cut is a little narrower than the text cut the `size-adjust` was measured on, a few percent at 130 px).

Why the optical-size file: the plain `wght` file of Bricolage is frozen at its text cut (opsz 14). At display sizes the font's own display cut (opsz 96) is about 10 % narrower with finer joints and higher contrast: it is the cut the wordmark is designed in, and `font-optical-sizing: auto` picks it by itself as the size grows. The file is 36 kB larger than the `wght` one and replaces it (one display file, not two). Only this file is preloaded, and only on the home page (`routes/home.tsx`). The reading and metadata files load only where a glyph of them is drawn.

Fallback faces (`"Bricolage Grotesque Fallback"` on Arial / Arial Bold, `"Newsreader Fallback"` on Georgia / Georgia Bold / Georgia Italic): `size-adjust` from the frequency-weighted average advance of English text measured in Chrome at the weights each face stands for (Arial 99 %, Georgia 95.3 % roman, 87 % bold, 86 % italic), `ascent-override` and `descent-override` from the font's hhea metrics over its em divided by `size-adjust`, `line-gap-override` 0. Text set in the fallback has the real face's width and line box to within a few percent, so the swap moves little. JetBrains Mono has none on purpose: every system monospace is 0.6 em wide like it, and the `--font-mono` stack that follows it already is that.

System stacks (unchanged):

- Sans: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Mono (labels, small caps): `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`

Weights (`--weight-*`): `thin` 200 and `heavy` 800 are the display pair (the given name 800 against the family name 200: "Elliot" / "Négrel-Jerzy"); `light` 300 (standfirst, pull quote, third-level heading), `reading` 400, `medium` 500, `semibold` 600, `bold` 700. Tailwind's own `font-extralight` (200) and `font-extrabold` (800) are the same numbers.

Roles. A class sets a whole role; `text-<role>` plus `font-display | font-reading | font-meta` does the same in utilities (the `--text-<role>--line-height`, `--letter-spacing` and `--font-weight` are Tailwind's theme keys, so `text-display-xl` carries them).

| Role | Class | Size | Leading | Tracking | Weight | Wrap, features |
| --- | --- | --- | --- | --- | --- | --- |
| `display-xl` (the name) | `.type-display-xl` | `clamp(3.5rem, 11vw, 10rem)`: 56 px on a phone, 158 px at 1440 px | 0.88 | -0.045em | 800 | `balance`, optical sizing auto, no synthesis |
| `display-lg` (an entry's headline) | `.type-display-lg` | `clamp(2.25rem, 1.35rem + 3.7vw, 4.5rem)`: 36 to 72 px | 0.98 | -0.035em | 800 | same |
| `display-md` (a card title, a section) | `.type-display-md` | `clamp(1.625rem, 1.2rem + 1.4vw, 2.25rem)`: 26 to 36 px | 1.06 | -0.025em | 700 | same |
| `standfirst` | `.type-standfirst` | `clamp(1.5rem, 1.25rem + 0.9vw, 1.9rem)`: 24 to 30 px, reading face italic | 1.3 | -0.01em | 300 | `balance` |
| `reading` | `.type-reading` | `clamp(1.125rem, 1.07rem + 0.25vw, 1.25rem)`: 18 to 20 px | 1.65 | 0 | 400 | `pretty`, proportional figures; column `.type-measure` |
| `meta` | `.type-meta` | 12 px, mono | 16 px | 0.1em | 500 | uppercase, tabular figures, ligatures off |

Modifiers: `.type-thin` / `.type-heavy` put a run of a display heading at either end of the weight axis (`Elliot <span class="type-thin">Négrel-Jerzy</span>`). `.type-link` underlines in the accent (`.ds-prose` links do the same). `.drop-cap` sets the first letter of a paragraph as a float 5.33 em tall (4.2 em in a column under 40 rem), Newsreader 700 in the ink, line-height 0.8, padding 0.07 em 0.13 em 0 0 (the "Article on paper" board: 112 px against a 21 px body); a float and not `initial-letter`, because the board's letter sits on the third line and `initial-letter` sinks differently in each engine. `.type-pullquote` is the reading face in 300 italic, `clamp(1.5rem, 0.9rem + 1.9cqi, 2.5rem)` (40 px at 1328 px) / 1.15, -0.01em, between two 1 px rules of the ink with 18 px padding; `.type-rule` and `.ds-prose hr` a 1 px rule in `--border-strong`. Entry pages add (app.css, reading section, documented in design-system.md, "Entry pages"): `.entry-title` (the headline: Newsreader 700, `--entry-title`, 0.92, -0.03em, 8.95 em wide at most; `data-poem` makes it 200 italic at `--poem-title`, 0.95), `.entry-rule` (the double rule: 3 px, 3 px gap, 1 px), `.entry-dateline`, `.entry-margin`, `.entry-figure`, `.ds-caption` (mono 12 px / 1.6, muted: a figure's caption).

Reading measure: `--measure-reading` is 28.5 em of the reading size, 570 px at 20 px: 66 characters of running text (measured in Chrome, 1440 and 390 px wide). It is em and not `ch` on purpose: the "0" of Newsreader is 0.5 em wide against a 0.43 em average letter, so 65 `ch` would be 75 characters. Figures in Newsreader are lining: the subset ships no old-style figures (`onum` is absent from the file), so `font-variant-numeric` only asks for proportional ones.

`.ds-prose` (the entry body) is now the reading face at the `reading` role, headings in the display face (h2 800, h3 and h4 300), blockquotes in light italic, rules hairline. Component utilities (`font-semibold`, `text-2xl`) still win over it where the markup sets them.

Older steps (system sans, still used by the interface):

- `.label`: sans, `text-sm`, sentence case, muted color (the places list's group names and regions). `.ds-meta`: mono 13 / 20, tabular, muted, untracked (dates, coordinates). `.ds-micro`: mono 11 / 16, uppercase, 0.12em (a short code or key cap only).
- `.map-label` and `.map-halo` (the names of the map's detection boxes, `app.css`; two lines, the name and a second line with the country or number of places and the linked entries): the mono stack; the name 14 px weight 500, the second line 11 px weight 400, 0.01 / 0.02em tracking, line heights 18 / 14 px, 6 x 3 px plate padding (`LABEL_TYPE` in `app/globe/engine/label-text.ts`, which the layout also measures with); 3 px between a label and its box. EVERY label has a `--background` plate with a feathered edge (`.map-halo`: a two-layer `box-shadow` of `--background`, blur 8 px / spread 3 px, in a layer below the boxes); the name is `--foreground`, the second line `--muted-foreground` (6.8:1 light, 7.9:1 dark on the plate: AA); no underline, no text-shadow, no opacity; hovered: unchanged; selected: `--foreground` plate with `--background` text (inverted), the second line `color-mix(--background 72%, --foreground)` (10:1 light, 7.9:1 dark), no feather. `docs/web-architecture.md`, "Labels in device pixels". The map's text never takes a new family.

| Step | Size / line height | Use |
| --- | --- | --- |
| `text-xs` | 12 / 18 px | small mono labels (a code block's language) |
| `text-sm` | 14 / 22 px | secondary text, nav, buttons, captions, tags |
| `text-base` | 16 / 26.4 px | body |
| `text-lg` | 18 / 28 px | summaries |
| `text-xl` | 22 / 30 px | card titles |
| `text-2xl` | 28 / 34 px | panel headings |
| `text-3xl` | 36 / 40 px | page headings |
| `text-4xl` | 48 / 52 px | full-screen entry title |
| `text-micro` | 11 / 16 px | short codes (mono, uppercase, 0.12em: `.ds-micro`), the floor for any text |

## Reading surface

The entry pages and the four lists sit on **paper** in the light scheme and on **night** in the dark: the colours of the "Article on paper" and "Poem at night" boards of the owner's canvas. Six tokens, in the four copies of the scheme blocks (root, dark media rule, both forced rules):

| Token | Light (paper) | Dark (night) | Use |
| --- | --- | --- | --- |
| `--paper` | `#efeadf` | `#0b0c0f` | the page of an entry or a list |
| `--paper-foreground` | `#16130f` | `#ece8df` | ink: text and the rules (15.4:1 / 16.0:1) |
| `--paper-muted` | `#6b665b` | `#8d8a82` | secondary text and the mono marginalia (4.76:1 / 5.67:1; 4.5:1 or more on the hover grey) |
| `--paper-hover` | `#ebe7dc` | `#17181b` | the hover grey (rows, contents links) |
| `--paper-signal` | `#cf4f17` | `#f26a2e` | the accent as large text and marks: 3.66:1 on the paper (the page accent `#ea6024` is 2.82:1 there) / 6.4:1 |
| `--paper-signal-text` | `#a93a0a` | `#f26a2e` | the accent as text under 24 px: 5.31:1 / 6.4:1 |

They are bound, not used by name: for an entry's panel (`[data-panel]:has([data-surface="reading"])`), for the root of a list page (`:root:has(main[data-surface="reading"])`) and for one element (`[data-reading-surface]`, the styleguide), `--background`, `--surface`, `--foreground`, `--muted-foreground`, `--accent`, `--border`, `--border-strong`, `--ring`, `--signal`, `--signal-text` and `--primary` take these values, so every component inside follows (the navigation's scrim, the focus ring, the buttons). The rule is unlayered on purpose: the root rule of the page tokens is, and an unlayered rule beats a layered one. The map, the place panel and the home page keep the neutral page colours. `design-system.test.ts` ("reading surface") tests the pairs in both schemes.

## Spacing

Tailwind's default 4px scale (`--spacing: 0.25rem`). Page gutters are 12 to 16px (navbar) and 24px (panel,
content pages). Content pages use a `max-w-2xl` reading column. Touch targets: interactive elements are
`min-h-11` (44px) on viewports below `md`.

Layout variables:

| Token | Value |
| --- | --- |
| `--navbar-height` | `3.5rem` |
| `--scrim-height` | `calc(var(--navbar-height) + 2.5rem)` (the page and panel scrim) |
| `--fade-height` | `calc(var(--navbar-height) + 3.5rem)` (the row's own fade over the globe, `.nav-fade`) |
| `--list-width` | `18rem` (the places list when revealed by keyboard focus) |
| `--panel-pad`, `--grid-gap` | `1.5rem`, `1rem` (panel padding; the 12-column grid's gutter) |
| `--control-h`, `--control-h-sm` | `2.75rem` below md (44 px touch rule); `2.25rem` / `2rem` from md |
| `--hairline`, `--tick-step` | `1px`, `8px` (frames and lines; the tick scale of the styleguide's dividers) |
| `--icon-inline` | `1.1em` (an icon beside text: the text's own size; docs/design-system.md, "Icons") |
| `--icon-control` | `1.25rem` (an icon in a control or at the head of a row) |
| `--icon-large` | `1.5rem` (an icon on its own) |
| `--icon-stroke` | `1.75` (the icon stroke in the library's 24-unit grid, square ends and joins, every size) |

The desktop detail panel is `50vw` wide (`md:w-1/2`, from 768px) and full height; there is no panel width token.

## Radii

All three are `0` (2026-10-08): square edges are the system. The names stay so shadcn-style classes (`rounded-md`) and the map card's `rounded-sm` resolve to square; do not add a non-zero radius (`design-system.test.ts` scans `components/ui`).

## Motion

| Token | CSS | `motion/react` (s) | Use |
| --- | --- | --- | --- |
| `--duration-fast` | 120ms | `duration.fast` = 0.12 | hover/focus color changes |
| `--duration-base` | 220ms | `duration.base` = 0.22 | mobile slide-over |
| `--duration-slow` | 360ms | `duration.slow` = 0.36 | desktop panel slide and the globe's re-centring (`TUNING.insetMs`) |
| `--ease-standard` | `cubic-bezier(.2, 0, 0, 1)` | `easeStandard` | everything |
| `--duration-scan` | 1600ms | not mirrored | the loading skeleton's ambient sweep (off under reduced motion; not a state change) |

The seconds values live in `apps/web/app/lib/tokens.ts`; `tokens.test.ts` fails if they drift from the CSS, and if the globe's re-centring duration and easing drift from `--duration-slow` and `--ease-standard`.

Reduced motion (`prefers-reduced-motion: reduce`): the panel has no initial/exit state (instant), the globe jumps to its new centre, the global CSS
reduces all transitions/animations to ~0, `MotionConfig reducedMotion="user"` disables transform animations,
and the globe receives `reducedMotion: true`.

## Nav scrim

The navbar is fully transparent (no box, border or blur of its own). To keep its text readable over scrolling content,
a scrim dims whatever passes beneath it. It is `.nav-scrim` in `app.css`, rendered by `NavScrim`
(`components/nav-scrim.tsx`).

- Geometry: `position: fixed`, top and full width, height `--scrim-height` (navbar height + 2.5rem = 96px),
  `pointer-events: none`, `aria-hidden`, z-index 35 (content and panel 30, navbar 40).
- Colour: a 14-stop `linear-gradient` from `--background` at 96% alpha to transparent, with stops eased roughly like a
  smoothstep so there is no visible start or end line. The stops use `color-mix(in srgb, var(--background) N%,
  transparent)`, so it follows light and dark with no extra tokens.
- Blur: three child `<span>`s, each a `backdrop-filter: blur()` (1.5px, 4px, 9px) masked by its own `mask-image`
  gradient to a shorter strip (55%, 75% and 50% of the height). The blurs add up, so blur is strongest at the top and
  tapers to nothing: a progressive blur without a hard edge.
- `prefers-reduced-transparency: reduce`: the spans are hidden and the gradient stays opaque longer (solid for the
  first half, then fading), so the text stays readable without any blur.
- Where it applies: every route except the globe screen (`/`, `/locations/:slug` and the entries beside it), where the page colour is
  the ocean and a band the width of the screen would dim the map for nothing: there the row has its own fade (below). The open desktop
  detail panel has an `absolute` copy scoped to the panel (the panel is its own backdrop root), which covers only the panel's width. The
  panel's scroll area starts `navbar-height + 1rem` from the top so its first line is not dimmed at rest.

## Nav fade

The row of the navigation over the globe and the map (`.nav-fade` in `app.css`, a `span` inside the `<nav>`, `aria-hidden`).

- Geometry: `position: absolute` behind the links (`z-index: -1` inside the header's stacking context), `top: 0`, 6 rem wider than the
  row on each side, height `--fade-height` (navbar height + 3.5rem = 112 px; the row itself is 56 px), `pointer-events: none`.
- Colour: the page colour (`--background`) through `color-mix` at 85 % from 0 to 20 % of the height (the row's text is centred at
  25 %: it sits on 83 % or more, the `readability.test.ts` figure for nav links is 80 %), then a smoothstep fall through 81, 72, 58, 43,
  27, 13, 4 % to transparent at 100 %. Both schemes follow with no token of their own.
- Horizontal: a `mask-image` with the same easing over the first and last 6 rem, so the band melts into the map on either side. The
  fade has no `backdrop-filter` (and so no backdrop-root problem with the mask): the gradient alone keeps the text readable and costs no
  extra layer over the WebGL canvas.
- `prefers-reduced-transparency: reduce`: solid page colour for 40 %, then the fall (nothing is translucent that was not before).
  `forced-colors: active`: `Canvas` to transparent. Print: hidden with the header.
- Not rendered in the full-screen entry view (the panel's scrim covers the viewport there) and on the pages that have the page scrim.

- Content pages start `navbar-height + 3rem` from the top; `:target` scroll margins use `navbar-height + 1.5rem`.
- Tuning knobs for the owner: `--scrim-height`, the stop list, and the three blur radii and mask ends.
