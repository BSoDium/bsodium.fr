import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { openSearch } from "~/components/search-palette";
import { KIND_PATHS, KIND_PLURALS } from "~/lib/entries";
import type { HeroMachine, HeroSnapshot } from "~/lib/hero-machine";
import { isMac } from "~/lib/platform";

/** The four shortcuts, in the header's order. Paths and words come from the one table the lists and the navigation use. */
const SHORTCUTS = (["project", "article", "artwork", "poem"] as const).map((kind) => ({ to: KIND_PATHS[kind], label: KIND_PLURALS[kind] }));

/** What the server (and the hydration pass) renders: the full hero. Stable object: a valid server snapshot. */
const SERVER_SNAPSHOT: HeroSnapshot = { state: "rest", world: true };

/** The one sentence the board gives. With no published place it must not send the visitor to a globe with nothing on it. */
const INTRO = "A personal archive organised around places.";
const INTRO_GLOBE = "Pick a point on the globe, or start from a list.";
const INTRO_NO_PLACE = "No place is published yet: start from a list.";

interface LandingHeroProps {
  machine: HeroMachine;
  /** A place or an entry is open: the hero is not the page (its name is no heading then). */
  away: boolean;
  /** No place is published: the globe has nothing on it. */
  empty: boolean;
}

/**
 * The landing hero, over the globe on the home page (docs/landing.md). All type: the wordmark ("Cata" at the thin end of the weight
 * axis, "lyst" at the heavy end), an intro in the light reading serif, a search line that opens the existing palette, and the four lists
 * as hairline rows. Its container ignores the pointer, so the globe stays draggable beneath it; only the search line and the rows take
 * it. At rest it is the page; after a gesture on the globe it steps back to one small line (and comes back after a moment at the world
 * view): `data-hero` is `rest`, `collapsed` or `away`, and the CSS (app.css, "Landing hero") does the rest with opacity and transform.
 *
 * Server and first client render are the same: the machine's server snapshot is the resting hero, and the shortcut's hint ("⌘K" or
 * "Ctrl K", which depends on the visitor's keyboard) is filled in after hydration into a box that already holds its place.
 *
 * Order in the DOM is reading order: name, intro, search, lists. The grid places the name last on a wide screen; focus never lands on it.
 */
export function LandingHero({ machine, away, empty }: LandingHeroProps) {
  const snapshot = useSyncExternalStore(machine.subscribe, machine.getSnapshot, () => SERVER_SNAPSHOT);
  const [hint, setHint] = useState("");
  useEffect(() => setHint(isMac() ? "⌘K" : "Ctrl K"), []);
  const state = away ? "away" : snapshot.state;
  // Away, the panel's own title is the page's h1: the name stays as text, hidden, and is not a second heading.
  const Name = away ? "p" : "h1";

  return (
    <div
      data-slot="landing-hero"
      data-hero={state}
      data-world={snapshot.world ? "true" : "false"}
      aria-hidden={away ? true : undefined}
      className="landing-hero print:hidden"
    >
      <div className="hero-block">
        <Name className="hero-name type-display-xl">
          <span className="type-thin">Cata</span>lyst
        </Name>
        <div className="hero-lead">
          <p className="hero-intro">
            {INTRO} {empty ? INTRO_NO_PLACE : INTRO_GLOBE}
          </p>
          <button
            type="button"
            onClick={openSearch}
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K Meta+K"
            data-slot="hero-search"
            className="hero-search"
          >
            <span aria-hidden="true" className="hero-bullet" />
            <span className="hero-search-label">Search places and entries</span>
            <kbd aria-hidden="true" className="hero-kbd">
              {hint}
            </kbd>
          </button>
        </div>
        <ul className="hero-list">
          {SHORTCUTS.map((s) => (
            <li key={s.to}>
              <Link to={s.to} prefetch="intent" className="hero-row">
                <span>{s.label}</span>
                <span aria-hidden="true" className="hero-arrow">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {/* What stays when the hero has stepped back: the name as one small line and, while the way back is real, the hint. Decoration (the h1 is above). */}
      <p aria-hidden="true" className="hero-mini">
        <span className="hero-mini-name">
          <span className="type-thin">Cata</span>lyst
        </span>
        <span className="hero-mini-hint">Drag to explore. Back to start after a moment.</span>
      </p>
    </div>
  );
}
