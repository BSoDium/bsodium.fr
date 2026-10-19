import { describe, expect, it } from "vitest";
import { QualityGovernor } from "./quality";
import { CAPTION_LOAD } from "./tuning";

/** Feed a governor `ms` of frames at a display period `p`, a fraction `late` of them one period late (deterministically spread); returns the new levels. */
function run(g: QualityGovernor, from: number, ms: number, p: number, late = 0, js = 0.2, skip = 1): { t: number; levels: number[] } {
  const levels: number[] = [];
  let t = from;
  let i = 0;
  while (t < from + ms) {
    const isLate = late > 0 && Math.floor((i + 1) * late) > Math.floor(i * late);
    const delta = p * skip * (isLate ? 2 : 1);
    t += delta;
    i++;
    const l = g.sample(t, delta, js);
    if (l !== null) levels.push(l);
  }
  return { t, levels };
}

describe("the caption's quality governor (smoothness first: the frame rate is the last thing it gives up)", () => {
  it("starts on the best rung and stays there at 60, 90, 120 and 144 Hz when the loop keeps the display's period", () => {
    for (const p of [1000 / 60, 1000 / 90, 1000 / 120, 1000 / 144]) {
      const g = new QualityGovernor();
      expect(run(g, 0, 30000, p).levels).toEqual([]);
      expect(g.level).toBe(0);
    }
  });

  it("derives the display's period from the first frames (the median), not from an assumed 16.7 ms", () => {
    for (const p of [1000 / 60, 1000 / 120, 1000 / 144]) {
      const g = new QualityGovernor();
      expect(g.period).toBeNull();
      run(g, 0, 1000, p);
      expect(g.period).toBeCloseTo(p, 6);
    }
    // a few odd deltas among the first ones do not move the median
    const g = new QualityGovernor();
    for (let i = 0; i < CAPTION_LOAD.periodSamples; i++) g.sample(i * 8, i === 3 || i === 11 ? 33 : 8.33, 0.1);
    expect(g.period).toBeCloseTo(8.33, 2);
  });

  it("never steps from jitter alone: a few late frames (a tenth) keep the rung, at any display rate", () => {
    for (const p of [1000 / 60, 1000 / 120]) {
      const g = new QualityGovernor();
      expect(run(g, 0, 40000, p, 0.1).levels).toEqual([]);
    }
  });

  it("steps down only on a real overload (more than a fifth of the frames late), one rung at a time with a pause", () => {
    const g = new QualityGovernor();
    run(g, 0, 1000, 1000 / 60);
    const r = run(g, 1000, 30000, 1000 / 60, 0.6);
    expect(r.levels.slice(0, 4)).toEqual([1, 2, 3, 4]);
    expect(g.level).toBe(CAPTION_LOAD.ladder.length - 1);
  });

  it("orders the ladder slices, then pixel ratio, then every second frame", () => {
    const L = CAPTION_LOAD.ladder;
    expect(L[0]).toEqual({ skip: 1, dpr: 1.5, slices: 28 });
    const firstDpr = L.findIndex((r) => r.dpr < L[0]!.dpr);
    const firstSkip = L.findIndex((r) => r.skip > 1);
    const lastSlices = L.findIndex((r) => r.slices === Math.min(...L.map((x) => x.slices)));
    expect(L[1]!.slices).toBeLessThan(L[0]!.slices); // the first rung down is the slices
    expect(L[1]!.dpr).toBe(L[0]!.dpr);
    expect(L[1]!.skip).toBe(1);
    expect(lastSlices).toBeLessThan(firstDpr); // slices are used up before the pixel ratio
    expect(firstDpr).toBeLessThan(firstSkip); // and the pixel ratio before skipping frames
    expect(firstSkip).toBe(L.length - 1); // skipping is the very last rung
    expect(L[firstSkip]!.skip).toBe(2); // every second display frame: exactly 30 a second at 60 Hz
    for (let i = 1; i < L.length; i++) {
      expect(L[i]!.dpr).toBeLessThanOrEqual(L[i - 1]!.dpr);
      expect(L[i]!.slices).toBeLessThanOrEqual(L[i - 1]!.slices);
      expect(L[i]!.skip).toBeGreaterThanOrEqual(L[i - 1]!.skip);
    }
  });

  it("expects a frame every second display frame at the last rung (30 a second is not a late frame there)", () => {
    const g = new QualityGovernor();
    run(g, 0, 1000, 1000 / 60);
    g.level = CAPTION_LOAD.ladder.length - 1;
    g.reset(1000);
    const r = run(g, 1000, 3500, 1000 / 60, 0, 0.2, 2);
    expect(r.levels).toEqual([]); // (not late: no step down, and not calm for long enough to step up yet)
    expect(g.lateShare).toBe(0);
    expect(g.level).toBe(CAPTION_LOAD.ladder.length - 1);
  });

  it("steps back up after 4 s of calm, one rung, and not before", () => {
    const g = new QualityGovernor();
    run(g, 0, 1000, 1000 / 60);
    let t = run(g, 1000, 6000, 1000 / 60, 0.7).t;
    const down = g.level;
    expect(down).toBeGreaterThan(0);
    const early = run(g, t, 2500, 1000 / 60);
    expect(early.levels).toEqual([]);
    t = early.t;
    const calm = run(g, t, 40000, 1000 / 60);
    expect(calm.levels[0]).toBe(down - 1);
    expect(g.level).toBe(0);
    // and the first rise comes a few seconds in, not at once
    expect(CAPTION_LOAD.upAfterMs).toBe(4000);
  });

  it("does not read a stall (a throttled background tab, a blurred window) as overload: those frames are not samples and restart the window", () => {
    const g = new QualityGovernor();
    run(g, 0, 1000, 1000 / 60);
    let t = 1000;
    for (let i = 0; i < 200; i++) {
      t += 1000; // rAF throttled to a frame a second
      expect(g.sample(t, 1000, 0.2)).toBeNull();
    }
    expect(g.level).toBe(0);
    // and a stall in the middle of a calm run does not tip it
    const r = run(g, t, 10000, 1000 / 60);
    expect(r.levels).toEqual([]);
  });

  it("counts a draw that takes most of the period as load even when the frames are on time", () => {
    const g = new QualityGovernor();
    run(g, 0, 1000, 1000 / 60);
    let stepped = false;
    let t = 1000;
    for (let i = 0; i < 400; i++) {
      t += 1000 / 60;
      if (g.sample(t, 1000 / 60, 14) !== null) stepped = true; // 14 ms of JS in a 16.7 ms period
    }
    expect(stepped).toBe(true);
  });
});
