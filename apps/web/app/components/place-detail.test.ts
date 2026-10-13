import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { loadDemoProjection } from "@catalyst/published";
import { getPlaceDetail } from "~/lib/projection";
import { PlaceDetail } from "./place-detail";

const demo = loadDemoProjection();
const render = (slug: string) => renderToStaticMarkup(createElement(StaticRouter, { location: "/" }, createElement(PlaceDetail, { place: getPlaceDetail(demo, slug)! })));

describe("PlaceDetail", () => {
  it("says the name, the country once and the coordinates at the stored precision on one quiet line, with no 'Place' label", () => {
    const html = render("lisbon");
    expect(html).toContain("<h1");
    expect(html).toContain("38.72° N, 9.14° W");
    expect(html).not.toContain("38.7200");
    expect(html.match(/Portugal/g)?.length).toBe(1); // region and country are the same word: said once
    expect(html).not.toMatch(/PLACE|Place\s*<\/(span|p)>/);
    expect(html).not.toMatch(/Entries \/ 000|№/);
  });
  it("groups the entries under the kinds' own headings, without numbering or brackets", () => {
    const html = render("lisbon");
    expect(html).toMatch(/<h2[^>]*>Articles<\/h2>/);
    expect(html).toMatch(/<h2[^>]*>Software<\/h2>/);
    expect(html).not.toMatch(/>0\d<|ds-frame|Entries<\/h2>/);
    // cards in kind groups do not repeat the kind
    expect(html).not.toContain('data-slot="kind-tag"');
  });
  it("renders no entries section at all when nothing is linked, and no empty-state box", () => {
    const html = render("bangkok");
    expect(html).not.toContain('data-slot="place-entries"');
    expect(html).not.toMatch(/Nothing is linked|Entries/);
    expect(html).not.toContain("ds-frame");
  });
  it("blurs the card of a sensitive entry in the place's list, with no control, and not its neighbour", () => {
    const html = render("kyoto");
    expect((html.match(/data-slot="sensitive-media"/g) ?? []).length).toBe(1);
    expect(html).toContain("Mature content");
    expect(html).not.toContain("<button");
    const sensitive = html.slice(html.indexOf('id="figure-study-two"'));
    expect(sensitive.slice(0, sensitive.indexOf("</article>"))).toContain('data-state="hidden"');
    // the other card of the same place is an ordinary one
    const ordinary = html.slice(html.indexOf('id="demo-artwork"'));
    expect(ordinary.slice(0, ordinary.indexOf("</article>"))).not.toContain("sensitive-media");
    expect(render("lisbon")).not.toContain("sensitive-media");
  });
});
