import { describe, expect, it } from "vitest";
import { SURFACE, surfaceShare } from "./surface";
import { TUNING } from "./tuning";

describe("the land's picture", () => {
  it("is whole at the resting view and below it, at its rest strength, and the interlude brings it to one", () => {
    expect(surfaceShare(0, 0)).toBeCloseTo(SURFACE.rest);
    expect(surfaceShare(-1, 0)).toBeCloseTo(SURFACE.rest);
    expect(surfaceShare(-1, 1)).toBeCloseTo(1);
  });
  it("fades out smoothly with the zoom and is gone before the borders come on", () => {
    let last = surfaceShare(SURFACE.from, 0);
    for (let z = SURFACE.from; z <= SURFACE.to; z += 0.1) {
      const s = surfaceShare(z, 0);
      expect(s).toBeLessThanOrEqual(last + 1e-9);
      last = s;
    }
    expect(surfaceShare(SURFACE.to, 1)).toBe(0);
    expect(SURFACE.to).toBeLessThan(TUNING.borderZoom.on);
  });
});
