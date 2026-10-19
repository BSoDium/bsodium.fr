import { describe, expect, it } from "vitest";
import { isMacTick, MAC_TICK, MAX_PINCH_STEP, PENDING_MS, PINCH_ZOOM_RATE, STREAM_GAP_MS, swipePan, WheelClassifier, zoomStep, type WheelKind, type WheelSample } from "./wheel";

/**
 * Fixtures: the shape of what each device sends (see the table in wheel.ts). They are SYNTHETIC: written from the documented behaviour of each browser and
 * device, not recorded from the hardware.
 */
type Stream = { name: string; expect: WheelKind; events: WheelSample[] };

const at = (t: number, dx: number, dy: number, extra: Partial<WheelSample> = {}): WheelSample => ({ t, dx, dy, mode: 0, ctrl: false, ...extra });

/** A momentum swipe: ramps up, peaks, decays; `wy` is Chrome/Safari's -3 deltaY. */
function swipe(t0: number, peak: number, dxShare = 0, whole = false): WheelSample[] {
  const out: WheelSample[] = [];
  const shape = [0.1, 0.3, 0.6, 1, 0.9, 0.7, 0.5, 0.35, 0.25, 0.17, 0.11, 0.07, 0.04];
  shape.forEach((k, i) => {
    let dy = peak * k;
    let dx = peak * k * dxShare;
    if (whole) {
      dy = Math.round(dy);
      dx = Math.round(dx);
    } else {
      dy += 0.137 * (i % 3);
      dx = dx ? dx + 0.071 : 0;
    }
    out.push(at(t0 + i * 16.7, dx, dy, { wheelDy: Math.round(-3 * dy) }));
  });
  return out;
}

const STREAMS: Stream[] = [
  {
    name: "mouse wheel, Chrome on Windows: notches of 100 with wheelDeltaY 120",
    expect: "wheel",
    events: [at(0, 0, 100, { wheelDy: -120 }), at(90, 0, 100, { wheelDy: -120 }), at(200, 0, -100, { wheelDy: 120 })],
  },
  {
    name: "mouse wheel, Chrome on Windows at 150 % scaling: 66.67 a notch",
    expect: "wheel",
    events: [at(0, 0, 66.66666666666667, { wheelDy: -120 }), at(60, 0, 66.66666666666667, { wheelDy: -120 })],
  },
  {
    name: "mouse wheel, Chrome on Linux: 53 a notch",
    expect: "wheel",
    events: [at(0, 0, 53, { wheelDy: -120 }), at(40, 0, 53, { wheelDy: -120 })],
  },
  {
    name: "mouse wheel, Firefox on Windows: 3 lines",
    expect: "wheel",
    events: [at(0, 0, 3, { mode: 1, wheelDy: -120 }), at(80, 0, 3, { mode: 1, wheelDy: -120 })],
  },
  {
    name: "mouse wheel, Firefox with page scrolling: pages",
    expect: "wheel",
    events: [at(0, 0, 1, { mode: 2 })],
  },
  {
    name: "mouse wheel, Chrome on macOS: multiples of 4.000244140625",
    expect: "wheel",
    events: [at(0, 0, MAC_TICK, { wheelDy: -12 }), at(55, 0, 2 * MAC_TICK, { wheelDy: -24 }), at(120, 0, 3 * MAC_TICK, { wheelDy: -36 })],
  },
  {
    name: "mouse wheel, Safari on macOS: a lone whole-number notch (nothing to tell it from, but that it is alone)",
    expect: "wheel",
    events: [at(0, 0, 12, { wheelDy: -36 })],
  },
  {
    name: "mouse wheel, Safari on macOS: two slow notches 250 ms apart",
    expect: "wheel",
    events: [at(0, 0, 8, { wheelDy: -24 }), at(250, 0, 8, { wheelDy: -24 })],
  },
  {
    name: "trackpad swipe up, Chrome on macOS: fractions that ramp up and decay (momentum)",
    expect: "swipe",
    events: swipe(0, 60),
  },
  {
    name: "trackpad swipe sideways and diagonally, Safari on macOS",
    expect: "swipe",
    events: swipe(0, 40, 0.8),
  },
  {
    name: "trackpad swipe, Firefox on macOS: whole numbers, small first step",
    expect: "swipe",
    events: swipe(0, 50, 0.3, true).filter((e) => e.dy !== 0),
  },
  {
    name: "trackpad: a very small first step (3) then more",
    expect: "swipe",
    events: [at(0, 0, 3, { wheelDy: -9 }), at(16, 0, 5, { wheelDy: -15 }), at(33, 0, 11, { wheelDy: -33 }), at(50, 0, 24, { wheelDy: -72 })],
  },
  {
    name: "trackpad: a whole-number stream whose first step is 8, 16 ms apart (second event settles it)",
    expect: "swipe",
    events: [at(0, 0, 8, { wheelDy: -24 }), at(16, 0, 9, { wheelDy: -27 }), at(33, 0, 14, { wheelDy: -42 }), at(50, 0, 20, { wheelDy: -60 })],
  },
  {
    name: "Magic Mouse surface scroll: as a trackpad",
    expect: "swipe",
    events: swipe(0, 30, 0.2),
  },
  {
    name: "precision touchpad, Chrome on Windows: whole numbers, deltaX noise, no momentum",
    expect: "swipe",
    events: [at(0, 1, 7, { wheelDy: -8 }), at(16, 0, 12, { wheelDy: -14 }), at(33, 2, 19, { wheelDy: -23 }), at(50, 0, 25, { wheelDy: -30 }), at(66, 1, 9, { wheelDy: -11 })],
  },
];

