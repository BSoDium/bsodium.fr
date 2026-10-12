import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createStaticHandler, createStaticRouter, StaticRouterProvider, type StaticHandlerContext } from "react-router";
import { describe, expect, it } from "vitest";
import { createHeroMachine } from "~/lib/hero-machine";
import { SITE_NAME } from "~/lib/site";
import { LandingHero } from "./landing-hero";

async function render(props: { away?: boolean; empty?: boolean } = {}, machine = createHeroMachine()): Promise<string> {
  const routes = [{ id: "routes/shell", path: "*", Component: () => createElement(LandingHero, { machine, away: props.away ?? false, empty: props.empty ?? false }) }];
  const handler = createStaticHandler(routes);
  const context = (await handler.query(new Request("http://localhost/"))) as StaticHandlerContext;
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(createElement(StaticRouterProvider, { router, context, hydrate: false }));
}

describe("LandingHero", () => {
  it("is the resting hero in the server's HTML, whatever the machine's state on the client (no flash of another state)", async () => {
    const machine = createHeroMachine();
    machine.interact();
    // `renderToStaticMarkup` reads the server snapshot, which is always the resting hero
    const html = await render({}, machine);
    expect(html).toContain('data-hero="rest"');
    expect(html).toContain('data-world="true"');
    machine.stop();
  });

  it("is the page's h1, the name set thin then heavy, and says the site's name", async () => {
    const html = await render();
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toMatch(/<h1 class="hero-name type-display-xl"><span class="type-thin">Cata<\/span>lyst<\/h1>/);
    expect("Cata" + "lyst").toBe(SITE_NAME);
  });

  it("says the owner's sentences: the intro, with no place a line that does not point at an empty globe", async () => {
    const html = await render();
    expect(html).toContain("A personal archive organised around places. Pick a point on the globe, or start from a list.");
    const empty = await render({ empty: true });
    expect(empty).toContain("A personal archive organised around places. No place is published yet: start from a list.");
    expect(empty).not.toContain("Pick a point");
  });

  it("has a labelled search button that names the shortcut, then the four lists as links in order", async () => {
    const html = await render();
    const search = html.indexOf('data-slot="hero-search"');
    expect(search).toBeGreaterThan(0);
    const button = html.slice(html.lastIndexOf("<button", search), html.indexOf("</button>", search));
    expect(button).toContain("Search places and entries");
    expect(button).toContain('aria-haspopup="dialog"');
    expect(button).toContain('aria-keyshortcuts="Control+K Meta+K"');
    expect(button).toContain('type="button"');
    const links = [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>(?:<span>)?([^<]*)</g)].map((m) => [m[1], m[2]]);
    expect(links).toEqual([
      ["/projects", "Projects"],
      ["/articles", "Articles"],
      ["/artworks", "Artworks"],
      ["/poems", "Poems"],
    ]);
    // reading order: name, intro, search, the lists
    expect(html.indexOf("hero-name")).toBeLessThan(html.indexOf("hero-intro"));
    expect(html.indexOf("hero-intro")).toBeLessThan(search);
    expect(search).toBeLessThan(html.indexOf('href="/projects"'));
  });

  it("shows no count, no number and no invented name", async () => {
    const html = await render();
    const text = html.replace(/<[^>]+>/g, " ");
    expect(text).not.toMatch(/\d/);
  });

  it("is away, hidden from assistive technology and no second heading, while a place or entry is open", async () => {
    const html = await render({ away: true });
    expect(html).toContain('data-hero="away"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/<h1[ >]/);
    expect(html).toMatch(/<p class="hero-name type-display-xl">/);
  });

  it("keeps the small line (name and hint) as decoration: aria-hidden, a second name is not a second heading", async () => {
    const html = await render();
    const mini = html.slice(html.indexOf('<p aria-hidden="true" class="hero-mini">'));
    expect(mini).toContain("Drag to explore. Back to start after a moment.");
    expect(html.match(/<h[1-6][ >]/g)).toHaveLength(1);
  });
});

describe("the hero's CSS (app.css, 'Landing hero')", () => {
  const css = readFileSync(new URL("../app.css", import.meta.url), "utf8");
  const block = css.slice(css.indexOf("Landing hero and the header's type"));
  const rule = (selector: string) => {
    const from = block.indexOf(`${selector} {`);
    return from < 0 ? "" : block.slice(from, block.indexOf("\n  }", from));
  };

  it("sits at the end of the file, after the other styles", () => {
    expect(css.indexOf("Landing hero and the header's type")).toBeGreaterThan(css.indexOf(".places-nav {"));
    expect(css.indexOf("Landing hero and the header's type")).toBeGreaterThan(css.indexOf(".nav-progress {"));
  });

  it("ignores the pointer except the search line and the rows, and lets the globe's credits (z 20) and the header (z 40) sit above it", () => {
    expect(rule(".landing-hero")).toContain("pointer-events: none");
    expect(rule(".landing-hero")).toMatch(/z-index: 10;/);
    expect(rule(".hero-search")).toContain("pointer-events: auto");
    expect(rule(".hero-row")).toContain("pointer-events: auto");
  });

  it("moves nothing but opacity and transform (and visibility, which follows the fade), with the token duration", () => {
    expect(block).toMatch(/transition-property: opacity, transform, visibility;/);
    expect(block).toContain("transition-duration: var(--duration-base), var(--duration-base), 0s;");
    expect(block).not.toMatch(/transition[^;]*\b(width|height|top|left|margin|padding|font-size)\b/);
    expect(block).not.toMatch(/@keyframes|animation:/);
  });

  it("turns every transition off under reduced motion", () => {
    expect(block).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.landing-hero \*,\s*\.landing-hero::before \{\s*transition: none !important;/);
  });

  it("uses the tokens: the accent only on the search bullet and the row's hover, the display and reading faces", () => {
    const uses = block.split("\n").filter((l) => l.includes("var(--signal)") && !l.includes("--signal-"));
    expect(uses).toHaveLength(2);
    expect(rule(".hero-bullet")).toContain("background: var(--signal)");
    expect(block).toMatch(/\.hero-row:hover,\s*\.hero-row:focus-visible \{\s*color: var\(--signal\);/);
    expect(rule(".hero-name")).not.toContain("--signal");
    expect(rule(".hero-intro")).toContain("font-family: var(--font-reading)");
    expect(rule(".hero-row")).toContain("font-family: var(--font-display)");
    expect(rule(".hero-search")).toContain("font-family: var(--font-meta)");
  });

  it("keeps the header's accent state at the text-safe token (these are under 24 px)", () => {
    expect(block).toMatch(/\.nav-link:hover,\s*\.nav-link:focus-visible \{\s*color: var\(--signal-text\);/);
  });
});
