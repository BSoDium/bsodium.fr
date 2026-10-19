import { describe, expect, it } from "vitest";
import { QualityGovernor } from "./quality";
import { CAPTION_LOAD } from "./tuning";

/** Feed a governor frames at `ratio` of the period for `ms`, returning the levels it went through. */
function run(g: QualityGovernor, from: number, ms: number, ratio: number, period = 50, js = 0.2): { t: number; levels: number[] } {
  const levels: number[] = [];
  let t = from;
  while (t < from + ms) {
    t += period * ratio;
    const l = g.sample(t, period * ratio, period, js);
    if (l !== null) levels.push(l);
  }
  return { t, levels };
}

describe("the caption's quality governor", () => {
  it("starts on the best rung and stays there while the loop keeps its period", () => {
    const g = new QualityGovernor();
    expect(g.level).toBe(0);
    expect(run(g, 0, 30000, 1.0).levels).toEqual([]);
    expect(g.rung).toEqual(CAPTION_LOAD.ladder[0]);
  });

  it("steps down when the loop cannot keep up, one rung at a time with a pause between, to the last rung and no further", () => {
    const g = new QualityGovernor();
    const r = run(g, 0, 40000, 2.2);
    expect(r.levels.slice(0, 4)).toEqual([1, 2, 3, 4]);
    expect(g.level).toBe(CAPTION_LOAD.ladder.length - 1);
  });

  it("orders the ladder frame rate, then pixel ratio, then slices", () => {
    const L = CAPTION_LOAD.ladder;
    for (let i = 1; i < L.length; i++) {
      expect(L[i]!.frameMs).toBeGreaterThanOrEqual(L[i - 1]!.frameMs);
      expect(L[i]!.dpr).toBeLessThanOrEqual(L[i - 1]!.dpr);
      expect(L[i]!.slices).toBeLessThanOrEqual(L[i - 1]!.slices);
    }
    // the frame rate goes first: the first change touches the period only, the pixel ratio comes before the slices
    expect(L[1]!.frameMs).toBeGreaterThan(L[0]!.frameMs);
    expect(L[1]!.dpr).toBe(L[0]!.dpr);
    expect(L[1]!.slices).toBe(L[0]!.slices);
    const firstDpr = L.findIndex((r) => r.dpr < L[0]!.dpr);
    const firstSlices = L.findIndex((r) => r.slices < L[0]!.slices);
    expect(firstDpr).toBeGreaterThan(0);
    expect(firstSlices).toBeGreaterThan(firstDpr - 1);
    expect(L[0]!.slices).toBe(28);
  });

  it("steps back up slowly, one rung after several seconds of headroom, and not at once", () => {
    const g = new QualityGovernor();
    let t = run(g, 0, 8000, 2.5).t;
    const down = g.level;
    expect(down).toBeGreaterThan(0);
    // a second of calm is not enough
    const early = run(g, t, 2000, 1.0);
    expect(early.levels).toEqual([]);
    t = early.t;
    const calm = run(g, t, 30000, 1.0);
    expect(calm.levels[0]).toBe(down - 1);
    expect(g.level).toBe(0);
  });

  it("does not flap: a loop that is sometimes late (an eighth of the frames) stays where it is", () => {
    const g = new QualityGovernor();
    let t = 0;
    let changes = 0;
    for (let i = 0; i < 600; i++) {
      const late = i % 8 === 0;
      const interval = late ? 120 : 50;
      t += interval;
      if (g.sample(t, interval, 50, 0.3) !== null) changes++;
    }
    expect(changes).toBe(0);
  });

  it("counts a slow draw as load even when the timer was on time", () => {
    const g = new QualityGovernor();
    let t = 0;
    let stepped = false;
    for (let i = 0; i < 200; i++) {
      t += 50;
      if (g.sample(t, 50, 50, 30) !== null) stepped = true; // 30 ms of JS in a 50 ms period
    }
    expect(stepped).toBe(true);
  });
});