function run(events: WheelSample[]) {
  const c = new WheelClassifier();
  const kinds: (WheelKind | "pending")[] = [];
  let timeout: WheelKind | null = null;
  for (const e of events) {
    const v = c.classify(e);
    kinds.push(v.kind);
  }
  if (kinds.includes("pending") && kinds.at(-1) === "pending") timeout = c.timeout().kind as WheelKind;
  return { kinds, timeout };
}

/** The kind the stream ends up with: the verdict of its last event (`pending` resolved by the timeout), and of the pending first one (the second event settles it). */
function settled(events: WheelSample[]): WheelKind {
  const { kinds, timeout } = run(events);
  const last = kinds.at(-1)!;
  return last === "pending" ? timeout! : last;
}

describe("WheelClassifier: one stream per device", () => {
  for (const s of STREAMS) {
    it(`${s.name} -> ${s.expect}`, () => {
      expect(settled(s.events)).toBe(s.expect);
    });
  }

  it("a swipe stream never contains a wheel or pinch verdict, event by event", () => {
    for (const s of STREAMS.filter((x) => x.expect === "swipe")) {
      const { kinds } = run(s.events);
      for (const k of kinds) expect(k === "swipe" || k === "pending").toBe(true);
    }
  });

  it("a wheel stream never contains a swipe verdict, event by event", () => {
    for (const s of STREAMS.filter((x) => x.expect === "wheel")) {
      const { kinds } = run(s.events);
      for (const k of kinds) expect(k === "wheel" || k === "pending").toBe(true);
    }
  });
});

describe("WheelClassifier: pinch", () => {
  it("ctrlKey with small fractional deltas is a pinch, event by event", () => {
    const c = new WheelClassifier();
    for (const [i, dy] of [-0.5, -1.25, -3.1, -6.8, 4.2, 1.1].entries()) {
      expect(c.classify(at(i * 16, 0, dy, { ctrl: true, wheelDy: -3 * dy })).kind).toBe("pinch");
    }
  });

  it("ctrlKey on a whole-number delta that is not a notch is still a pinch", () => {
    const c = new WheelClassifier();
    expect(c.classify(at(0, 0, 2, { ctrl: true, wheelDy: -6 })).kind).toBe("pinch");
    expect(c.classify(at(16, 0, 7, { ctrl: true })).kind).toBe("pinch");
  });

  it("ctrl with a notch-looking delta (120 legacy units, 4.0002) is still a pinch: it must not take the 20x slower wheel gain", () => {
    const c = new WheelClassifier();
    expect(c.classify(at(0, 0, -100, { ctrl: true, wheelDy: 120, mode: 1 })).kind).toBe("wheel");
    expect(c.classify(at(500, 0, 40, { ctrl: true, wheelDy: -120 })).kind).toBe("pinch");
    expect(c.classify(at(600, 0, -MAC_TICK, { ctrl: true })).kind).toBe("pinch");
  });

  it("a pinch does not start a stream: a swipe right after it is classified afresh", () => {
    const c = new WheelClassifier();
    c.classify(at(0, 0, -2.5, { ctrl: true }));
    expect(c.classify(at(10, 0.4, 1.3)).kind).toBe("swipe");
  });
});

