import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createStaticHandler, createStaticRouter, StaticRouterProvider, type StaticHandlerContext } from "react-router";
import { describe, expect, it } from "vitest";
import { SITE_NAME } from "~/lib/site";
import { Navbar } from "./navbar";

/** The navbar server-rendered at `url`; `shell` stands for the route that owns the globe (`routes/shell`). */
async function render(url: string, { shell = true, heroResting }: { shell?: boolean; heroResting?: boolean } = {}): Promise<string> {
  const routes = [{ id: shell ? "routes/shell" : "routes/list", path: "*", Component: () => createElement(Navbar, { heroResting }) }];
  const handler = createStaticHandler(routes);
  const context = (await handler.query(new Request(`http://localhost${url}`))) as StaticHandlerContext;
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(createElement(StaticRouterProvider, { router, context, hydrate: false }));
}

describe("Navbar", () => {
  it("has no logo: the first item is \"Globe\" as plain text, a link home; then the four sections, in order, then the search", async () => {
    const html = await render("/articles", { shell: false });
    // the only drawing in the header is the search icon, after the links: no mark, no icon in front of the name
    expect(html.indexOf("<svg")).toBeGreaterThan(html.indexOf('href="/poetry"'));
    expect(html.match(/<svg/g)).toHaveLength(1);
    const links = [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]);
    expect(links).toEqual([
      ["/", "Globe"],
      ["/projects", "Projects"],
      ["/articles", "Articles"],
      ["/artworks", "Artworks"],
      ["/poetry", "Poetry"],
    ]);
    // the accessible name starts with the visible word and says what it is
    expect(html).toContain(`aria-label="Globe, ${SITE_NAME} home"`);
    expect(html.match(/aria-label="Primary"/g)).toHaveLength(1);
    // the search trigger follows the links in the DOM (so in the focus order)
    expect(html.indexOf('data-slot="search-trigger"')).toBeGreaterThan(html.indexOf('href="/poetry"'));
  });

  it("on the home page, while the hero is at rest, renders no header at all: its rows are the sections and its search line is the search", async () => {
    const html = await render("/");
    // nothing visible: no bar, no links, no search trigger, no landmark (the palette itself is closed until opened)
    expect(html).not.toContain("<header");
    expect(html).not.toContain("<nav");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("search-trigger");
    expect(html).not.toContain("nav-fade");
  });

  it("on the home page, once the hero has stepped back (its rows are hidden), brings the sections back", async () => {
    const html = await render("/", { heroResting: false });
    const links = [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map((m) => m[1]);
    expect(links).toEqual(["/", "/projects", "/articles", "/artworks", "/poetry"]);
    expect(html.match(/aria-label="Primary"/g)).toHaveLength(1);
    // the key hint is plain muted text: the command key's name in a kbd with no box, no border, no background
    const kbd = html.slice(html.indexOf("<kbd"), html.indexOf("</kbd>"));
    expect(kbd).toContain('class="ds-kbd');
    expect(kbd).not.toMatch(/border|bg-|data-boxed|outline|ring/);
  });

  it("is unchanged on every other route, whatever the hero's state (it is not on the page there)", async () => {
    for (const url of ["/articles", "/poetry", "/locations/x", "/articles/x"]) {
      const html = await render(url, { shell: url.startsWith("/locations") || url.startsWith("/articles/"), heroResting: true });
      expect([...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]), url).toEqual(["/", "/projects", "/articles", "/artworks", "/poetry"]);
      expect(html, url).toContain('aria-label="Primary"');
    }
  });

  it("offers the search as one word where the icon trigger is not shown (a phone), after the links, with no drawing", async () => {
    const html = await render("/articles", { shell: false });
    const compact = html.indexOf('data-slot="search-trigger-compact"');
    expect(compact).toBeGreaterThan(html.indexOf('href="/poetry"'));
    expect(html.slice(compact, html.indexOf("</button>", compact))).toMatch(/>Search$/);
    expect(html.slice(compact, html.indexOf("</button>", compact))).not.toContain("<svg");
    expect(html.slice(compact, html.indexOf("</button>", compact))).toContain("@md:hidden");
  });

  it("marks the search triggers as needing a script (not drawn without one: a dead control), keeps the links, and gives every item a 44 px target", async () => {
    const html = await render("/articles", { shell: false });
    expect(html.match(/data-needs-script=""/g)).toHaveLength(2);
    expect(html).toMatch(/data-slot="search-trigger-compact"[^>]*data-needs-script=""/);
    expect(html).toMatch(/data-slot="search-trigger"[^>]*data-needs-script=""/);
    // the shortest word ("Globe") is as wide as it is tall at the smallest phone
    expect(html.match(/class="nav-link[^"]*min-h-11 min-w-11[^"]*"/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("marks the current page with aria-current on the name (when it is shown) or the section", async () => {
    expect(await render("/", { heroResting: false })).toMatch(/<a [^>]*aria-current="page"[^>]*href="\/"|<a [^>]*href="\/"[^>]*aria-current="page"/);
    const articles = await render("/articles", { shell: false });
    expect(articles).toMatch(/<a [^>]*aria-current="page"[^>]*>Articles<\/a>/);
    expect(articles).not.toMatch(/<a [^>]*aria-current="page"[^>]*>Projects<\/a>/);
  });

  it("is centred over the whole viewport, except beside the place and entry panels where it is centred over the map", async () => {
    for (const url of ["/", "/articles", "/articles/x?view=full", "/poetry/x?view=full&tag=y"]) {
      expect(await render(url), url).not.toContain("md:right-1/2");
    }
    // (a place has no full-screen view: `?view=full` on a place is still the side panel)
    for (const url of ["/locations/x", "/locations/x?view=full", "/articles/x", "/projects/x?view=panel", "/poetry/x?tag=y"]) {
      expect(await render(url), url).toContain("md:right-1/2");
    }
  });

  it("carries its own fade over the globe and the map only (the lists have the page scrim, the full-screen view the panel's)", async () => {
    expect(await render("/", { heroResting: false })).toContain("nav-fade");
    expect(await render("/locations/x")).toContain("nav-fade");
    expect(await render("/articles", { shell: false })).not.toContain("nav-fade");
    expect(await render("/articles/x?view=full")).not.toContain("nav-fade");
  });
});

describe(".nav-fade (app.css)", () => {
  const css = readFileSync(new URL("../app.css", import.meta.url), "utf8");
  const block = (() => {
    const from = css.indexOf("  .nav-fade {");
    return css.slice(from, css.indexOf("\n  }", from));
  })();
  const stops = [...(/background: linear-gradient\(\s*to bottom,([\s\S]*?)\);/.exec(block)?.[1] ?? "").matchAll(/(?:color-mix\(in srgb, var\(--background\) (\d+)%, transparent\)|(transparent)) (\d+)%/g)].map((m) => ({
    alpha: m[2] ? 0 : Number(m[1]),
    at: Number(m[3]),
  }));

  it("is the page colour at 85 % at the top edge, flat past the row's text, and falls monotonically to nothing", () => {
    expect(stops[0]).toEqual({ alpha: 85, at: 0 });
    expect(stops.at(-1)).toEqual({ alpha: 0, at: 100 });
    for (let i = 1; i < stops.length; i++) expect(stops[i]!.alpha).toBeLessThanOrEqual(stops[i - 1]!.alpha);
    // the row's text is centred at navbar-height / 2 of navbar-height + 3.5rem = 56 / 112 = 25 %: the fade there stays at 80 % or more,
    // the figure globe/engine/readability.test.ts assumes for the nav links
    const at = (p: number) => {
      const hi = stops.findIndex((s) => s.at >= p);
      const a = stops[hi - 1]!, b = stops[hi]!;
      return a.alpha + ((b.alpha - a.alpha) * (p - a.at)) / (b.at - a.at);
    };
    expect(at(25)).toBeGreaterThanOrEqual(80);
    // an eased fall: no step taller than 16 points between two stops after the plateau
    for (let i = 1; i < stops.length; i++) expect(stops[i - 1]!.alpha - stops[i]!.alpha).toBeLessThanOrEqual(16);
  });

  it("never catches the pointer, sits behind the links, has no blur and melts into the map at both ends", () => {
    expect(block).toContain("pointer-events: none");
    expect(block).toContain("z-index: -1");
    expect(block).not.toContain("backdrop-filter");
    expect(block).toMatch(/mask-image: linear-gradient\(\s*to right,\s*transparent 0,/);
    expect(block).toContain("height: var(--fade-height)");
    expect(css).toMatch(/--fade-height: calc\(var\(--navbar-height\) \+ 3\.5rem\)/);
  });

  it("has its own states for reduced transparency and forced colours", () => {
    expect(css).toMatch(/prefers-reduced-transparency: reduce\)[\s\S]*\.nav-fade \{/);
    expect(css).toMatch(/forced-colors: active\)[\s\S]*\.nav-fade \{[^}]*Canvas/);
    // a solid band (forced colours drop gradients and the mask would hide it), as tall as the row
    expect(css).toMatch(/forced-colors: active\)\s*\{[^@]*\.nav-fade \{[^}]*height: var\(--navbar-height\);[^}]*background: Canvas;[^}]*background-image: none;[^}]*mask-image: none;/);
  });
});
