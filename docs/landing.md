# Landing hero

The home page (`/`): the pixel globe with a typographic hero over it. Design source: the owner's canvas boards "home-rest" and "home-touched" (2026-10-12; 1440 x 900, dark scheme; both schemes are built from the app tokens, nothing is copied from the boards' hex values). All type, no boxes, no ornament; the accent appears once (a row or header item under the pointer or the keyboard). Identity change (2026-10-13): the big type is the owner's NAME, not the project's code name, and the four rows replace the header's section links on this page.

Code: `app/components/landing-hero.tsx` (the markup), `app/lib/hero-machine.ts` (the state machine, pure), `app/hooks/use-landing-hero.ts` (wiring to the shell), `app/routes/shell.tsx` (mounts it), the "Landing hero" block at the end of `app/app.css`. Check: `scripts/home/hero.mjs`.

## Structure

```
<div data-slot="landing-hero" data-hero="rest | collapsed | away" data-world="true | false">
  h1.hero-name        "Elliot" (.hero-given, 800) + "Négrel-Jerzy" (.hero-family .type-thin, 200), Bricolage, .type-display-xl; the page's h1
  .hero-lead
    p.hero-intro      who and what: "Front-end and UX software engineer based in Warsaw." + span.hero-intro-more " Data visualisation, geospatial and cartography interfaces, design systems, computer graphics." (the second sentence goes in a very short window)
    p.hero-hint       how: "Pick a point on the globe, or start from a list." (muted, a step smaller; gone in a short window; without scripts: "Start from a list.")
    button.hero-search  [data-needs-script] the search icon (control size), "Search places and entries" (mono 13), the key hint (command icon + K, or Ctrl K); opens the existing palette
  nav.hero-list       aria-label "Primary" (the home page's navigation; the header has none here)
    ul > li > a.hero-row  Software, Articles, Artworks, Poetry: hairline rows, Bricolage 30 / 300, an arrow icon at 1.1 em (33 px)
  p.hero-mini         aria-hidden: the small name and "Drag to explore. Back to start after a moment."
```

Layout (wide): intro, hint and search left (470 px), the four rows right (360 px), the name under them: ONE line from 48 rem, **deliberately not the full width** (owner, round 2: "clearly narrower"): it takes `--hero-span` 0.72 of the viewport (`--hero-size` = 100vw x 0.72 / `--hero-fit` 6.6 em, the name's measured width at 800 / 200: 157 px at 1440, which is 1037 px, 72 %; 737 px at 1024; 565 px, 74 %, at 768 where the optical size is a little wider), never over a third of the height nor 30 rem. Weights: the given name is the heavy half (800, set at -0.02 em: at the name's -0.055 em the three l, l, i of "Elliot" touched), the family name the thin half (200, -0.055 em). The hyphen of the family name has its own span (`.hero-hyphen`, 0.045 em of margin). Gutters 56 px (`clamp(1rem, 3.9vw, 3.5rem)`). Under 48 rem it stacks in two lines: the given name over the family name, whose width is what fills the row there (`--hero-fit` 4.7, gutter to gutter: 76 px at 390), then intro, hint, search, rows. Wide and short (under 34 rem tall, from 48 rem wide): the rows in two columns, the name capped at 26 vh and the hint dropped (the globe is in plain view; the line saved is room for it).

