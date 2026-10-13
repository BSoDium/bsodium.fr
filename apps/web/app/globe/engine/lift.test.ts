import { describe, expect, it } from "vitest";
import { liftFor } from "./lift";
import { LIFT } from "./tuning";

describe("the lift: the planet's centre goes up so it clears what covers the bottom, as far as there is room", () => {
  // 1440 x 900, the planet 300 px in radius at the lowest zoom, the name covering the bottom 182 px.
  const base = { height: 900, planetPx: 300, reachTopPx: 330, cover: 182 };

  it("is what makes the planet's lowest point clear the cover by `gapPx`", () => {
    const lift = liftFor(base);
    expect(lift).toBeCloseTo(450 + 300 + LIFT.gapPx - (900 - 182), 9);
    expect(450 - lift + 300 + LIFT.gapPx).toBeCloseTo(900 - 182, 9);
  });

  it("is 0 when nothing covers the planet: no cover, or a cover the planet already clears", () => {
    expect(liftFor({ ...base, cover: 0 })).toBe(0);
    expect(liftFor({ ...base, cover: 60 })).toBe(0);
    expect(liftFor({ ...base, planetPx: 0 })).toBe(0);
    expect(liftFor({ ...base, height: 0 })).toBe(0);
  });

  it("never pushes the highest thing (the planet, or the ring) out of the window: `marginPx` is kept above it", () => {
    const tall = liftFor({ ...base, cover: 600 });
    expect(450 - tall - 330).toBeGreaterThanOrEqual(LIFT.marginPx - 1e-9);
    expect(tall).toBeCloseTo(450 - 330 - LIFT.marginPx, 9);
    // the ring's top counts when it is higher than the planet
    expect(liftFor({ ...base, cover: 600, reachTopPx: 380 })).toBeLessThan(tall);
    // a reach under the planet's own is the planet's
    expect(liftFor({ ...base, cover: 600, reachTopPx: 100 })).toBeCloseTo(450 - 300 - LIFT.marginPx, 9);
  });

  it("never goes negative, and grows with the cover until the room stops it", () => {
    let last = 0;
    for (let cover = 0; cover <= 700; cover += 20) {
      const v = liftFor({ ...base, cover });
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeGreaterThanOrEqual(last - 1e-9);
      last = v;
    }
    expect(liftFor({ ...base, reachTopPx: 900 })).toBe(0); // no room above at all
  });

  it("answers a phone upright: the stacked block covers more than half the page, the planet goes as high as the room allows", () => {
    const phone = { height: 844, planetPx: 140, reachTopPx: 200, cover: 560 };
    const lift = liftFor(phone);
    expect(lift).toBeCloseTo(422 - 200 - LIFT.marginPx, 9);
    expect(422 - lift - 200).toBeGreaterThanOrEqual(LIFT.marginPx - 1e-9);
  });
});
