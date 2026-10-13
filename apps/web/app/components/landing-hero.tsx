import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { openSearch } from "~/components/search-palette";
import { Icon, KeyHint } from "~/components/ui";
import { KIND_PATHS, KIND_PLURALS } from "~/lib/entries";
import type { HeroMachine, HeroSnapshot } from "~/lib/hero-machine";
import { setHeroResting } from "~/lib/hero-rest";
import { SITE, SITE_FOCUS, SITE_IDENTITY } from "~/lib/site";

/** The four shortcuts, in the header's order. Paths and words come from the one table the lists and the navigation use. */
const SHORTCUTS = (["project", "article", "artwork", "poem"] as const).map((kind) => ({ to: KIND_PATHS[kind], label: KIND_PLURALS[kind] }));

/**
 * The name's travel to the collapsed line and back (owner, round 3, items 10 and 3): `--hero-travel` of app.css, with its ease (a fast start and a
 * soft landing). The two must be the same; `landing-hero.test.ts` keeps them so.
 */
export const NAME_TRAVEL_MS = 320;
export const NAME_TRAVEL_EASE = "cubic-bezier(0.2, 0.9, 0.1, 1)";
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The text's own box (the font's content area), page px: what travels, whatever the element's line box is. */
function textBox(el: Element): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect();
}

const HALVES = [
  [".hero-given", ".hero-mini-given"],
  [".hero-family", ".hero-mini-family"],
] as const;

/**
 * Where each half of the name must be when it is the collapsed name: the transform that puts its text box on the ghost's (`.hero-mini-given`,
 * `.hero-mini-family`, never painted). Measured in the half's REST position (no transform: the caller clears it first), so it is the
 * same whatever the state it is read in; the scale is the ratio of the boxes' widths (the ghost is the same drawing at another size), the
 * translation puts the box's top-left corner on the other's (the origin of the transform is the element's own top-left corner).
 */
function finalTransforms(root: HTMLElement): { el: HTMLElement; transform: string }[] {
  const out: { el: HTMLElement; transform: string }[] = [];
  for (const [from, to] of HALVES) {
    const el = root.querySelector<HTMLElement>(from);
    const ghost = root.querySelector<HTMLElement>(to);
    if (!el || !ghost) continue;
    const prev = el.style.transform;
    el.style.transform = "none";
    const a = textBox(el);
    const o = el.getBoundingClientRect();
    el.style.transform = prev;
    const b = textBox(ghost);
    if (!(a.width > 0) || !(b.width > 0)) continue;
    const s = b.width / a.width;
    const dx = b.left - o.left - (a.left - o.left) * s;
    const dy = b.top - o.top - (a.top - o.top) * s;
    out.push({ el, transform: `translate(${dx}px, ${dy}px) scale(${s})` });
  }
  return out;
}

/** Hold the collapsed name where it belongs (its final transform as the halves' own style), or put it back in place. */
function holdName(root: HTMLElement, collapsed: boolean): void {
  if (!collapsed) {
    for (const [from] of HALVES) root.querySelector<HTMLElement>(from)?.style.removeProperty("transform");
    return;
  }
  for (const { el, transform } of finalTransforms(root)) el.style.transform = transform;
}

/**
 * The name's two halves shrink and travel to the collapsed line, or back (a FLIP: the rectangles are measured once, here, and the browser runs a
 * `transform` animation on the compositor: translate and ONE uniform scale per half, no font size, no layout, no JS per frame; `will-change` only
 * for the length of the animation, by the Web Animations API itself). The collapsed name IS these halves: the inline transform that is the
 * animation's end is set at the start (the animation overrides it while it runs), so there is no frame at which anything is handed over; going
 * back the inline transform is removed at the start and the animation runs from where they were. An animation still running is turned round, not
 * restarted. Returns the running animations.
 */
