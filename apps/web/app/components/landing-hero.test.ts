import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createStaticHandler, createStaticRouter, StaticRouterProvider, type StaticHandlerContext } from "react-router";
import { describe, expect, it } from "vitest";
import { createHeroMachine } from "~/lib/hero-machine";
import { SITE_NAME, SITE_TAGLINE } from "~/lib/site";
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

  it("is the page's h1: the owner's name, the given name at the heavy end of the weight axis (800) and the family name at the thin end (200)", async () => {
    const html = await render();
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toMatch(
      /<h1 class="hero-name type-display-xl"><span class="hero-given">Elliot<\/span> <span class="hero-family type-thin"><span>Négrel<\/span><span><span class="hero-hyphen">-<\/span>Jerzy<\/span><\/span><\/h1>/,
    );
    const heading = /<h1[^>]*>(.*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, "");
    expect(heading).toBe(SITE_NAME);
    expect(SITE_NAME).toBe("Elliot Négrel-Jerzy");
  });

  it("says who the owner is from the published facts only, then how to use the page; with no place a line that does not point at an empty globe", async () => {
    const html = await render();
    expect(html).toContain(`<p class="hero-intro">${SITE_TAGLINE}</p>`);
    expect(SITE_TAGLINE).toBe(
      "Front-end and UX software engineer based in Paris. Data visualisation, geospatial and cartography interfaces, design systems, computer graphics.",
    );
    expect(html).toContain('<p class="hero-hint">Pick a point on the globe, or start from a list.</p>');
    const empty = await render({ empty: true });
    expect(empty).toContain('<p class="hero-hint">No place is published yet: start from a list.</p>');
    expect(empty).not.toContain("Pick a point");
  });

  it("is the home page's primary navigation: the four lists in a nav landmark, with an icon each that is decoration", async () => {
    const html = await render();
    const nav = html.slice(html.indexOf('<nav aria-label="Primary" class="hero-list">'), html.indexOf("</nav>"));
    expect(nav).toContain("<ul>");
    expect(nav.match(/<svg/g)).toHaveLength(4);
    expect(nav.match(/aria-hidden="true"/g)?.length).toBe(4);
  });

  it("has a labelled search button that names the shortcut, then the four lists as links in order", async () => {
    const html = await render();
    const search = html.indexOf('data-slot="hero-search"');
    expect(search).toBeGreaterThan(0);
    const button = html.slice(html.lastIndexOf("<button", search), html.indexOf("</button>", search));
    expect(button).toContain("Search places and entries");
    // the search icon of the icon set, at the control size: not the old square bullet
    expect(button).toContain("<svg");
    expect(button).toContain('data-size="control"');
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

  it("shows no count, no number, no employer and no code name", async () => {
    const html = await render();
    const text = html.replace(/<[^>]+>/g, " ");
    expect(text).not.toMatch(/\d/);
    expect(html).not.toMatch(/catalyst/i);
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
    // the same weights as the name: the given name heavy (the line's own 800), the family name at the thin end
    expect(mini).toMatch(/<span class="hero-mini-name">Elliot <span class="type-thin"><span>Négrel<\/span>/);
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

  it("uses the tokens: the accent only on the row's hover, the display and reading faces", () => {
    const uses = block.split("\n").filter((l) => l.includes("var(--signal)") && !l.includes("--signal-"));
    expect(uses).toHaveLength(1);
    expect(block).not.toContain("hero-bullet");
    expect(block).toMatch(/\.hero-row:hover,\s*\.hero-row:focus-visible \{\s*color: var\(--signal\);/);
    expect(rule(".hero-name")).not.toContain("--signal");
    expect(rule(".hero-intro")).toContain("font-family: var(--font-reading)");
    expect(rule(".hero-row")).toContain("font-family: var(--font-display)");
    expect(rule(".hero-search")).toContain("font-family: var(--font-meta)");
  });

  it("sets the name's heavy half on the given name and does not span the width: a share of it (--hero-span), the phone's family name fills it", () => {
    expect(rule(".hero-name")).not.toContain("type-thin");
    expect(css).toMatch(/--hero-span: 0\.7[0-5];/);
    expect(css).toMatch(/--hero-size: min\(calc\(100vw \* var\(--hero-span\) \/ var\(--hero-fit\)\), 33vh, 30rem\);/);
    // the phone's rule is the gutter-to-gutter fill
    expect(css).toMatch(/max-width: 47\.99rem\) \{\s*\.landing-hero \{[^}]*--hero-size: min\(calc\(\(100vw - 2 \* var\(--hero-gutter\)\) \/ var\(--hero-fit\)\), 24vh\);/);
    expect(rule(".hero-mini-name")).toContain("font-weight: var(--weight-heavy)");
  });

  it("keeps the header's accent state at the text-safe token (these are under 24 px)", () => {
    expect(block).toMatch(/\.nav-link:hover,\s*\.nav-link:focus-visible \{\s*color: var\(--signal-text\);/);
  });
});
