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

/** The name's travel to the small line and back (item of the owner's round 3): the same duration and ease as the panel's slide (`--duration-slow`, `--ease-standard`; `lib/tokens.test.ts` keeps them equal). */
export const NAME_TRAVEL_MS = 360;
const NAME_TRAVEL_EASE = "cubic-bezier(0.2, 0, 0, 1)";
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The text's own box (the font's content area), page px: what travels, whatever the element's line box is. */
function textBox(el: Element): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect();
}

/**
 * The name's two halves shrink and travel to their places in the small line, or back (a FLIP: the two rectangles are measured once, here, and the
 * browser runs a `transform` animation on the compositor: translate and ONE uniform scale per half, no font size, no layout, no frame loop in
 * JS, `will-change` only for the length of the animation, by the Web Animations API itself). The scale is the ratio of the two text boxes'
 * widths, the translation puts the box's top-left corner on the other's. An animation still running is turned round, not restarted. Returns the
 * running animations (empty when there is nothing to move: a layout without the small line, a zero-size box).
 */
function travelName(root: HTMLElement, running: Animation[], toMini: boolean): Animation[] {
  if (running.length > 0 && running.every((a) => a.playState === "running")) {
    for (const a of running) a.reverse();
    return running;
  }
  for (const a of running) a.cancel();
  const out: Animation[] = [];
  for (const [from, to] of [
    [".hero-given", ".hero-mini-given"],
    [".hero-family", ".hero-mini-family"],
  ] as const) {
    const el = root.querySelector<HTMLElement>(from);
    const mini = root.querySelector<HTMLElement>(to);
    if (!el || !mini || typeof el.animate !== "function") continue;
    const a = textBox(el);
    const b = textBox(mini);
    if (!(a.width > 0) || !(b.width > 0)) continue;
    const o = el.getBoundingClientRect(); // transform-origin is the element's top-left corner
    const s = b.width / a.width;
    const dx = b.left - o.left - (a.left - o.left) * s;
    const dy = b.top - o.top - (a.top - o.top) * s;
    const animation = el.animate([{ transform: "translate(0px, 0px) scale(1)" }, { transform: `translate(${dx}px, ${dy}px) scale(${s})` }], {
      duration: NAME_TRAVEL_MS,
      easing: NAME_TRAVEL_EASE,
      fill: "both",
      direction: toMini ? "normal" : "reverse",
    });
    // Out of the compositor's hands the moment it is over: what is left is the CSS state (the name faded out, or in place).
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
   * The globe has the orbiting type (`GlobeProps.onOrbit`): it says what the how-to line says, so the line is kept for assistive technology only. `null` or
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

  // The name shrinks into the small line when the hero steps back, and grows out of it on the way back (rest <-> collapsed only: from or to
  // `away` the hero is not on screen; reduced motion: instant, as the CSS).
  const previous = useRef<typeof state>(state);
  const travelling = useRef<Animation[]>([]);
  useIsoLayoutEffect(() => {
    const was = previous.current;
    previous.current = state;
    const root = rootRef.current;
    if (!root || was === state) return;
    const toMini = was === "rest" && state === "collapsed";
    const back = was === "collapsed" && state === "rest";
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ((!toMini && !back) || reduced) {
      for (const a of travelling.current) a.cancel();
      travelling.current = [];
      return;
    }
    travelling.current = travelName(root, travelling.current, toMini);
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
          {/* How to use the page. While the globe says it itself (the orbiting caption, `data-orbit`), this line is for assistive technology only. */}
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
