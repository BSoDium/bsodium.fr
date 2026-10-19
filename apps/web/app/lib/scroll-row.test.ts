import { describe, expect, it } from "vitest";
import { scrollEdges, scrollStep } from "./scroll-row";

describe("scrollEdges", () => {
  it("shows no arrow when the row fits", () => {
    expect(scrollEdges({ scrollLeft: 0, clientWidth: 390, scrollWidth: 390 })).toEqual({ start: false, end: false });
    expect(scrollEdges({ scrollLeft: 0, clientWidth: 390, scrollWidth: 391 })).toEqual({ start: false, end: false });
  });
  it("shows only the right arrow at the start of a long row", () => {
    expect(scrollEdges({ scrollLeft: 0, clientWidth: 390, scrollWidth: 900 })).toEqual({ start: false, end: true });
  });
  it("shows both in the middle and only the left at the end", () => {
    expect(scrollEdges({ scrollLeft: 200, clientWidth: 390, scrollWidth: 900 })).toEqual({ start: true, end: true });
    expect(scrollEdges({ scrollLeft: 510, clientWidth: 390, scrollWidth: 900 })).toEqual({ start: true, end: false });
  });
  it("tolerates sub-pixel positions at the edges", () => {
    expect(scrollEdges({ scrollLeft: 0.5, clientWidth: 390, scrollWidth: 900 }).start).toBe(false);
    expect(scrollEdges({ scrollLeft: 509.4, clientWidth: 390, scrollWidth: 900 }).end).toBe(false);
  });
  it("reads a negative scrollLeft (right-to-left) by its size", () => {
    expect(scrollEdges({ scrollLeft: -200, clientWidth: 390, scrollWidth: 900 })).toEqual({ start: true, end: true });
  });
});

describe("scrollStep", () => {
  it("is four fifths of the visible width, at least 1", () => {
    expect(scrollStep(390)).toBe(312);
    expect(scrollStep(0)).toBe(1);
  });
});
