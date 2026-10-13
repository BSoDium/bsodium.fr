import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { ArchiveEmpty } from "./archive-empty";

describe("ArchiveEmpty", () => {
  it("opens the four sections in order, the poems' one named Poetry at /poetry", () => {
    const html = renderToStaticMarkup(createElement(StaticRouter, { location: "/" }, createElement(ArchiveEmpty, { counts: { article: 2, project: 1, artwork: 0, poem: 3 } })));
    const links = [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*><span[^>]*>([^<]*)<\/span>/g)].map((m) => [m[1], m[2]]);
    expect(links).toEqual([
      ["/articles", "Articles"],
      ["/projects", "Projects"],
      ["/artworks", "Artworks"],
      ["/poetry", "Poetry"],
    ]);
    expect(html).not.toMatch(/Poems|\/poems/);
  });
});
