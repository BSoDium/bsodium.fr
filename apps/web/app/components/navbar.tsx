import { NavLink, useLocation, useMatches } from "react-router";
import { SearchPalette } from "~/components/search-palette";
import { parsePanelPath, parseView } from "~/lib/entries";
import { useHeroResting } from "~/lib/hero-rest";
import { SITE_NAME } from "~/lib/site";
import { cn } from "~/lib/utils";

/** The first item names the globe (the home page): the site's own name is the landing hero's headline and the document title, not the row's. */
const HOME_LABEL = "Globe";

const LINKS = [
  { to: "/projects", label: "Projects" },
  { to: "/articles", label: "Articles" },
  { to: "/artworks", label: "Artworks" },
  { to: "/poems", label: "Poems" },
] as const;

interface NavbarProps {
  /** A fixed answer in place of the hero's published state (tests: the server snapshot is always "at rest"). */
  heroResting?: boolean | undefined;
}

/**
 * One row of mono capitals (`.nav-link`, app.css: size, tracking and the gap between items follow the room the row has, because the header
 * is a size container: with the place panel open the row has half of the viewport). 44 px tall targets. The current one is in the
 * foreground and underlined, the others muted, and the pointer or the keyboard turns an item to the accent.
 */
const linkClass = "nav-link pointer-events-auto inline-flex min-h-11 items-center";

/**
 * The navigation, centred at the top of the viewport; no logo. Its parts, in reading and focus order: "Globe" (the way home: the globe is
 * the home page; the site's name is the landing hero's headline), the four sections, the search trigger.
 *
 * On the home page, while the landing hero is at rest, the header is the search trigger alone: the hero's four rows are the sections
 * (docs/landing.md), and two sets of the same links one above the other is redundancy. Its nav landmark gives way to the hero's list
 * (the page has exactly one "Primary" navigation in the accessibility tree at any time), and the sections come back with the hero's
 * departure (a gesture on the globe, a zoomed-in view: the rows are hidden then). Every other route has the header below, unchanged.
 *
 * Where it is centred. Over the whole viewport on every page, except while the place or entry panel sits beside the globe (desktop, `md`
 * and up): then the row is centred over the free left half, the map, so it neither crosses the panel's own header (close and expand) nor
 * floats over the panel's text. The right edge of the header follows the panel's slide (same duration and easing). In the full-screen
 * entry view the panel covers the viewport, the header is centred over all of it and the panel's controls are at the left, clear of it.
 * On a phone the panel is a dialog above this header, which stays centred over the whole screen.
 *
 * The header is a size container (`@container`): what the row shows depends on its own width. From 28 rem the search trigger is shown,
 * from 36 rem its key hint; below that the row is the five items and, in place of the icon, the one word "Search" (a 44 px target, fits a
 * 360 px phone: `.nav-link` shrinks its size, tracking and gaps by container width).
 *
 * Readability. No background, border or blur of its own: where content scrolls under the row (the lists, the entries) `PageNavScrim`
 * fades it; over the globe and the map (the shell) the row brings a short fade of its own (`.nav-fade`, app.css): the page colour at 85 %
 * at the top edge easing to nothing, as wide as the row plus a soft margin, so the globe is not dimmed across the whole width. The bar itself
 * ignores the pointer so that wheel and touch gestures in the strip still reach the content underneath.
 */
export function Navbar({ heroResting: forced }: NavbarProps) {
  const { pathname, search } = useLocation();
  const onGlobe = useMatches().some((m) => m.id === "routes/shell");
  const route = parsePanelPath(pathname);
  const fullScreen = route?.type === "entry" && parseView(search) === "full";
  // The panel sits beside the globe: the right half of the viewport is its.
  const beside = route !== null && !fullScreen;
  // The home page's hero shows the sections itself while it is at rest.
  const stored = useHeroResting();
  const heroResting = forced ?? stored;
  const sections = !(pathname === "/" && heroResting);

  return (
    <header
      className={cn(
        "@container pointer-events-none fixed top-0 right-0 left-0 z-40",
        "md:transition-[right] md:duration-(--duration-slow) md:ease-(--ease-standard)",
        beside && "md:right-1/2",
      )}
    >
      <div className="flex h-(--navbar-height) items-center justify-center px-2">
        {/* The same element with or without the sections, so the search palette inside it keeps its state; without them it is no landmark. */}
        <nav aria-label={sections ? "Primary" : undefined} role={sections ? undefined : "none"} className="relative flex items-center">
          {/* The full-screen entry view has its own, panel-wide fade (detail-panel.tsx); the lists have the page one (nav-scrim.tsx). */}
          {onGlobe && !fullScreen && <span aria-hidden="true" className="nav-fade print:hidden" />}
          {sections && (
            <NavLink
              to="/"
              end
              aria-label={`${HOME_LABEL}, ${SITE_NAME} home`}
              className={({ isActive }) => cn(linkClass, isActive ? "text-foreground underline decoration-1 underline-offset-8" : "text-muted-foreground")}
            >
              {HOME_LABEL}
            </NavLink>
          )}
          {sections && (
            <ul className="flex items-center">
              {LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    prefetch="intent"
                    className={({ isActive }) =>
                      cn(linkClass, isActive ? "text-foreground underline decoration-1 underline-offset-8" : "text-muted-foreground")
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
          <SearchPalette />
        </nav>
      </div>
    </header>
  );
}