describe("WheelClassifier: streams", () => {
  it("decides once per stream and keeps it", () => {
    const c = new WheelClassifier();
    expect(c.classify(at(0, 0, 100, { wheelDy: -120 })).kind).toBe("wheel");
    // A fractional event in the same stream does not flip it.
    expect(c.classify(at(20, 0.3, 4.2)).kind).toBe("wheel");
  });

  it(`re-evaluates after ${STREAM_GAP_MS} ms of silence`, () => {
    const c = new WheelClassifier();
    expect(c.classify(at(0, 0, 100, { wheelDy: -120 })).kind).toBe("wheel");
    expect(c.classify(at(STREAM_GAP_MS + 1, 0.5, 5.5)).kind).toBe("swipe");
    expect(c.classify(at(STREAM_GAP_MS + 1 + 16, 0, 100, { wheelDy: -120 })).kind).toBe("swipe");
    expect(c.classify(at(2 * STREAM_GAP_MS + 100, 0, 100, { wheelDy: -120 })).kind).toBe("wheel");
  });

  it("holds an ambiguous lone event back, and a timeout turns it into a wheel", () => {
    const c = new WheelClassifier();
    expect(c.classify(at(0, 0, 10, { wheelDy: -30 })).kind).toBe("pending");
    expect(PENDING_MS).toBeLessThan(STREAM_GAP_MS);
    expect(c.timeout().kind).toBe("wheel");
    // The stream stays a wheel.
    expect(c.classify(at(80, 0, 10, { wheelDy: -30 })).kind).toBe("wheel");
  });

  it("an ambiguous event followed by a quick small one is a swipe, by a slow large one a wheel", () => {
    const a = new WheelClassifier();
    expect(a.classify(at(0, 0, 6)).kind).toBe("pending");
    expect(a.classify(at(16, 0, 9)).kind).toBe("swipe");
    const b = new WheelClassifier();
    expect(b.classify(at(0, 0, 40)).kind).toBe("pending");
    expect(b.classify(at(30, 0, 40)).kind).toBe("wheel");
  });

  it("reset forgets the stream", () => {
    const c = new WheelClassifier();
    c.classify(at(0, 0, 100, { wheelDy: -120 }));
    c.reset();
    expect(c.classify(at(10, 0.2, 1.5)).kind).toBe("swipe");
  });
});

describe("macOS tick", () => {
  it("is a nonzero multiple of 4.000244140625", () => {
    expect(isMacTick(MAC_TICK)).toBe(true);
    expect(isMacTick(-3 * MAC_TICK)).toBe(true);
    expect(isMacTick(0)).toBe(false);
    expect(isMacTick(4)).toBe(false);
    expect(isMacTick(6)).toBe(false);
    expect(isMacTick(100)).toBe(false);
  });
});

