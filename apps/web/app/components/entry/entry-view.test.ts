import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { loadDemoProjection } from "@catalyst/published";
import { getEntryDetail } from "~/lib/entries";
import { EntryView } from "./entry-view";

const demo = loadDemoProjection();
const render = (kind: "article" | "poem" | "project" | "artwork", slug: string, layout: "panel" | "full", backTo?: { slug: string; name: string; href: string }) =>
  renderToStaticMarkup(createElement(StaticRouter, { location: "/" }, createElement(EntryView, { entry: getEntryDetail(demo, kind, slug)!, layout, backTo })));

describe("EntryView", () => {
  it("has one h1 (the title, the focus target), the kind and the date as one plain line, and the metadata", () => {
    const html = render("article", "demo-article", "panel");
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain('id="panel-heading"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('data-slot="entry-meta"');
    expect(html).not.toMatch(/ARTICLE \/ 0001|№/);
    expect(html).toMatch(/datetime="2026-03-14"/i);
    expect(html).toContain("Publication");
    expect(html).toContain('aria-label="Tags"');
    expect(html).toContain("/locations/ljubljana");
    expect(html).toContain("/locations/split");
    // entries that share a place with it: the timetable tool (Belgrade, Zagreb) and the night platform (Zagreb, Split)
    expect(html).toContain("/projects/timetable-diff");
    expect(html).toContain("/artworks/night-platform-split");
  });
  it("uses the authored cover when there is one", () => {
    const html = render("article", "demo-article", "panel");
    expect(html).toContain('src="/media/demo/cover-night-trains.svg"');
    expect(html).toContain('width="1200"');
  });
  it("draws generative cover art, seeded by the slug, for an artwork without an image (the image is its page), and for nothing else", () => {
    const artwork = { ...getEntryDetail(demo, "artwork", "demo-artwork")!, cover: undefined };
    const html = renderToStaticMarkup(createElement(StaticRouter, { location: "/" }, createElement(EntryView, { entry: artwork, layout: "panel" })));
    expect(html).toContain('data-slot="entry-cover"');
    expect(html.slice(html.indexOf('data-slot="entry-cover"'), html.indexOf('data-slot="entry-body"'))).toContain('data-slot="cover-art"');
    for (const [kind, slug] of [["article", "demo-article"], ["project", "demo-project"], ["poem", "demo-poem"]] as const) {
      const entry = { ...getEntryDetail(demo, kind, slug)!, cover: undefined };
      const out = renderToStaticMarkup(createElement(StaticRouter, { location: "/" }, createElement(EntryView, { entry, layout: "panel" })));
      expect(out, kind).not.toContain('data-slot="entry-cover"');
    }
  });
  it("takes a project's Status fact as its status tag and its external link as a safe, labelled button", () => {
    const html = render("project", "demo-project", "panel");
    expect(html).toContain('data-slot="status-tag"');
    expect(html).toContain(">Active<");
    expect(html).toContain('href="https://example.org/pixel-globe"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("opens in a new tab");
  });
  it("sets the poem's language on the body", () => {
    expect(render("poem", "demo-poem", "panel")).toContain('lang="en"');
  });
  it("lays the same content out on the 12-column grid when full", () => {
    const panel = render("article", "demo-article", "panel");
    const full = render("article", "demo-article", "full");
    expect(panel).toContain('data-layout="panel"');
    expect(full).toContain('data-layout="full"');
    // the grid is CSS (`.entry[data-layout="full"] .entry-grid`): the markup is the same, only the attribute differs
    expect(full).toContain("max-w-[90rem]");
    expect(panel).not.toContain("max-w-[90rem]");
    // same text, same order
    const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    expect(text(full)).toBe(text(panel));
  });
  it("offers a way back to the place the visitor came from", () => {
    const html = render("article", "demo-article", "panel", { slug: "lisbon", name: "Lisbon", href: "/locations/lisbon" });
    expect(html).toContain("Back to");
    expect(html.indexOf("Back to")).toBeLessThan(html.indexOf("<h1"));
  });
  it("links the neighbours of the kind: the first has a next one only, the last a previous one only, the middle both", () => {
    const first = render("poem", "demo-poem", "panel");
    expect(first).toContain("More poetry");
    expect(first).toContain('rel="next"');
    expect(first).not.toContain('rel="prev"');
    expect(first).toContain("/poetry/citadel-rain");
    const last = render("poem", "quai-de-nuit", "panel");
    expect(last).toContain('rel="prev"');
    expect(last).not.toContain('rel="next"');
    const middle = render("poem", "citadel-rain", "panel");
    expect(middle).toContain('rel="prev"');
    expect(middle).toContain('rel="next"');
    expect(render("article", "demo-article", "panel")).toContain('id="entry-places"');
  });
  it("sets the language of French and Spanish poems on their text", () => {
    expect(render("poem", "quai-de-nuit", "panel")).toContain('lang="fr"');
    expect(render("poem", "cuesta-arriba", "panel")).toContain('lang="es"');
  });
  it("renders every demo entry in both layouts without throwing, with its covers and images from /media/", () => {
    for (const [kind, key] of [["article", "articles"], ["project", "projects"], ["artwork", "artworks"], ["poem", "poems"]] as const) {
      for (const item of demo[key]) {
        for (const layout of ["panel", "full"] as const) {
          const html = render(kind, item.slug, layout);
          expect(html, `${kind}/${item.slug}/${layout}`).toContain("<h1");
          if (item.cover) expect(html).toContain(`src="${item.cover.src}"`);
          else if (kind === "artwork") expect(html).toContain('data-slot="cover-art"');
          else expect(html).not.toContain('data-slot="entry-cover"');
        }
      }
    }
  });
  it("ends with the most related entries as cards and the neighbours of the kind", () => {
    const html = render("article", "demo-article", "panel");
    expect(html).toContain('data-slot="entry-more"');
    expect(html).toContain('aria-labelledby="entry-related"');
    expect(html).toContain('data-slot="entry-neighbours"');
    expect(html.indexOf('data-slot="entry-more"')).toBeGreaterThan(html.indexOf('data-slot="entry-body"'));
  });
  it("has the contents in both layouts (same markup) for a body with three headings, none for a short one", () => {
    for (const layout of ["panel", "full"] as const) {
      const html = render("article", "demo-article", layout);
      expect(html).toContain('data-slot="entry-toc"');
      expect(html).toContain('href="#body-ljubljana-21-40"');
      expect(html).toContain("Jump to contents");
    }
    expect(render("poem", "demo-poem", "full")).not.toContain('data-slot="entry-toc"');
  });
  it("links each tag to the filtered list of its kind", () => {
    expect(render("article", "demo-article", "panel")).toContain('href="/articles?tag=night-trains"');
    expect(render("project", "demo-project", "panel")).toMatch(/href="\/projects\?tag=/);
  });
  it("draws the copy-link button only once hydrated (nothing to press without scripts)", () => {
    expect(render("article", "demo-article", "panel")).not.toContain("Copy link");
  });
  it("shows a computed reading time unless the entry authors one", () => {
    const entry = getEntryDetail(demo, "article", "demo-article")!;
    const words = Array.from({ length: 660 }, (_, i) => `w${i}`).join(" ");
    const noFact = { ...entry, meta: entry.meta.filter((m) => m.label !== "Reading time"), body: [{ type: "paragraph" as const, text: words }] };
    const html = renderToStaticMarkup(createElement(StaticRouter, { location: "/" }, createElement(EntryView, { entry: noFact, layout: "panel" })));
    expect(html).toContain("3 min read");
    expect(render("article", "demo-article", "panel")).not.toContain("min read");
  });

  describe("typography (the boards of the owner's canvas)", () => {
    const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    it("is a reading surface and a container: the surface tokens and the column units follow from these attributes", () => {
      const html = render("article", "demo-article", "full");
      expect(html).toContain('data-surface="reading"');
      expect(html).toMatch(/class="entry mx-auto/);
    });
    it("starts an article with the double rule, the kicker (kind, places, reading time), the headline in the entry-title role and a standfirst", () => {
      const html = render("article", "demo-article", "full");
      const order = ['class="entry-rule"', 'data-slot="entry-meta"', "<h1", 'class="type-standfirst', 'data-slot="entry-dateline"', 'data-slot="entry-margin"', 'data-slot="entry-body"'].map((s) => html.indexOf(s));
      expect(order.every((n) => n >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      expect(html).toMatch(/<h1[^>]*class="entry-title/);
      expect(html).toContain("Ljubljana, Zagreb +2");
      // no author is published, so none is written
      expect(text(html.slice(0, html.indexOf('data-slot="entry-body"')))).not.toMatch(/\bBy \w/);
    });
    it("sets the clause after a comma, a colon or a dash thin against the heavy headline, and the text is still the title", () => {
      const entry = { ...getEntryDetail(demo, "project", "label-collision-engine")!, title: "Collide, a label collision engine for maps" };
      const html = renderToStaticMarkup(createElement(StaticRouter, { location: "/" }, createElement(EntryView, { entry, layout: "panel" })));
      expect(html).toContain('>Collide<span class="entry-title-tail">, a label collision engine for maps</span></h1>');
      expect(render("article", "demo-article", "panel")).not.toContain("entry-title-tail");
    });
    it("fills the marginalia from the data only: where, written (month and year), linked (counts), then the authored facts", () => {
      const html = render("article", "demo-article", "full");
      const margin = html.slice(html.indexOf('data-slot="entry-margin"'), html.indexOf('data-slot="entry-body"'));
      expect(margin).toContain(">Where<");
      expect(margin).toContain(">Linked<");
      expect(margin).toMatch(/4 places, \d+ entries/);
      expect(margin).toContain(">Publication<");
      // the demo article authors a `Written` fact: the computed month and year yields to it
      expect(margin.match(/>Written</g)?.length).toBe(1);
      expect(margin).toContain("On board, March 2026");
      const noFact = { ...getEntryDetail(demo, "article", "demo-article")!, meta: [] };
      const computed = renderToStaticMarkup(createElement(StaticRouter, { location: "/" }, createElement(EntryView, { entry: noFact, layout: "full" })));
      expect(computed).toContain("March 2026");
    });
    it("says a number of related entries only when the list is not capped", () => {
      const entry = getEntryDetail(demo, "article", "demo-article")!;
      const capped = { ...entry, related: Array.from({ length: 6 }, () => entry.related[0]!) };
      const html = renderToStaticMarkup(createElement(StaticRouter, { location: "/" }, createElement(EntryView, { entry: capped, layout: "full" })));
      expect(html).toContain("4 places<");
      expect(html).not.toMatch(/4 places, 6 entries/);
    });
    it("sets an article's images apart from its text, after it (the figures column), numbered", () => {
      const html = render("article", "demo-article", "full");
      const body = html.slice(html.indexOf('data-slot="entry-body"'), html.indexOf('data-slot="entry-figures"'));
      expect(html).toContain('data-slot="entry-figures"');
      expect(body).not.toContain("<img");
      expect(html.slice(html.indexOf('data-slot="entry-figures"'))).toContain("Fig. 1 ");
      expect(html.indexOf('data-slot="entry-figures"')).toBeLessThan(html.indexOf('data-slot="entry-more"'));
    });
    it("keeps an artwork's images in its text, wide, and its marginalia mono facts", () => {
      const html = render("artwork", "demo-artwork", "full");
      expect(html).not.toContain('data-slot="entry-figures"');
      expect(html.slice(html.indexOf('data-slot="entry-body"'))).toContain("<img");
      expect(html).toContain(">Medium<");
    });
    it("puts a poem's title, then its lines, then its marginalia (the grid places the margin beside the title on a wide screen)", () => {
      const html = render("poem", "demo-poem", "full");
      expect(html).toMatch(/<h1[^>]*data-poem/);
      expect(html).not.toContain('class="entry-rule"');
      const order = ["<h1", 'data-slot="entry-body"', 'data-slot="entry-margin"'].map((s) => html.indexOf(s));
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      expect(html).toContain("open on the globe");
      // the board's marginalia: the place and the date in plain mono, no "Where" label
      expect(html).not.toContain(">Where<");
    });
    it("does not set the kind in a kind hue or give an entry's headline a utility size (the role carries them)", () => {
      for (const kind of [["article", "demo-article"], ["poem", "demo-poem"], ["project", "demo-project"], ["artwork", "demo-artwork"]] as const) {
        const html = render(kind[0], kind[1], "panel");
        expect(html, kind[0]).not.toMatch(/<h1[^>]*(text-2xl|text-3xl|text-4xl|font-semibold)/);
      }
    });
  });
});

describe("EntryView of a sensitive entry (mature content)", () => {
  const cover = demo.artworks.find((a) => a.slug === "figure-study-two")!.cover!;
  const sensitive = (layout: "panel" | "full") => render("artwork", "figure-study-two", layout);
  it("blurs the cover and every image block from the server render, in the panel and in full screen, each with its control slot", () => {
    for (const layout of ["panel", "full"] as const) {
      const html = sensitive(layout);
      expect(html, layout).toContain('data-sensitive=""');
      expect((html.match(/data-slot="sensitive-media"/g) ?? []).length, layout).toBe(2); // the cover and the one image block
      expect((html.match(/data-slot="sensitive-media"[^>]*data-state="hidden"/g) ?? []).length, layout).toBe(2);
      expect(html.match(/data-state="revealed"/g) ?? [], layout).toEqual([]);
      expect((html.match(/Mature content/g) ?? []).length, layout).toBeGreaterThanOrEqual(2);
      // the sharp picture is only ever inside a frame: no <img> of this entry is outside one
      const body = html.slice(0, html.indexOf('data-slot="entry-more"') === -1 ? undefined : html.indexOf('data-slot="entry-more"'));
      for (const img of body.matchAll(/<img\b[^>]*>/g)) {
        const at = img.index!;
        expect(body.slice(Math.max(0, at - 40), at), `${layout}: ${img[0]}`).toContain('class="sensitive-media-content">');
      }
      // the alt text is as authored
      expect(html).toContain(`alt="${cover.alt}"`);
    }
  });
  it("does not blur the generated cover art (it is not a picture of anything) nor an ordinary artwork", () => {
    const generated = renderToStaticMarkup(
      createElement(StaticRouter, { location: "/" }, createElement(EntryView, { entry: { ...getEntryDetail(demo, "artwork", "figure-study-two")!, cover: undefined }, layout: "panel" })),
    );
    expect(generated).toContain('data-slot="cover-art"');
    // the image block is still blurred
    expect((generated.match(/data-slot="sensitive-media"/g) ?? []).length).toBe(1);
    const ordinary = render("artwork", "altiplano-sediment", "panel");
    expect(ordinary).not.toContain("sensitive-media");
    expect(ordinary).not.toContain("Mature content");
    expect(ordinary).not.toContain("data-sensitive");
  });
  it("blurs the card of a sensitive entry among the related ones of another, with no control", () => {
    const html = render("artwork", "demo-artwork", "panel");
    const more = html.slice(html.indexOf('data-slot="entry-more"'));
    expect(more).toContain("/artworks/figure-study-two");
    expect((more.match(/data-slot="sensitive-media"/g) ?? []).length).toBe(1);
    expect(more).not.toContain("<button");
    // the entry's own cover (not sensitive) is untouched
    expect(html.slice(0, html.indexOf('data-slot="entry-more"'))).not.toContain("sensitive-media");
  });
  it("keeps the whole text of the page (only the images are guarded) and says each image is hidden where there is no control yet", () => {
    const text = sensitive("panel").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("Figure Study in Charcoal");
    expect(text).toContain("Made in a single three-hour session");
    expect((text.match(/Image hidden/g) ?? []).length).toBe(2);
  });
});
