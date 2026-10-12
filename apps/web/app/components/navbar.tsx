import { NavLink, useLocation, useMatches } from "react-router";
import { SearchPalette } from "~/components/search-palette";
import { parsePanelPath, parseView } from "~/lib/entries";
import { SITE_NAME } from "~/lib/site";
import { cn } from "~/lib/utils";

const LINKS = [
  { to: "/projects", label: "Projects" },
  { to: "/articles", label: "Articles" },
  { to: "/artworks", label: "Artworks" },
  { to: "/poems", label: "Poems" },
] as const;

/**
 * One row of text. 44 px tall targets; the horizontal padding follows the room the row has (the header is a size container, see below),
 * not the viewport: with the place panel open the row has half of it.
 */
const linkClass =
  "pointer-events-auto inline-flex min-h-11 items-center px-1 text-sm transition-colors duration-(--duration-fast) @min-[340px]:px-1.5 @min-[400px]:px-2 @lg:px-2.5";

/**
 * The navigation, centred at the top of the viewport; no logo. Its parts, in reading and focus order: the site's name (a plain text link
 * home, the wordmark: semibold and tight, in the foreground colour, as quiet as the row), the four sections, the search trigger.
 *
 * Where it is centred. Over the whole viewport on every page, except while the place or entry panel sits beside the globe (desktop, `md`
 * and up): then the row is centred over the free left half, the map, so it neither crosses the panel's own header (close and expand) nor
 * floats over the panel's text. The right edge of the header follows the panel's slide (same duration and easing). In the full-screen
 * entry view the panel covers the viewport, the header is centred over all of it and the panel's controls are at the left, clear of it.
 * On a phone the panel is a dialog above this header, which stays centred over the whole screen.
 *
 * The header is a size container (`@container`): what the row shows depends on its own width. From 28 rem the search trigger is shown,
 * from 36 rem its key hint; below that the row is the name and the four sections (about 320 px, fits a 360 px phone).
 *
 * Readability. No background, border or blur of its own: where content scrolls under the row (the lists, the entries) `PageNavScrim`
 * fades it; over the globe and the map (the shell) the row brings a short fade of its own (`.nav-fade`, app.css): the page colour at 85 %
 * at the top edge easing to nothing, as wide as the row plus a soft margin, so the globe is not dimmed across the whole width. The bar itself
 * ignores the pointer so that wheel and touch gestures in the strip still reach the content underneath.
 */
export function Navbar() {
  const { pathname, search } = useLocation();
  const onGlobe = useMatches().some((m) => m.id === "routes/shell");
  const route = parsePanelPath(pathname);
  const fullScreen = route?.type === "entry" && parseView(search) === "full";
  // The panel sits beside the globe: the right half of the viewport is its.
  const beside = route !== null && !fullScreen;

  return (
    <header
      className={cn(
        "@container pointer-events-none fixed top-0 right-0 left-0 z-40",
        "md:transition-[right] md:duration-(--duration-slow) md:ease-(--ease-standard)",
        beside && "md:right-1/2",
      )}
    >
      <div className="flex h-(--navbar-height) items-center justify-center px-2">
        <nav aria-label="Primary" className="relative flex items-center">
          {/* The full-screen entry view has its own, panel-wide fade (detail-panel.tsx); the lists have the page one (nav-scrim.tsx). */}
          {onGlobe && !fullScreen && <span aria-hidden="true" className="nav-fade print:hidden" />}
          <NavLink
            to="/"
            end
            aria-label={`${SITE_NAME}, home`}
            className={cn(linkClass, "font-semibold tracking-tight text-foreground hover:underline hover:decoration-1 hover:underline-offset-8")}
          >
            {SITE_NAME}
          </NavLink>
          {/* A hairline between the name and the sections: the name is the way home, the rest are places to go. */}
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
          <ul className="flex items-center">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  prefetch="intent"
                  className={({ isActive }) =>
                    cn(
                      linkClass,
                      isActive
                        ? "text-foreground underline decoration-1 underline-offset-8"
                        : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <SearchPalette />
        </nav>
      </div>
    </header>
  );
}
