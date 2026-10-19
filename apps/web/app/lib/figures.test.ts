import { describe, expect, it } from "vitest";
import type { PublishedBodyBlock } from "@catalyst/schemas";
import { figureId, figureInfo, isZoomable, linkableNumbers, linkFigureMentions, splitCaption, zoomLabel } from "./figures";

const img = (n: number, caption?: string): PublishedBodyBlock => ({ type: "image", src: `/media/a/${n}.svg`, alt: String(n), width: 960, height: 600, ...(caption ? { caption } : {}) });
const para = (text: string): PublishedBodyBlock => ({ type: "paragraph", text });
const joined = (runs: ReturnType<typeof linkFigureMentions>) => runs.map((r) => r.text).join("");

describe("figureInfo", () => {
  it("numbers the drawable images in the order they appear, and only captioned ones say it", () => {
    const info = figureInfo([para("a"), img(1, "one"), para("b"), img(2), img(3, "three"), { type: "image", src: "https://evil.test/x.png", alt: "x", caption: "no" } as never, img(4, "four")]);
    expect([...info.entries()].map(([i, f]) => [i, f.number, f.labelled])).toEqual([
      [1, 1, true],
      [3, 2, false],
      [4, 3, true],
      [6, 4, true],
    ]);
    expect([...linkableNumbers(info)]).toEqual([1, 3, 4]);
  });
  it("is empty without images", () => {
    expect(figureInfo([para("a")]).size).toBe(0);
    expect(figureId(3)).toBe("fig-3");
  });
});

describe("linkFigureMentions", () => {
  const known = new Set([1, 2, 3, 12]);
  it("turns a mention of an existing figure into a run that carries its number, the text unchanged", () => {
    const runs = linkFigureMentions("Look at the lamp (Fig. 3) and the board.", known);
    expect(runs).toEqual([{ text: "Look at the lamp (" }, { text: "Fig. 3", figure: 3 }, { text: ") and the board." }]);
    expect(joined(runs)).toBe("Look at the lamp (Fig. 3) and the board.");
  });
  it.each(["Fig. 2", "Fig 2", "Fig.2", "fig. 2", "FIG. 2", "Figure 2", "figure 2"])("reads %s", (m) => {
    expect(linkFigureMentions(`See ${m}.`, known)).toEqual([{ text: "See " }, { text: m, figure: 2 }, { text: "." }]);
  });
  it("links several mentions, repeated ones too (the same number twice: both link)", () => {
    const runs = linkFigureMentions("Fig. 1, then Figure 2, then Fig. 1 again", known);
    expect(runs.filter((r) => r.figure !== undefined).map((r) => r.figure)).toEqual([1, 2, 1]);
    expect(joined(runs)).toBe("Fig. 1, then Figure 2, then Fig. 1 again");
  });
  it("leaves a figure that does not exist, and everything that only looks like a mention, as text", () => {
    for (const text of ["Fig. 9", "Fig. 3a", "Fig. 3.2", "Fig. 03", "Config. 3", "Figs. 2 and 3", "Fig.", "Fig. x", "Figure", "Fig. 123", "a Fig 2b"]) {
      expect(linkFigureMentions(text, known), text).toEqual([{ text }]);
    }
  });
  it("reads a number with more digits as itself, and a sentence end after it as a sentence end", () => {
    expect(linkFigureMentions("Fig. 12.", known)).toEqual([{ text: "Fig. 12", figure: 12 }, { text: "." }]);
    expect(linkFigureMentions("Fig. 1, 2", known)[0]).toEqual({ text: "Fig. 1", figure: 1 });
  });
  it("does nothing without figures to point to", () => {
    expect(linkFigureMentions("Fig. 1", new Set())).toEqual([{ text: "Fig. 1" }]);
    expect(linkFigureMentions("", known)).toEqual([{ text: "" }]);
  });
});

describe("splitCaption", () => {
  it("splits a trailing credit, parentheses kept, and joins back to the authored caption", () => {
    const caption = "A night ticket, Zagreb to Split, as I kept it. (Source: author's own scan.)";
    const { text, credit } = splitCaption(caption);
    expect(text).toBe("A night ticket, Zagreb to Split, as I kept it.");
    expect(credit).toBe("(Source: author's own scan.)");
    expect(`${text} ${credit}`).toBe(caption);
  });
  it.each(["(Photo: A. Writer)", "(Credit: the archive)", "(Image courtesy of the library)", "(Source: x).", "(Illustration: y)"])("knows the credit %s", (c) => {
    expect(splitCaption(`The harbour at dawn ${c}`).credit).toBe(c);
  });
  it("leaves a caption without a credit, a parenthesis that is not one, and a caption that is only a parenthesis, as they are", () => {
    for (const caption of ["The harbour at dawn.", "The harbour (at dawn) from the east.", "The harbour (at dawn)", "(Source: x)", "Before (the storm, 14:00): clear.", "Credit (Source: x) is not last, and so on"]) {
      expect(splitCaption(caption), caption).toEqual({ text: caption, credit: null });
    }
  });
});

describe("isZoomable", () => {
  it("offers the zoom only when the picture is 10 % wider than it is drawn", () => {
    expect(isZoomable(960, 700)).toBe(true);
    expect(isZoomable(770, 700)).toBe(true);
    expect(isZoomable(769, 700)).toBe(false);
    expect(isZoomable(480, 480)).toBe(false);
    expect(isZoomable(undefined, 300)).toBe(false);
    expect(isZoomable(960, 0)).toBe(false);
  });
  it("names the control by the figure", () => {
    expect(zoomLabel(3)).toBe("View figure 3 larger");
    expect(zoomLabel(undefined)).toBe("View image larger");
  });
});