function travelName(root: HTMLElement, running: Animation[], toMini: boolean): Animation[] {
  if (running.length > 0 && running.every((a) => a.playState === "running")) {
    for (const a of running) a.reverse();
    return running;
  }
  for (const a of running) a.cancel();
  const finals = finalTransforms(root);
  const out: Animation[] = [];
  for (const { el, transform } of finals) {
    if (typeof el.animate !== "function") {
      if (toMini) el.style.transform = transform;
      else el.style.removeProperty("transform");
      continue;
    }
    if (toMini) el.style.transform = transform;
    else el.style.removeProperty("transform");
    // The way back is the same motion with the same ease (a fast start and a soft landing), from the corner to the place: not the ease run backwards
    // (playing the animation in reverse would give a slow start and an arrival at speed).
    const identity = { transform: "translate(0px, 0px) scale(1)" };
    const animation = el.animate(toMini ? [identity, { transform }] : [{ transform }, identity], {
      duration: NAME_TRAVEL_MS,
      easing: NAME_TRAVEL_EASE,
      fill: "both",
    });
    // Out of the compositor's hands the moment it is over: what is left is the inline state, which is the same picture.
    animation.onfinish = () => animation.cancel();
    out.push(animation);
  }
  return out;
}

/** What the server (and the hydration pass) renders: the full hero. Stable object: a valid server snapshot. */
const SERVER_SNAPSHOT: HeroSnapshot = { state: "rest", world: true };

/** Under who the owner is (`SITE_IDENTITY`): how to use the page. With no published place it must not send the visitor to a globe with nothing on it. */
const HINT_GLOBE_LEAD = "Pick a point on the globe, or start";
const HINT_LIST_LEAD = "Start";
const HINT_LIST_TAIL = " from a list.";
const HINT_NO_PLACE = "No place is published yet: start from a list.";

/** The family name with its hyphen set apart: at the hero's tight tracking the hyphen would fuse with the letters around it. */
function FamilyName() {
  const parts = SITE.familyName.split("-");
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="hero-hyphen">-</span>}
          {part}
        </span>
      ))}
    </>
  );
}

interface LandingHeroProps {
  machine: HeroMachine;
  /**
   * The globe has the caption (`GlobeProps.onOrbit`): it says what the how-to line says, so the line is kept for assistive technology only. `null` or
   * absent while the globe is not up (on the server too), where it is hidden under a script too (`scripting: enabled`: the globe is about to say it) and
   * shown without one; `false` when there is no such type (no WebGL, `?no-ring`) and the line stays.
   */
  orbit?: boolean | null;
  /** The height the name covers at the bottom of the page, CSS px, when it is measured and when it changes (the globe lifts the planet clear of it). */
  onCover?: (px: number) => void;
  /** A place or an entry is open: the hero is not the page (its name is no heading then). */
  away: boolean;
  /** No place is published: the globe has nothing on it. */
  empty: boolean;
}

/**
 * The landing hero, over the globe on the home page (docs/landing.md). All type: the owner's name (the given name at the heavy end of the
 * weight axis, the family name at the thin end), who they are and what they do in the light reading serif, a search line that opens
 * the existing palette, and the four lists as hairline rows (which are the home page's section links: the header leaves its own out
 * while the hero is at rest, `lib/hero-rest.ts`). Its container ignores the pointer, so the globe stays draggable beneath it; only the search line and the rows take
 * it. At rest it is the page; after a gesture on the globe it steps back to one small line (and comes back after a moment at the world
 * view): `data-hero` is `rest`, `collapsed` or `away`, and the CSS (app.css, "Landing hero") does the rest with opacity and transform.
 *
 * Server and first client render are the same: the machine's server snapshot is the resting hero, and the shortcut's hint (the command
 * key or "Ctrl", which depends on the visitor's keyboard) is filled in after hydration into a box that already holds its place.
 *
 * Order in the DOM is reading order: name, who, search, lists. The grid places the name last on a wide screen; focus never lands on it.
 */
