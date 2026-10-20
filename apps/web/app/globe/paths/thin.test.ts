import { describe, expect, it } from "vitest";
import { OFF_ZOOM, thinLegs, thinZoomOf, type ThinLeg } from "./thin";

const leg = (key: string, a: [number, number], b: [number, number], lit = false): ThinLeg => ({ key, parts: [[a, b]], lit });

describe("thinLegs", () => {
  it("keeps one of two legs along the same corridor (the longer first), and both when they go different ways", () => {
    const long = leg("long", [10, 45], [16, 48]);
    const same = leg("same", [10.2, 45.1], [15.8, 47.9]); // along the same line
    const away = leg("away", [10, 45], [14, 41]);
    const kept = thinLegs([same, long, away], 5, 2.5)!;
    expect(kept.has("long")).toBe(true);
    expect(kept.has("same")).toBe(false);
    expect(kept.has("away")).toBe(true);
  });
  it("drops a leg too short to read at this zoom, and brings it back when zoomed in", () => {
    const short = leg("short", [10, 45], [10.2, 45.05]);
    expect(thinLegs([short], 5, 2.5)!.has("short")).toBe(false);
    expect(thinLegs([short], 9, 2.5)!.has("short")).toBe(true);
  });
  it("never drops a lit leg, and keeps it first so it is the one a duplicate loses to", () => {
    const long = leg("long", [10, 45], [16, 48]);
    const litShort = leg("lit", [10, 45], [10.1, 45.02], true);
    const kept = thinLegs([long, litShort], 4, 2.5)!;
    expect(kept.has("lit")).toBe(true);
    const litSame = leg("litSame", [10.2, 45.1], [15.8, 47.9], true);
    const k2 = thinLegs([long, litSame], 4, 2.5)!;
    expect(k2.has("litSame")).toBe(true);
    expect(k2.has("long")).toBe(false);
  });
  it("does nothing from a city's scale on", () => {
    expect(thinLegs([leg("a", [1, 1], [1.01, 1.01])], OFF_ZOOM, 2.5)).toBeNull();
  });
  it("quantises the zoom to quarters", () => {
    expect(thinZoomOf(5.1)).toBe(5);
    expect(thinZoomOf(5.2)).toBe(5.25);
  });
});