describe("zoomStep and swipePan", () => {
  it("a 100 px notch is the tuned 0.16 levels, in is negative deltaY", () => {
    expect(zoomStep(at(0, 0, -100, { wheelDy: 120 }), "wheel")).toBeCloseTo(0.16, 9);
    expect(zoomStep(at(0, 0, 100, { wheelDy: -120 }), "wheel")).toBeCloseTo(-0.16, 9);
  });

  it("a macOS tick counts as a whole notch, a line as 33 px", () => {
    expect(zoomStep(at(0, 0, -MAC_TICK, { wheelDy: 12 }), "wheel")).toBeCloseTo(0.16, 3);
    expect(zoomStep(at(0, 0, -3, { mode: 1 }), "wheel")).toBeCloseTo(3 * 33 * 0.0016, 9);
  });

  it("a pinch keeps its tuned speed and sign", () => {
    expect(zoomStep(at(0, 0, -5, { ctrl: true }), "pinch")).toBeCloseTo(5 * PINCH_ZOOM_RATE, 9);
    expect(zoomStep(at(0, 0, 5, { ctrl: true }), "pinch")).toBeCloseTo(-5 * PINCH_ZOOM_RATE, 9);
  });

  it("a step is capped", () => {
    expect(zoomStep(at(0, 0, -5000, { wheelDy: 120 }), "wheel")).toBeLessThanOrEqual(0.75);
    expect(zoomStep(at(0, 0, 900, { ctrl: true }), "pinch")).toBeGreaterThanOrEqual(-MAX_PINCH_STEP);
  });

  it("a swipe moves the content with the fingers (scroll down: content up)", () => {
    expect(swipePan(at(0, 4, 10))).toEqual({ dx: -4, dy: -10 });
    expect(swipePan(at(0, 0, 0))).toEqual({ dx: 0, dy: 0 });
  });
});

describe("pinch calibration", () => {
  /** What Chromium sends for a physical pinch: `deltaY = -100 ln(scale)` per event (codereview.chromium.org/250923004), the fingers going 3 cm to 6 cm in 30 events. */
  const chromePinch = (from: number, to: number, n = 30) => {
    const dist = (i: number) => from + ((to - from) * i) / n;
    return Array.from({ length: n }, (_, i) => at(i * 16.7, 0, -100 * Math.log(dist(i + 1) / dist(i)), { ctrl: true }));
  };
  const PHYSICAL = 1 / (100 * Math.LN2);

  it("a physical pinch (3 cm to 6 cm) is one level at the physical rate, and the classifier never loses an event", () => {
    const c = new WheelClassifier();
    const events = chromePinch(3, 6);
    let total = 0;
    for (const e of events) {
      const v = c.classify(e);
      expect(v.kind).toBe("pinch");
      total += zoomStep(e, v.kind as "pinch", PHYSICAL);
    }
    expect(total).toBeCloseTo(1, 1);
  });

  it("at the shipped rate the same pinch is PINCH_ZOOM_RATE / 0.0144 levels (a multiple of the physical gain, tuned by the owner's A/B)", () => {
    const total = chromePinch(3, 6).reduce((a, e) => a + zoomStep(e, "pinch"), 0);
    expect(total).toBeCloseTo(PINCH_ZOOM_RATE / PHYSICAL, 1);
  });

  it("a stream of 60 events of deltaY -3 to -12 with ctrlKey is all pinch and none is clamped", () => {
    const c = new WheelClassifier();
    let total = 0;
    for (let i = 0; i < 60; i++) {
      const e = at(i * 16.7, 0, -(3 + ((i * 7) % 10) + 0.3), { ctrl: true, wheelDy: -3 * (3 + 0.3) });
      expect(c.classify(e).kind).toBe("pinch");
      const d = zoomStep(e, "pinch");
      expect(d).toBeCloseTo(Math.min(-e.dy * PINCH_ZOOM_RATE, MAX_PINCH_STEP), 9);
      total += d;
    }
    expect(total).toBeGreaterThan(4);
  });
});

describe("effective pinch zoom", () => {
  it("events of one frame add up: three events in a frame zoom as three events in three frames", () => {
    const evs = [-4.2, -3.7, -5.1].map((dy) => at(0, 0, dy, { ctrl: true }));
    expect(evs.reduce((a, e) => a + zoomStep(e, "pinch"), 0)).toBeCloseTo(13 * PINCH_ZOOM_RATE, 6);
  });
  it("a physical 3 -> 8 cm pinch gains about a level or two at the shipped rate (the owner's A/B: 0.01 is the sweet spot, 0.4 far too fast)", () => {
    const perPinch = 100 * Math.log(8 / 3) * PINCH_ZOOM_RATE;
    expect(perPinch).toBeGreaterThan(0.5);
    expect(perPinch).toBeLessThan(2);
  });
});
