import { useEffect, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { openSearch } from "~/components/search-palette";
import { Icon, KeyHint } from "~/components/ui";
import { KIND_PATHS, KIND_PLURALS } from "~/lib/entries";
import type { HeroMachine, HeroSnapshot } from "~/lib/hero-machine";
import { setHeroResting } from "~/lib/hero-rest";
import { SITE, SITE_TAGLINE } from "~/lib/site";

/** The four shortcuts, in the header's order. Paths and words come from the one table the lists and the navigation use. */
const SHORTCUTS = (["project", "article", "artwork", "poem"] as const).map((kind) => ({ to: KIND_PATHS[kind], label: KIND_PLURALS[kind] }));

/** What the server (and the hydration pass) renders: the full hero. Stable object: a valid server snapshot. */
const SERVER_SNAPSHOT: HeroSnapshot = { state: "rest", world: true };

/** Under who the owner is (`SITE_TAGLINE`): how to use the page. With no published place it must not send the visitor to a globe with nothing on it. */
const HINT_GLOBE = "Pick a point on the globe, or start from a list.";
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
export function LandingHero({ machine, away, empty }: LandingHeroProps) {
  const snapshot = useSyncExternalStore(machine.subscribe, machine.getSnapshot, () => SERVER_SNAPSHOT);
  const state = away ? "away" : snapshot.state;
  // The header reads this: while the rows are showing it carries no section links of its own.
  useEffect(() => {
    setHeroResting(state === "rest");
    return () => setHeroResting(true);
  }, [state]);
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
          <span className="hero-given">{SITE.givenName}</span> <span className="hero-family type-thin">
            <FamilyName />
          </span>
        </Name>
        <div className="hero-lead">
          <p className="hero-intro">{SITE_TAGLINE}</p>
          <p className="hero-hint">{empty ? HINT_NO_PLACE : HINT_GLOBE}</p>
          <button
            type="button"
            onClick={openSearch}
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K Meta+K"
            data-slot="hero-search"
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
          {SITE.givenName}{" "}
          <span className="type-thin">
            <FamilyName />
          </span>
        </span>
        <span className="hero-mini-hint">Drag to explore. Back to start after a moment.</span>
      </p>
    </div>
  );
}