**The whole block is always in the window** (review of 2026-10-13: at 667 x 375, 720 x 450 = a 1440 x 900 window at 200 % zoom, 320 x 568 and 320 x 480 the stacked block was 510 to 540 px tall, bottom-anchored in an `overflow: hidden` main, so the name was at negative y). From 320 x 480 and from 568 x 320 up:
- The stacked name's size is also what the height leaves (`--hero-size` takes `(100dvh - --hero-fixed - --hero-clear - safe area - 1rem) / 1.9`; `--hero-fixed` is what the block holds besides the name, per tier: 26.5 rem, 24.5 rem without the hint, 17 rem with the rows in two columns, 13.5 rem without the second sentence), never over the width fit and 24 vh, never under 1.75 rem.
- Tiers under 48 rem: up to 40 rem tall the how-to line is gone; up to 36 rem the four rows are two columns of 44 px targets; under 30 rem wide and up to 28 rem tall only who the owner is stays of the intro (the second sentence is its own span, `.hero-intro-more`).
- A phone on its side, 30 to 48 rem wide and up to 34 rem tall: the wide layout in small (intro and search left, the two-by-two rows right, the name on ONE line across the bottom at 72 % of the width, 26 vh at most); at 22 rem tall, or 28 rem under 40 rem wide, also without the second sentence.
- The dev badge raises the block by 4.75 rem under 48 rem (`--hero-clear`): the tiers hold with it. Below 320 x 480 (320 x 320 and the like, which no phone has) the block can still overflow by up to 25 px: not supported.
- The sizes are measured in `scripts/home/hero.mjs` (15 shapes, light and dark, top and bottom of the block's box against the window, the globe reachable above it). DOM order is reading order (name, intro, search, rows); the grid places the name last on a wide screen.

The block is bottom-anchored and rises by the credits line's height plus what the "y" hangs under the line box (`padding-bottom: clear + 0.15 * name size`), so no letter is ever over the credits line (bottom right, 8 to 30 px from the bottom) or, in development, the content badge. The hero is `pointer-events: none`; only the search line and the rows take the pointer, so the globe stays draggable and zoomable beneath all the rest. A page-colour fade (`.landing-hero::before`, no blur) sits behind the thin type.

## States

| State | When | What shows |
| --- | --- | --- |
| `rest` | load; or idle at the world view after a gesture | the whole hero |
| `collapsed` | after a gesture on the globe; or whenever the view is not the world view (zoomed in, a place open) | the small line bottom-left (left 40 px, bottom 32 px: the name in Bricolage 30: "Elliot" at 800 and "Négrel-Jerzy" at 200, as in the hero, and the hint). The h1 stays in the accessibility tree at opacity 0; the search line and the rows are `visibility: hidden` (not tab stops). The hint is shown only while the way back is real (`data-world="true"`) |
| `away` | a place or an entry is open | nothing is shown or exposed (instant); the name renders as a `p`, so the panel's title is the only h1 |

Transitions: opacity and transform only (visibility follows the fade), `--duration-base` (220 ms) with `--ease-standard`; `prefers-reduced-motion`: none (instant). No JS animation loop; a state change costs one React re-render of the hero, and only on a gesture start, the world view being left or reached, or the idle timer.

The machine (`createHeroMachine`): `rest` goes to `collapsed` on `interact()` or when `setWorld(false)`; `collapsed` goes to `rest` after `HERO_IDLE_MS` (8000, the same delay as the globe's idle rotation) without an input, only while the world view holds. Every input restarts the clock; leaving the world view stops it and coming back restarts it. At most one timer, none at rest. **The clock is held while the keyboard focus is in the header (`[data-slot="site-header"]`) or in an open dialog (the search palette)**: the way back removes the header (the rows are the sections then), so a hero that came back under a focused header link, or under the palette whose opener is the header's trigger, left the focus on `body`. `HeroMachine.hold(held)`, fed by `watchFocusHold` (`hooks/use-landing-hero.ts`: `focusin` and `focusout` on the document); releasing starts a whole idle period. "World view": `GlobeViewState.zoom <= 0.03` and no street scale (`isWorldView`; the idle rotation's own slack, 0.15 zoom levels of a range of about 5.3), with no place or entry open.

## Hooks into the globe

- **A gesture**: `GlobeProps.onInteract` (`globe/types.ts`), implemented in `globe/globe-canvas.tsx`: two passive capture listeners (`pointerdown`, `wheel`) on the globe's own stage, which holds the canvas, so pointer presses (drag, tap on a place, a pinch's fingers) and wheel (including the trackpad pinch) count, hovering does not, the app's overlays and the credits control are outside it, the globe's own motion (rotation, flights, inertia) is not input. The globe has no keyboard zoom (the canvas is not focusable, the places list is the keyboard path), so there is none to hook. No engine file changed.
- **The view**: the shell already receives every reported view (`onViewChange`); `useLandingHero().onView` compares it with the world view and tells the machine only when that changes.
- **The search**: `openSearch()` (`components/search-palette.tsx`) dispatches a window event the palette (mounted once by the navigation) listens to. The hero's line is a `button` (`aria-haspopup="dialog"`, `aria-keyshortcuts`), not a second search; Cmd/Ctrl-K is unchanged.

## Header

Restyled with the hero (the board's header): `Globe` (the home page; accessible name "Globe, Elliot Négrel-Jerzy home"), Software, Articles, Artworks, Poetry in mono capitals (`.nav-link`: 12 px, tracking 0.14em and 44 px between items from a 44 rem wide row, shrinking by container width down to 11 px / 6 px on a 320 px phone), the current one in the foreground and underlined, the rest muted, the pointer or keyboard turning an item to `--signal-text`. Where the icon trigger is hidden (row under 28 rem: a phone) the same control is one word, "Search" (`data-slot="search-trigger-compact"`, 44 px target).

**On the home page there is no header at all while the hero is at rest** (owner, 2026-10-13, twice: first "no section tabs, the hero's rows are the sections", then "no top bar element at all: the hero's own search line has the search and the key hint"). `Navbar` renders no `<header>`: no bar, no tabs, no search trigger, no fade. What keeps the page accessible: the skip links are unchanged; the first controls in the tab order are the hero's search line and its four rows; the hero's list is a `nav` with `aria-label="Primary"` (the only Primary navigation in the accessibility tree); Cmd/Ctrl-K opens the palette as everywhere (the palette is mounted by `Navbar` beside the header, not inside it, so it also stays open when the header comes or goes). **The header returns whenever the hero is not at rest** (tabs and search, with the plain key hint): collapsed after a gesture, or zoomed in (the rows are `visibility: hidden` then, and zoomed in the hero never returns on its own, so without this the visitor would have no way to the lists but the search); it goes again when the hero returns. Mechanism: `LandingHero` publishes `state === "rest"` to `lib/hero-rest.ts` (a tiny external store) and `Navbar` reads it, because the header is a sibling of the shell in the root layout. The server and the first client render say "at rest", like the hero's server markup, so nothing differs at hydration. Every other route, including a place or an entry opened from the globe, has the header unchanged.

## Empty archive

With no published place the hero is also the empty home (it replaced the old `ArchiveEmpty` plate, since removed): the hint reads "No place is published yet: start from a list." (under who the owner is). The hero shows no count or number.

## Tokens used

Colour: `--foreground`, `--muted-foreground`, `--border`, `--border-strong`, `--background` (fade), `--signal` (the row hover: 30 px display text), `--signal-text` (header hover). Type: `--font-display`, `--font-reading`, `--font-meta`, `.type-display-xl`, `.type-thin`, `--weight-light`, `--weight-heavy`. Motion: `--duration-base`, `--duration-fast`, `--ease-standard`. The only new values are local to the block: `--hero-gutter`, `--hero-size`, `--hero-clear`, `--hero-mini-*`.

## Test

- Unit: `lib/hero-machine.test.ts` (fake timers: states, idle clock, world view, one timer), `components/landing-hero.test.ts` (server markup, the name's split, the primary navigation, accessible names, order, the CSS rules that must hold), `components/navbar.test.ts` (the home header without sections, with them when the hero has stepped back, unchanged elsewhere), `lib/identity.test.ts` (the code name appears nowhere a visitor sees), `components/ui/icon.test.ts` (no bespoke SVG, one library, the scale).
- Without scripts: `[data-needs-script]` (the hero's search line, the header's two search triggers) is `display: none` under `@media (scripting: none)` (app.css, the end of the file), the how-to line says "Start from a list." and the rows are plain links. `hero.mjs` runs the page with `javaScriptEnabled: false`.
- Browser: `CHROME_PATH=... BASE_URL=http://localhost:5451 OUT_DIR=/tmp/hero node apps/web/scripts/home/hero.mjs` against `pnpm dev` (or `dev:demo`). It covers SSR markup, rest with real text, a drag through the hero turning the globe, collapse, return (1.5 s with `?globe-debug&hero-idle=1500`, and the real 8 s without), zoomed in staying collapsed, the credits line and the dev badge never covered at 1440 x 900, 1024 x 700, 390 x 844 and 844 x 390 in both schemes, the name on one line at desktop widths and stacked on a phone, inside the gutters, at 200 / 800, the header without section links at rest and with them when collapsed, the icon sizes (hero arrows 1.1 em, search icons 20 px, the palette's kind icons 20 px), the header at 320 to 430 px, the keyboard order (header search, hero search, the four lists, then on) and Cmd/Ctrl-K, reduced motion, a place open, the focus held in the header and in the palette, the page without scripts, the whole block inside the window at 15 shapes from 320 x 480 and 568 x 320 up, and no console error or warning (hydration warnings come through there).
- The idle override `?hero-idle=MS` (100 to 60000) works only in debug mode (`?globe-debug`), like `?spin-idle`.

## Not done

Safari, iOS and real phones were not tested. The board's REST view puts the globe to the right of the hero and its TOUCHED view centres a larger one; the globe is where the engine puts it (centred in the free area). The panel's `insetRight` moves the centre left only, so there is no existing way to keep the world view right of the hero; a left (or bottom) inset would be an engine change. The credits line keeps its own style and position (bottom right, 10 px mono card); the board draws it at 40 / 32 px in 11 px.
