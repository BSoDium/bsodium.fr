import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ScrollRow } from "./scroll-row";

const css = readFileSync(new URL("../../app.css", import.meta.url), "utf8");

describe("ScrollRow", () => {
  it("renders the scroller around its children and no arrow before it is measured (server render, no scripts)", () => {
    const html = renderToStaticMarkup(createElement(ScrollRow, { noun: "tags", children: createElement("ul", null, createElement("li", null, "a")) }));
    expect(html).toContain('data-slot="scroll-row"');
    expect(html).toContain('data-slot="scroll-row-viewport"');
    expect(html).toContain("<ul><li>a</li></ul>");
    expect(html).not.toContain("scroll-row-arrow");
  });
  it("hides the native scrollbar in every engine", () => {
    const start = css.indexOf("\n  .scroll-row-viewport {");
    expect(css.slice(start, css.indexOf("}", start))).toMatch(/scrollbar-width: none/);
    expect(css).toMatch(/\.scroll-row-viewport::-webkit-scrollbar \{\s*display: none/);
  });
  it("draws the arrow as a solid 44 px plate of the page's colour, never a gradient or an opacity", () => {
    const start = css.indexOf(".scroll-row-arrow {");
    const rule = css.slice(start, css.indexOf("}", start));
    expect(rule).toContain("width: 2.75rem");
    expect(rule).toContain("height: 2.75rem");
    expect(rule).toContain("background: var(--background)");
    expect(rule).not.toMatch(/gradient|opacity/);
  });
  it("wires arrows with the names, a passive scroll listener, a ResizeObserver and reduced motion", () => {
    const src = readFileSync(new URL("./scroll-row.tsx", import.meta.url), "utf8");
    expect(src).toContain("`Scroll ${noun} left`");
    expect(src).toContain("`Scroll ${noun} right`");
    expect(src).toContain('{ passive: true }');
    expect(src).toContain("ResizeObserver");
    expect(src).toContain("prefers-reduced-motion: reduce");
    expect(src).toContain('tabIndex={-1}');
  });
});
