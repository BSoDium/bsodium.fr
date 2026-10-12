import { describe, expect, it } from "vitest";
import * as tuning from "./tuning";
import { ART_PIXEL, TUNING } from "./tuning";

describe("art pixel size: a function of the viewport and the device pixel ratio, nothing else", () => {
  it("depends on (smaller side, device pixel ratio) only: repeated calls and call order change nothing, there is no runtime state to move it", () => {
    const table = () => [320, 519, 520, 900, 1440].flatMap((s) => [1, 1.25, 1.5, 2, 2.625, 3].map((d) => TUNING.pixelSize(s, d)));
    const first = table();
    TUNING.pixelSize(100, 7);
    TUNING.pixelSize(5000, 1);
    expect(table()).toEqual(first);
    expect([...table()].reverse()).toEqual([...first].reverse());
    expect(TUNING.pixelSize(1440, 2)).toBe(2.5);
    expect(TUNING.pixelSize(400, 2)).toBe(2);
  });
  it("it is always a whole number of device pixels, and never coarser than the art pixel asks for", () => {
    for (const dpr of [1, 1.25, 1.5, 2, 2.625, 3]) {
      for (const side of [400, 1200]) {
        const size = TUNING.pixelSize(side, dpr);
        expect(Number.isInteger(Math.round(size * dpr * 1e6) / 1e6), `${side} @${dpr}`).toBe(true);
        const base = side < ART_PIXEL.phoneBelow ? ART_PIXEL.phone : ART_PIXEL.desktop;
        expect(size).toBeLessThanOrEqual(base + 0.5 / dpr + 1e-9);
      }
    }
  });
  it("the module exports no mutable quality knob (the frame governor that moved the size at runtime is gone)", () => {
    expect(Object.keys(tuning)).not.toContain("QUALITY");
  });
});
