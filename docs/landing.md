# Landing hero

The home page (`/`): the pixel globe with a typographic hero over it. Design source: the owner's canvas boards "home-rest" and "home-touched" (2026-10-12; 1440 x 900, dark scheme; both schemes are built from the app tokens, nothing is copied from the boards' hex values). All type, no boxes, no ornament; the accent appears twice (the search line's square bullet, and a row or header item under the pointer or the keyboard).

Code: `app/components/landing-hero.tsx` (the markup), `app/lib/hero-machine.ts` (the state machine, pure), `app/hooks/use-landing-hero.ts` (wiring to the shell), `app/routes/shell.tsx` (mounts it), the "Landing hero" block at the end of `app/app.css`. Check: `scripts/home/hero.mjs`.

## Structure

```
<div data-slot="landing-hero" data-hero="rest | collapsed | away" data-world="true | false">
  h1.hero-name        "Cata" (.type-thin, 200) + "lyst" (800), Bricolage, .type-display-xl; the page's h1
  .hero-lead
    p.hero-intro      "A personal archive organised around places. Pick a point on the globe, or start from a list."
    button.hero-search  square accent bullet, "Search places and entries" (mono 13), "⌘K" / "Ctrl K"; opens the existing palette
  ul.hero-list        Projects, Articles, Artworks, Poems: hairline rows, Bricolage 30 / 300, a muted "→"
  p.hero-mini         aria-hidden: the small name and "Drag to explore. Back to start after a moment."
```

Layout (wide): intro and search left (470 px), the four rows right (360 px), the name across the whole width under them (20.3 vw: 292 px at 1440, the board's size; the word is 3.09 em wide, so it takes about two thirds). Gutters 56 px (`clamp(1rem, 3.9vw, 3.5rem)`). Under 48 rem it stacks: name (filling the width), intro, search, rows. Wide and short (a phone on its side, under 34 rem tall): the rows in two columns and the name capped at 26 vh. DOM order is reading order (name, intro, search, rows); the grid places the name last on a wide screen.

The block is bottom-anchored and rises by the credits line's height plus what the "y" hangs under the line box (`padding-bottom: clear + 0.15 * name size`), so no letter is ever over the credits line (bottom right, 8 to 30 px from the bottom) or, in development, the content badge. The hero is `pointer-events: none`; only the search line and the rows take the pointer, so the globe stays draggable and zoomable beneath all the rest. A page-colour fade (`.landing-hero::before`, no blur) sits behind the thin type.

## States

| State | When | What shows |
| --- | --- | --- |
| `rest` | load; or idle at the world view after a gesture | the whole hero |
| `collapsed` | after a gesture on the globe; or whenever the view is not the world view (zoomed in, a place open) | the small line bottom-left (left 40 px, bottom 32 px: the name in Bricolage 30 / 800 with "Cata" at 200, and the hint). The h1 stays in the accessibility tree at opacity 0; the search line and the rows are `visibility: hidden` (not tab stops). The hint is shown only while the way back is real (`data-world="true"`) |
| `away` | a place or an entry is open | nothing is shown or exposed (instant); the name renders as a `p`, so the panel's title is the only h1 |

Transitions: opacity and transform only (visibility follows the fade), `--duration-base` (220 ms) with `--ease-standard`; `prefers-reduced-motion`: none (instant). No JS animation loop; a state change costs one React re-render of the hero, and only on a gesture start, the world view being left or reached, or the idle timer.

The machine (`createHeroMachine`): `rest` goes to `collapsed` on `interact()` or when `setWorld(false)`; `collapsed` goes to `rest` after `HERO_IDLE_MS` (8000, the same delay as the globe's idle rotation) without an input, only while the world view holds. Every input restarts the clock; leaving the world view stops it and coming back restarts it. At most one timer, none at rest. "World view": `GlobeViewState.zoom <= 0.03` and no street scale (`isWorldView`; the idle rotation's own slack, 0.15 zoom levels of a range of about 5.3), with no place or entry open.

## Hooks into the globe

- **A gesture**: `GlobeProps.onInteract` (`globe/types.ts`), implemented in `globe/globe-canvas.tsx`: two passive capture listeners (`pointerdown`, `wheel`) on the globe's own stage, which holds the canvas, so pointer presses (drag, tap on a place, a pinch's fingers) and wheel (including the trackpad pinch) count, hovering does not, the app's overlays and the credits control are outside it, the globe's own motion (rotation, flights, inertia) is not input. The globe has no keyboard zoom (the canvas is not focusable, the places list is the keyboard path), so there is none to hook. No engine file changed.
- **The view**: the shell already receives every reported view (`onViewChange`); `useLandingHero().onView` compares it with the world view and tells the machine only when that changes.
- **The search**: `openSearch()` (`components/search-palette.tsx`) dispatches a window event the palette (mounted once by the navigation) listens to. The hero's line is a `button` (`aria-haspopup="dialog"`, `aria-keyshortcuts`), not a second search; Cmd/Ctrl-K is unchanged.

## Header

Restyled with the hero (the board's header): `Globe` (the home page; accessible name "Globe, Catalyst home"), Projects, Articles, Artworks, Poems in mono capitals (`.nav-link`: 12 px, tracking 0.14em and 44 px between items from a 44 rem wide row, shrinking by container width down to 11 px / 6 px on a 320 px phone), the current one in the foreground and underlined, the rest muted, the pointer or keyboard turning an item to `--signal-text`. Where the icon trigger is hidden (row under 28 rem: a phone) the same control is one word, "Search" (`data-slot="search-trigger-compact"`, 44 px target).

## Empty archive

With no published place the hero is also the empty home (it replaced `ArchiveEmpty`, which is no longer rendered): the intro reads "A personal archive organised around places. No place is published yet: start from a list." The hero shows no count or number.

## Tokens used

Colour: `--foreground`, `--muted-foreground`, `--border`, `--border-strong`, `--background` (fade), `--signal` (the bullet; the row hover: 30 px display text), `--signal-text` (header hover). Type: `--font-display`, `--font-reading`, `--font-meta`, `.type-display-xl`, `.type-thin`, `--weight-light`, `--weight-heavy`. Motion: `--duration-base`, `--duration-fast`, `--ease-standard`. The only new values are local to the block: `--hero-gutter`, `--hero-size`, `--hero-clear`, `--hero-mini-*`.

## Test

- Unit: `lib/hero-machine.test.ts` (fake timers: states, idle clock, world view, one timer), `components/landing-hero.test.ts` (server markup, accessible names, order, the CSS rules that must hold), `components/navbar.test.ts`.
- Browser: `CHROME_PATH=... BASE_URL=http://localhost:5451 OUT_DIR=/tmp/hero node apps/web/scripts/home/hero.mjs` against `pnpm dev` (or `dev:demo`). It covers SSR markup, rest with real text, a drag through the hero turning the globe, collapse, return (1.5 s with `?globe-debug&hero-idle=1500`, and the real 8 s without), zoomed in staying collapsed, the credits line and the dev badge never covered at 1440 x 900, 1024 x 700, 390 x 844 and 844 x 390 in both schemes, the header at 320 to 430 px, the keyboard order (header search, hero search, the four lists, then on) and Cmd/Ctrl-K, reduced motion, a place open, and no console error or warning (hydration warnings come through there).
- The idle override `?hero-idle=MS` (100 to 60000) works only in debug mode (`?globe-debug`), like `?spin-idle`.

## Not done

Safari, iOS and real phones were not tested. The board's REST view puts the globe to the right of the hero and its TOUCHED view centres a larger one; the globe is where the engine puts it (centred in the free area). The panel's `insetRight` moves the centre left only, so there is no existing way to keep the world view right of the hero; a left (or bottom) inset would be an engine change. The credits line keeps its own style and position (bottom right, 10 px mono card); the board draws it at 40 / 32 px in 11 px.