export function LandingHero({ machine, away, empty, orbit = null, onCover }: LandingHeroProps) {
  const snapshot = useSyncExternalStore(machine.subscribe, machine.getSnapshot, () => SERVER_SNAPSHOT);
  const state = away ? "away" : snapshot.state;
  // The header reads this: while the rows are showing it carries no section links of its own.
  useEffect(() => {
    setHeroResting(state === "rest");
    return () => setHeroResting(true);
  }, [state]);
  // Away, the panel's own title is the page's h1: the name stays as text, hidden, and is not a second heading.
  const Name = away ? "p" : "h1";
  const rootRef = useRef<HTMLDivElement>(null);

  // The name shrinks into the collapsed line when the hero steps back, and grows out of it on the way back (rest <-> collapsed: from or to
  // `away` the hero is not on screen and the name just sits where the state says; reduced motion: instant, as the CSS). The collapsed name is the
  // two halves of the big name held at the ghost line's boxes: it is re-measured when the block is resized (a window, a font arriving).
  const previous = useRef<typeof state>(state);
  const travelling = useRef<Animation[]>([]);
  useIsoLayoutEffect(() => {
    const was = previous.current;
    previous.current = state;
    const root = rootRef.current;
    if (!root) return;
    const toMini = was === "rest" && state === "collapsed";
    const back = was === "collapsed" && state === "rest";
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (was === state) return;
    if ((!toMini && !back) || reduced) {
      for (const a of travelling.current) a.cancel();
      travelling.current = [];
      holdName(root, state === "collapsed");
      return;
    }
    travelling.current = travelName(root, travelling.current, toMini);
  }, [state]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || state !== "collapsed" || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (travelling.current.some((a) => a.playState === "running")) return;
      holdName(root, true);
    });
    ro.observe(root);
    void document.fonts?.ready.then(() => holdName(root, true));
    return () => ro.disconnect();
  }, [state]);

  // How much of the page's bottom the name covers: the globe lifts the planet clear of it (docs/landing.md). Layout offsets, so a transform
  // (the name's own travel) never changes it; read when the block is resized (fonts arriving, the window, the tiers of the CSS).
  useEffect(() => {
    const root = rootRef.current;
    const name = root?.querySelector<HTMLElement>(".hero-name");
    const main = root?.offsetParent;
    if (!root || !name || !main || !onCover || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      if (getComputedStyle(root).visibility === "hidden") return;
      const covered = main.clientHeight - (root.offsetTop + name.offsetTop);
      if (covered > 0 && covered < main.clientHeight) onCover(covered);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(name);
    ro.observe(main);
    return () => ro.disconnect();
  }, [onCover, Name]);

  return (
    <div
      data-slot="landing-hero"
      data-hero={state}
      data-world={snapshot.world ? "true" : "false"}
      data-orbit={empty || orbit === false ? "false" : orbit ? "true" : "pending"}
      ref={rootRef}
      aria-hidden={away ? true : undefined}
      className="landing-hero print:hidden"
    >
      <div className="hero-block">
        <Name className="hero-name type-display-xl">
          <span className="hero-given">{SITE.givenName}</span> <span className="hero-family type-thin">
            <FamilyName />
          </span>
        </Name>
        <div className="hero-lead">
          <p className="hero-intro">
            {SITE_IDENTITY}
            <span className="hero-intro-more">{` ${SITE_FOCUS}`}</span>
          </p>
          {/* How to use the page. While the globe says it itself (the caption, `data-orbit`), this line is for assistive technology only. */}
          <p className="hero-hint">
            {empty ? (
              HINT_NO_PLACE
            ) : (
              <>
                {/* The globe is a script: without scripts (`data-needs-script`, app.css) the line only sends the visitor to the lists. */}
                <span data-needs-script="">{HINT_GLOBE_LEAD}</span>
                <noscript>{HINT_LIST_LEAD}</noscript>
                {HINT_LIST_TAIL}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={openSearch}
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K Meta+K"
            data-slot="hero-search"
            data-needs-script=""
            className="hero-search"
          >
            <Icon name="search" size="control" />
            <span className="hero-search-label">Search places and entries</span>
            <KeyHint className="hero-kbd" />
          </button>
        </div>
        {/* The home page's primary navigation (the header has none here); out of the accessibility tree with the rest when the hero steps back. */}
        <nav aria-label="Primary" className="hero-list">
          <ul>
            {SHORTCUTS.map((s) => (
              <li key={s.to}>
                <Link to={s.to} prefetch="intent" className="hero-row">
                  <span>{s.label}</span>
                  <Icon name="arrow-right" size="inline" className="hero-arrow" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {/* What stays when the hero has stepped back: the name as one small line and, while the way back is real, the hint. Decoration (the h1 is above). */}
      <p aria-hidden="true" className="hero-mini">
        <span className="hero-mini-name">
          <span className="hero-mini-given">{SITE.givenName}</span>{" "}
          <span className="hero-mini-family type-thin">
            <FamilyName />
          </span>
        </span>
        <span className="hero-mini-hint">Drag to explore. Back to start after a moment.</span>
      </p>
    </div>
  );
}
