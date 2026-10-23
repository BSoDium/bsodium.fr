import { afterEach, describe, expect, it, vi } from "vitest";
import { SWELL, startSwell, swellTimes, type SwellContext, type SwellParam } from "./cinematic-sound";
import { CINEMATIC } from "./cinematic";

/** A context that records what is scheduled on it. */
function fakeContext() {
  const log = { gains: [] as { gain: Rec }[], oscillators: [] as { type: string; hz: number; start: number; stop: number }[], closed: false, resumed: false, filter: null as Rec | null };
  type Rec = SwellParam & { events: [string, number, number][] };
  const param = (initial = 0): Rec => {
    const p: Rec = {
      value: initial,
      events: [],
      setValueAtTime(v, t) { p.events.push(["set", v, t]); return p; },
      linearRampToValueAtTime(v, t) { p.events.push(["ramp", v, t]); return p; },
      cancelScheduledValues(t) { p.events.push(["cancel", 0, t]); return p; },
    };
    return p;
  };
  const ctx: SwellContext = {
    currentTime: 10,
    state: "running",
    destination: { dest: true },
    resume: async () => { log.resumed = true; },
    close: async () => { log.closed = true; },
    createGain: () => { const g = { gain: param(), connect: () => g, disconnect: () => {} }; log.gains.push(g); return g; },
    createBiquadFilter: () => { const f = { type: "", frequency: param(), Q: { value: 0 }, connect: () => f }; log.filter = f.frequency; return f; },
    createOscillator: () => {
      const rec = { type: "", hz: 0, start: -1, stop: -1 };
      log.oscillators.push(rec);
      const o = { type: "", frequency: { set value(v: number) { rec.hz = v; } } as { value: number }, detune: { value: 0 }, connect: () => o, start: (t: number) => { rec.start = t; }, stop: (t: number) => { rec.stop = t; } };
      return new Proxy(o, { set(target, key, value) { if (key === "type") rec.type = value as string; (target as Record<string | symbol, unknown>)[key] = value; return true; } });
    },
  };
  return { ctx, log };
}

afterEach(() => vi.useRealTimers());

describe("the interlude's swell", () => {
  it("begins when the word comes in, rises, holds and lets go, within the interlude's own length", () => {
    const shape = CINEMATIC.shape;
    const t = swellTimes(shape.leaveMs + shape.gapMs);
    expect(t.begin).toBeCloseTo((shape.leaveMs + shape.gapMs) / 1000, 9);
    expect(t.peak - t.begin).toBeCloseTo(SWELL.attackMs / 1000, 9);
    expect(t.end).toBeGreaterThan(t.release);
    // over before the interlude is (its length: the rows leave, the stage is empty, the word comes in, holds and goes)
    const interlude = (shape.leaveMs + shape.gapMs + shape.enterMs + shape.holdMs + shape.exitMs) / 1000;
    expect(t.end).toBeLessThanOrEqual(interlude);
  });

  it("is faint: the master gain never goes above `peak`, and that is a small number", () => {
    expect(SWELL.peak).toBeLessThanOrEqual(0.06);
    const { ctx, log } = fakeContext();
    expect(startSwell(900, ctx, true)).not.toBeNull();
    const master = log.gains[0]!.gain;
    expect(Math.max(...master.events.filter((e) => e[0] !== "cancel").map((e) => e[1]))).toBeCloseTo(SWELL.peak, 9);
    // the oscillators' own levels sum to at most 1 (so the master is the loudness)
    const levels = log.gains.slice(1).map((g) => g.gain.value);
    expect(levels.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("schedules a pad of two detuned oscillators a note, all started with it and stopped after it", () => {
    const { ctx, log } = fakeContext();
    startSwell(900, ctx, true);
    const t = swellTimes(900);
    expect(log.oscillators).toHaveLength(SWELL.notes.length * 2);
    for (const o of log.oscillators) {
      expect(o.start).toBeCloseTo(10 + t.begin, 9);
      expect(o.stop).toBeGreaterThan(10 + t.end);
    }
    expect(log.resumed).toBe(true);
  });

  it("makes no sound where none may be made: nothing is created", () => {
    const { ctx, log } = fakeContext();
    expect(startSwell(900, ctx, false)).toBeNull();
    expect(log.oscillators).toHaveLength(0);
    expect(log.gains).toHaveLength(0);
  });

  it("lets go when cut short: a quick fade to nothing, the oscillators stopped, the context closed, and twice is safe", () => {
    vi.useFakeTimers();
    const { ctx, log } = fakeContext();
    const handle = startSwell(900, ctx, true)!;
    handle.fade(400);
    const master = log.gains[0]!.gain;
    const last = master.events.at(-1)!;
    expect(last[0]).toBe("ramp");
    expect(last[1]).toBe(0);
    expect(last[2]).toBeCloseTo(10.4, 9);
    expect(master.events.some((e) => e[0] === "cancel")).toBe(true);
    for (const o of log.oscillators) expect(o.stop).toBeLessThan(11);
    vi.advanceTimersByTime(1000);
    expect(log.closed).toBe(true);
    expect(() => handle.fade()).not.toThrow();
  });

  it("closes the context after the swell has ended on its own", () => {
    vi.useFakeTimers();
    const { ctx, log } = fakeContext();
    startSwell(900, ctx, true);
    vi.advanceTimersByTime((swellTimes(900).end + 1) * 1000);
    expect(log.closed).toBe(true);
  });
});
