import { describe, expect, it } from "vitest";
import { PX_UNITS, planLabels, pxUnits, smoothUnits, type PlanItem, type Prev } from "./label-plan";
import { LabelTracker, MOTION, SlotMemory, TRACK, glideRemainder, motionLimitPx, slotPosition, type Placed, type TrackItem } from "./label-track";
import { SPOT } from "./pixel-labels";

const VIEW = { cols: 800, rows: 600 };
const INSET = pxUnits(2.5).inset;
/** The art cell, and the units the labels are drawn with (engine/label-plan.ts `smoothUnits`: no lattice, exact positions around the projected box). */
const CELL = 2.5;
const SMOOTH = smoothUnits(CELL);
const onLattice = (v: number, cell = CELL) => Math.abs(v / cell - Math.round(v / cell)) < 1e-9;
const GAP = PX_UNITS.gap;
const BLEED = PX_UNITS.bleed;
const FULL = { w: 90, h: 16 };
const SHORT = { w: 56, h: 16 };

/** A tracked box at (x, y) of `w x h` px with a two-variant label. */
const box = (id: number, x: number, y: number, extra: Partial<TrackItem> & { w?: number; h?: number } = {}): TrackItem => {
  const { w = 50, h = 40, ...rest } = extra;
  return { id, key: `n${id}`, rect: { c0: x, r0: y, c1: x + w, r1: y + h }, score: 80, area: w * h, variants: [FULL, SHORT], vkey: id + 1, ...rest };
};
const move = (it: TrackItem, dx: number, dy: number): TrackItem => ({ ...it, rect: { c0: it.rect.c0 + dx, r0: it.rect.r0 + dy, c1: it.rect.c1 + dx, r1: it.rect.r1 + dy } });
const overlap = (a: Placed, b: Placed, pad = 0) => a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
const tracker = (mem = new SlotMemory(100)) => new LabelTracker(mem, PX_UNITS);

describe("a label has a slot and follows its box while the camera moves", () => {
  it("the first step labels every box, at its first free position (nothing is withheld)", () => {
    const t = tracker();
    const out = t.step(0, [box(1, 100, 100), box(2, 300, 100), box(3, 100, 300)], VIEW, INSET);
    expect(out.map((p) => p.cand)).toEqual([SPOT.aboveLeft, SPOT.aboveLeft, SPOT.aboveLeft]);
    expect(out.every((p) => p.fresh && p.moved && !p.overlap && p.gx === 0 && p.gy === 0)).toBe(true);
    expect(out[0]!).toMatchObject({ x: 100 - BLEED, y: 100 - FULL.h - GAP, variant: 0 }); // clear room above the box, the text lined up with its edge
    expect(t.gliding).toBe(0);
  });
  it("while the boxes move the plates stay on the same corner of their boxes, to the pixel: they never lag", () => {
    const t = tracker();
    let items = [box(1, 100, 100), box(2, 300, 100), box(3, 140, 300)];
    t.step(0, items, VIEW, INSET);
    const slots = t.step(16, items, VIEW, INSET).map((p) => [p.cand, p.variant]);
    for (let f = 2; f < 60; f++) {
      items = items.map((it) => move(it, 2.5, 1.5));
      const out = t.step(f * 16, items, VIEW, INSET);
      expect(out.map((p) => [p.cand, p.variant])).toEqual(slots);
      expect(out.every((p) => !p.moved && p.gx === 0 && p.gy === 0)).toBe(true);
      out.forEach((p, n) => expect([p.x, p.y]).toEqual([items[n]!.rect.c0 - BLEED, items[n]!.rect.r0 - p.h - GAP]));
    }
    expect(t.gliding).toBe(0);
  });
  it("two labels that start to collide while moving are separated by a plan within the bounded rate, and the plate that gives way glides apart", () => {
    const t = tracker();
    const a = box(1, 100, 100);
    let b = box(2, 300, 100);
    t.step(0, [a, b], VIEW, INSET);
    const first = t.step(16, [a, b], VIEW, INSET).map((p) => p.cand);
    let now = 16;
    let changedAt = -1;
    for (let f = 0; f < 60; f++) {
      b = move(b, -6, 0); // b's box slides into a's label
      now += 16;
      const out = t.step(now, [a, b], VIEW, INSET);
      if (changedAt < 0 && out[1]!.cand !== first[1]) changedAt = f;
    }
    expect(changedAt).toBeGreaterThan(-1);
    // ... and once settled the plan is collision-free
    t.settleNow();
    const settled = t.step(now + 16, [a, b], VIEW, INSET);
    expect(overlap(settled[0]!, settled[1]!, PX_UNITS.clearance)).toBe(false);
  });
});

describe("the plan runs continuously, at a bounded rate", () => {
  it("while the rectangles change, plans are at least replanMs apart and none is skipped for long; a camera that never stops is not frozen", () => {
    const t = tracker();
    let items = [box(1, 100, 100), box(2, 130, 100)];
    let now = 0;
    t.step(now, items, VIEW, INSET);
    const fulls: number[] = [];
    for (let f = 0; f < 600; f++) {
      now += 16;
      items = items.map((it) => move(it, 0.2, 0));
      t.step(now, items, VIEW, INSET);
      if (t.info.full) fulls.push(now);
    }
    expect(fulls.length).toBeGreaterThanOrEqual(Math.floor((600 * 16) / (TRACK.replanMs + 16)) - 1);
    expect(fulls.length).toBeLessThanOrEqual(Math.ceil((600 * 16) / TRACK.replanMs));
    for (let k = 1; k < fulls.length; k++) {
      expect(fulls[k]! - fulls[k - 1]!).toBeGreaterThanOrEqual(TRACK.replanMs);
      expect(fulls[k]! - fulls[k - 1]!).toBeLessThanOrEqual(TRACK.replanMs + 16);
    }
  });
  it("a change after the last plan is owed: due replanMs after that plan (a timer, an idle map draws no frames), then one more at rest, then nothing is owed", () => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS, { ...TRACK, dwellMs: 0 });
    let items = [box(1, 100, 100), box(2, 130, 100)];
    t.step(0, items, VIEW, INSET);
    expect(t.dueAt).toBeNull(); // the first step planned everything
    items = items.map((it) => move(it, 5, 0));
    t.step(30, items, VIEW, INSET); // 30 ms after the last plan: too soon
    expect(t.info.full).toBe(false);
    expect(t.dueAt).toBe(TRACK.replanMs);
    t.step(TRACK.replanMs - 1, items, VIEW, INSET);
    expect(t.info.full).toBe(false);
    t.step(TRACK.replanMs, items, VIEW, INSET);
    expect(t.info.full).toBe(true);
    // the camera moved 70 ms ago: this plan was made on the move, so the settling plan is owed once it has been still for restMs
    expect(t.dueAt).toBe(TRACK.replanMs * 2);
    t.step(TRACK.replanMs + 16, items, VIEW, INSET);
    expect(t.info.full).toBe(false);
    t.step(TRACK.replanMs * 2, items, VIEW, INSET);
    expect(t.info.full).toBe(true);
    expect(t.dueAt).toBeNull();
    t.step(TRACK.replanMs * 2 + 16, items, VIEW, INSET);
    expect(t.info.full).toBe(false);
  });
  it("the plan at rest takes a better position without room to spare, so labels end on their first free position", () => {
    const mem = new SlotMemory(100);
    const t = new LabelTracker(mem, PX_UNITS, { ...TRACK, dwellMs: 0 });
    // mine sits above-right of a wide box because the blocker's plate was in the way; the blocker then moves off by less than the upgrade margin
    const blocker = box(2, 100 + FULL.w + PX_UNITS.clearance - 1, 200, { score: 500 });
    const mine = box(1, 100, 200, { w: 300 });
    t.step(0, [blocker, mine], VIEW, INSET);
    expect(t.mem.cand[1]).not.toBe(SPOT.aboveLeft);
    // the blocker's label is `margin - 1` px further: free, but without the room the margin asks for
    const moved = box(2, 100 + FULL.w + PX_UNITS.clearance + PX_UNITS.upgradeMargin - 1, 200, { score: 500 });
    t.step(1000, [moved, mine], VIEW, INSET);
    t.settleNow();
    t.step(2000, [moved, mine], VIEW, INSET);
    expect(t.mem.cand[1]).toBe(SPOT.aboveLeft);
  });
  it("a plan on an unchanged camera is sticky: nothing moves when nothing is wrong", () => {
    const t = tracker();
    const items = [box(1, 100, 100), box(2, 400, 100), box(3, 100, 300)];
    const first = t.step(0, items, VIEW, INSET);
    t.settleNow();
    const out = t.step(1000, items, VIEW, INSET);
    expect(t.info.full).toBe(true);
    expect(out.map((p) => [p.cand, p.variant, p.x, p.y])).toEqual(first.map((p) => [p.cand, p.variant, p.x, p.y]));
    expect(out.some((p) => p.moved)).toBe(false);
  });
});

/* ------------------------------------------------------------------------------------------------ the glide */

describe("the glide is continuous: an ease-in-out curve in time, no steps", () => {
  it("starts at the whole offset, ends at exactly 0 after glideMs, is monotone and never crosses 0", () => {
    for (const g0 of [100, -100, 2.5, 37.3, -12.7]) {
      let prev = g0;
      expect(glideRemainder(g0, 0, 0)).toBe(g0);
      for (let ms = 0; ms < TRACK.glideMs; ms += 4) {
        const r = glideRemainder(g0, ms, 0);
        expect(Math.abs(r)).toBeLessThanOrEqual(Math.abs(prev) + 1e-9);
        expect(r * g0).toBeGreaterThanOrEqual(0);
        prev = r;
      }
      expect(glideRemainder(g0, TRACK.glideMs, 0)).toBe(0);
      expect(glideRemainder(g0, 5000, 0)).toBe(0);
    }
  });
  it("it lasts 150 to 200 ms and is smooth: sampled every millisecond no value is a step of more than the fastest speed times a millisecond, and values are not on a grid", () => {
    expect(TRACK.glideMs).toBeGreaterThanOrEqual(150);
    expect(TRACK.glideMs).toBeLessThanOrEqual(200);
    expect(TRACK.stepMs).toBe(0);
    const g0 = 100;
    let prev = glideRemainder(g0, 0, 0);
    let distinct = new Set<number>();
    let worst = 0;
    for (let ms = 1; ms < TRACK.glideMs; ms++) {
      const r = glideRemainder(g0, ms, 0);
      worst = Math.max(worst, prev - r);
      distinct.add(r);
      prev = r;
    }
    expect(distinct.size).toBe(TRACK.glideMs - 1); // every millisecond another value: not a staircase
    expect(worst).toBeLessThanOrEqual((1.5 * g0) / TRACK.glideMs + 1e-9); // smoothstep: fastest in the middle, 1.5 g0 / glideMs per ms
    // it sets off from rest and comes to rest: the first and the last millisecond are the slowest, and the speed rises then falls (one peak)
    const speed = (ms: number) => glideRemainder(g0, ms - 1, 0) - glideRemainder(g0, ms, 0);
    expect(speed(1)).toBeLessThan(0.01 * g0);
    expect(speed(TRACK.glideMs - 1)).toBeLessThan(0.01 * g0);
    let turned = 0;
    for (let ms = 2; ms < TRACK.glideMs; ms++) if (Math.sign(speed(ms) - speed(ms - 1)) !== Math.sign(speed(ms - 1) - speed(ms - 2)) && Math.abs(speed(ms) - speed(ms - 1)) > 1e-12) turned++;
    expect(turned).toBeLessThanOrEqual(2);
    // no leap: in the first 16.7 ms frame the plate has moved no more than 3 % of the move (an ease-out quadratic moved 18 %)
    expect(g0 - glideRemainder(g0, 16.7, 0)).toBeLessThan(0.03 * g0);
  });
  it("the options still make a staircase or whole cells when asked (kept for hosts that want them), and a zero-length glide is instant", () => {
    const seen = new Set<number>();
    for (let ms = 0; ms < TRACK.glideMs; ms++) seen.add(glideRemainder(CELL, ms, CELL));
    expect([...seen].sort()).toEqual([0, CELL]);
    expect(new Set(Array.from({ length: 180 }, (_, ms) => glideRemainder(100, ms, 0, { glideMs: 180, stepMs: 36 }))).size).toBeLessThanOrEqual(5);
    expect(glideRemainder(10, 0, 0, { glideMs: 0, stepMs: 0 })).toBe(0);
  });
});

/** Two boxes, the second of which slides into the first one's label: the second's plate must change slot (a left-hand slot to a right-hand one). On the lattice. */
function collide(fps = 60) {
  const t = tracker();
  const a = box(1, 100, 100);
  let b = box(2, 300, 100);
  t.step(0, [a, b], VIEW, SMOOTH);
  let now = 0;
  const trace: { t: number; ox: number; oy: number; gx: number; gy: number; cand: number; moved: boolean; x: number; y: number; bx: number }[] = [];
  const frame = (dx: number) => {
    now += 1000 / fps;
    b = move(b, dx, 0);
    const out = t.step(now, [a, b], VIEW, SMOOTH);
    const p = out[1]!;
    trace.push({ t: now, ox: p.x - b.rect.c0, oy: p.y - b.rect.r0, gx: p.gx, gy: p.gy, cand: p.cand, moved: p.moved, x: p.x, y: p.y, bx: b.rect.c0 });
    return p;
  };
  return { t, frame, trace, box: () => b };
}

describe("a slot change is a continuous glide, never a jump", () => {
  it("the plate's offset from its box goes monotonically from where it was to the new place, no overshoot, and arrives exactly", () => {
    const { t, frame, trace } = collide();
    for (let f = 0; f < 40; f++) frame(-5);
    for (let f = 0; f < 60; f++) frame(0); // the box stops; the plate goes on
    const k0 = trace.findIndex((r) => r.moved);
    expect(k0).toBeGreaterThan(0);
    const start = trace[k0 - 1]!;
    const last = trace[trace.length - 1]!;
    const dist = Math.hypot(last.ox - start.ox, last.oy - start.oy);
    expect(dist).toBeGreaterThan(40); // a real move: left-hand slot to right-hand slot
    const sx = Math.sign(last.ox - start.ox);
    const sy = Math.sign(last.oy - start.oy);
    for (let k = k0; k < trace.length; k++) {
      const r = trace[k]!;
      const q = trace[k - 1]!;
      if (sx) {
        expect((r.ox - q.ox) * sx).toBeGreaterThanOrEqual(-1e-9); // never turns back
        expect((r.ox - last.ox) * sx).toBeLessThanOrEqual(1e-9); // never past the end
      }
      if (sy) {
        expect((r.oy - q.oy) * sy).toBeGreaterThanOrEqual(-1e-9);
        expect((r.oy - last.oy) * sy).toBeLessThanOrEqual(1e-9);
      }
    }
    // the motion lasts about 150 to 200 ms, ends exactly at the target and the loop would stop there
    const t0 = trace[k0]!.t;
    const arrived = trace.findIndex((r, k) => k >= k0 && r.gx === 0 && r.gy === 0);
    expect(arrived).toBeGreaterThan(k0);
    expect(trace[arrived]!.t - t0).toBeGreaterThanOrEqual(0.6 * TRACK.glideMs);
    expect(trace[arrived]!.t - t0).toBeLessThanOrEqual(TRACK.glideMs + 20);
    expect(t.gliding).toBe(0);
    expect(trace.slice(arrived).every((r) => r.gx === 0 && r.gy === 0)).toBe(true);
    // the first frame of the move is where the plate was: it sets off, it does not leap
    expect(Math.hypot(trace[k0]!.ox - start.ox, trace[k0]!.oy - start.oy)).toBeLessThan(1e-9);
  });
  it("the glide has a new position in (nearly) every frame, none of them on a grid of cells: eased, not stepped", () => {
    const { frame, trace } = collide();
    for (let f = 0; f < 40; f++) frame(-5);
    for (let f = 0; f < 60; f++) frame(0);
    const k0 = trace.findIndex((r) => r.moved);
    const glide = trace.slice(k0).filter((r) => r.gx !== 0 || r.gy !== 0);
    const offsets = [...new Set(glide.map((r) => `${r.ox},${r.oy}`))].map((k) => k.split(",").map(Number) as [number, number]);
    expect(glide.length).toBeGreaterThanOrEqual(8); // 200 ms at 60 Hz
    expect(offsets.length).toBeGreaterThanOrEqual(glide.length - 1); // a new place in every frame
    const sub = offsets.filter((o) => !onLattice(o[0]) || !onLattice(o[1]));
    expect(sub.length).toBeGreaterThan(offsets.length / 2); // between cells, not on them
    const steps = offsets.slice(1).map((o, k) => Math.hypot(o[0] - offsets[k]![0], o[1] - offsets[k]![1]));
    expect(steps[0]!).toBeLessThan(0.25 * Math.max(...steps)); // it sets off slowly
  });
  it("the frame loop is owed (gliding > 0) exactly while a label has not arrived", () => {
    const { t, frame, trace } = collide();
    let wasGliding = false;
    for (let f = 0; f < 100; f++) {
      frame(f < 40 ? -5 : 0);
      const r = trace[trace.length - 1]!;
      if (t.gliding > 0) wasGliding = true;
      expect(t.gliding > 0).toBe(r.gx !== 0 || r.gy !== 0); // (one label glides here)
    }
    expect(wasGliding).toBe(true);
    expect(t.gliding).toBe(0);
  });
  it("frame-rate independent: the glide is a function of time, so 30, 60 and 144 fps arrive within glideMs of the change and stop on the same place", () => {
    const finals: number[] = [];
    for (const fps of [30, 60, 144]) {
      const { t, frame, trace } = collide(fps);
      for (let f = 0; f < Math.round(fps * 0.7); f++) frame((-5 * 60) / fps);
      for (let f = 0; f < fps; f++) frame(0);
      const k0 = trace.findIndex((r) => r.moved);
      const arrived = trace.findIndex((r, k) => k >= k0 && r.gx === 0 && r.gy === 0);
      expect(k0).toBeGreaterThan(0);
      expect(arrived).toBeGreaterThan(k0);
      expect(trace[arrived]!.t - trace[k0]!.t).toBeLessThanOrEqual(TRACK.glideMs + 1000 / fps + 1);
      expect(t.gliding).toBe(0);
      // the final place is the slot's place whatever the frame rate
      const last = trace[trace.length - 1]!;
      finals.push(last.oy); // (the box moves along x only, and the plate goes below it)
    }
    expect(finals[1]).toBeCloseTo(finals[0]!, 9);
    expect(finals[2]).toBeCloseTo(finals[0]!, 9);
  });
  it("reduced motion: a slot change is instant, no glide, never gliding", () => {
    const { t, frame, trace } = collide();
    t.instant = true;
    for (let f = 0; f < 60; f++) frame(f < 40 ? -5 : 0);
    expect(trace.every((r) => r.gx === 0 && r.gy === 0)).toBe(true);
    expect(t.gliding).toBe(0);
    expect(trace.some((r) => r.moved)).toBe(true);
  });
  it("settleNow ends every glide at once: at rest every label is exactly at its target", () => {
    const { t, frame, trace } = collide();
    for (let f = 0; f < 40; f++) frame(-5);
    let k = 0;
    while (t.gliding === 0 && k++ < 30) frame(0);
    t.settleNow();
    frame(0);
    const r = trace[trace.length - 1]!;
    expect(t.gliding).toBe(0);
    expect(r.gx).toBe(0);
    expect(r.gy).toBe(0);
  });
});

describe("a plate follows its box smoothly: exactly as far as the box moved, to the sub-pixel", () => {
  it("while the camera moves and the slot is kept, the plate's offset to its box is constant, with boxes at any fraction of a pixel", () => {
    const t = tracker();
    let items = [box(1, 100.3, 100.1), box(2, 300.7, 100.9), box(3, 140.2, 300.4)];
    t.step(0, items, VIEW, SMOOTH);
    const first = t.step(16, items, VIEW, SMOOTH);
    const off = first.map((p, n) => [p.x - items[n]!.rect.c0, p.y - items[n]!.rect.r0]);
    let fractional = 0;
    for (let f = 2; f < 90; f++) {
      items = items.map((it) => move(it, 0.37 + 0.11 * (f % 3), 0.19 * (f % 2) + 0.05));
      const out = t.step(f * 16, items, VIEW, SMOOTH);
      out.forEach((p, n) => {
        expect(p.x - items[n]!.rect.c0).toBeCloseTo(off[n]![0]!, 9);
        expect(p.y - items[n]!.rect.r0).toBeCloseTo(off[n]![1]!, 9);
        if (!onLattice(p.x) || !onLattice(p.y)) fractional++;
      });
    }
    expect(fractional).toBeGreaterThan(100); // the plates are not on a grid
  });
  it("a box that spins 0.2 px a frame moves its plate 0.2 px a frame: no step, whatever the cell", () => {
    const t = tracker();
    let it = box(1, 100, 100);
    let prev = t.step(0, [it], VIEW, SMOOTH)[0]!;
    for (let f = 1; f < 120; f++) {
      it = move(it, 0.2, 0.05);
      const p = t.step(f * 8.3, [it], VIEW, SMOOTH)[0]!;
      expect(p.x - prev.x).toBeCloseTo(0.2, 9);
      expect(p.y - prev.y).toBeCloseTo(0.05, 9);
      prev = p;
    }
  });
  it("the clear room to the projected box is the plan's gap (boxGap plus one cell: the drawn outline lies up to a cell outside it), exactly, for any plate height", () => {
    const t = tracker();
    expect(SMOOTH.gap).toBe(PX_UNITS.gap + CELL);
    for (const h of [16, 24, 38]) {
      const it = box(1, 100.3, 100.7, { variants: [{ w: 90, h }] });
      const p = t.step(0, [it], VIEW, SMOOTH)[0]!;
      expect(it.rect.r0 - (p.y + p.h)).toBeCloseTo(SMOOTH.gap, 9);
      expect(p.x).toBeCloseTo(it.rect.c0, 9);
      t.mem.set[1] = 0;
    }
  });
  it("a box drawn on cells (snapped) lies at most one cell outside its projected rectangle: the plate, one gap from the projected edge, never touches the outline", () => {
    const cell = CELL;
    for (let k = 0; k < 200; k++) {
      const y0 = 100 + k * 0.137; // projected top edge
      const snapped = Math.floor(y0 / cell) * cell; // snapBox
      const t = tracker();
      const it = box(1, 100, y0);
      const p = t.step(0, [it], VIEW, SMOOTH)[0]!;
      expect(snapped - (p.y + p.h)).toBeGreaterThanOrEqual(PX_UNITS.gap - 1e-9); // at least boxGap (3 px) of clear room to the drawn outline
    }
  });
});

describe("a re-plan during a glide retargets from where the plate is", () => {
  /** Drive the glide of one label by hand: `go(x)` is one frame of 1/60 s with the slot's place at offset `x` from the box (y 0). */
  const rig = () => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS);
    const any = t as unknown as { place(now: number, i: number, r: TrackItem["rect"], x: number, y: number, kind: "fresh" | "retarget" | "keep"): { x: number; gx: number }; cell: number };
    any.cell = CELL;
    const r = { c0: 0, r0: 0, c1: 50, r1: 40 };
    let now = 0;
    any.place(now, 1, r, 0, 0, "fresh");
    const xs: number[] = [0];
    let cur = 0;
    const go = (to: number) => {
      now += 1000 / 60;
      const kind = to !== cur ? "retarget" : "keep";
      cur = to;
      xs.push(any.place(now, 1, r, to, 0, kind).x);
    };
    return { go, xs };
  };
  it("towards a place further on: no jump at the re-plan, the plate never turns back or passes the new place, and it arrives", () => {
    const { go, xs } = rig();
    for (let f = 0; f < 5; f++) go(100);
    const atReplan = xs[xs.length - 1]!;
    go(160);
    expect(xs[xs.length - 1]!).toBeCloseTo(atReplan, 9); // the plate stays where it was for the frame of the re-plan
    for (let f = 0; f < 60; f++) go(160);
    for (let k = 1; k < xs.length; k++) {
      expect(xs[k]! - xs[k - 1]!).toBeGreaterThanOrEqual(-1e-9);
      expect(xs[k]!).toBeLessThanOrEqual(160 + 1e-9);
    }
    expect(xs[xs.length - 1]).toBe(160);
  });
  it("back to where it came from: no overshoot past that place, no teleport, and it arrives", () => {
    const { go, xs } = rig();
    for (let f = 0; f < 5; f++) go(100);
    const peak = xs[xs.length - 1]!;
    for (let f = 0; f < 60; f++) go(0);
    for (let k = 1; k < xs.length; k++) {
      expect(Math.abs(xs[k]! - xs[k - 1]!)).toBeLessThanOrEqual(peak + 1e-9);
      expect(xs[k]!).toBeGreaterThanOrEqual(-1e-9);
    }
    expect(xs[xs.length - 1]).toBe(0);
  });
});

describe("a slot is kept for a while: a better position is not taken at once", () => {
  /** b's box slides into a's label and back out; returns when b's plate left its first position, and when it was back. */
  const run = (dwellMs: number) => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS, { ...TRACK, dwellMs });
    const a = box(1, 100, 100);
    let b = box(2, 230, 100);
    t.step(0, [a, b], VIEW, INSET);
    let now = 0;
    let leftAt = -1;
    let backAt = -1;
    for (let f = 0; f < 150; f++) {
      b = move(b, f < 12 ? -6 : f < 30 ? 6 : 0, 0);
      now += 16;
      const out = t.step(now, [a, b], VIEW, INSET);
      if (leftAt < 0 && out[1]!.cand !== SPOT.aboveLeft) leftAt = now;
      if (leftAt >= 0 && backAt < 0 && out[1]!.cand === SPOT.aboveLeft) backAt = now;
    }
    return { leftAt, backAt };
  };
  it("a label that has just changed slot keeps it while it is free, and only goes back to the better position after dwellMs", () => {
    const held = run(500);
    const free = run(0);
    expect(held.leftAt).toBeGreaterThan(-1);
    expect(held.backAt).toBeGreaterThan(-1);
    expect(free.backAt - free.leftAt).toBeLessThan(500); // without the dwell it goes back as soon as the position is free
    expect(held.backAt - held.leftAt).toBeGreaterThanOrEqual(500);
    expect(held.backAt - held.leftAt).toBeLessThan(500 + 2 * TRACK.replanMs);
  });
  it("a slot that is blocked is left at once, whatever the dwell (the first label of the test above gave way as soon as the plan ran)", () => {
    const held = run(1e9);
    expect(held.leftAt).toBeGreaterThan(-1);
    expect(held.leftAt).toBeLessThanOrEqual(TRACK.replanMs + 16 + 100);
  });
});

describe("a globe that turns on its own: boxes change by one cell once a second (setDrifting)", () => {
  /**
   * Two neighbours whose relative offset jitters by a few px once a second (one box snapped to its next art cell, then the other's), the camera
   * otherwise still: `restMs` passes between two steps, so without the hint every step is followed by a plan at rest (no upgrade margin, no dwell)
   * and the label that gave its place up takes it back, and again at the next step. Counted: slot changes of the lower-priority label.
   */
  const run = (drifting: boolean, seconds = 24) => {
    const t = tracker();
    t.setDrifting(drifting);
    const a = box(1, 100, 100, { score: 120 });
    let last: string | null = null;
    let changes = 0;
    let now = 0;
    for (let s = 0; s < seconds; s++) {
      const b = box(2, s % 2 ? 200 : 190, 100); // 190: its first slot is under a's plate (blocked); 200: free, but with 6 px of room, under the 10 px upgrade margin
      for (let f = 0; f < 62; f++) {
        const out = t.step(now, [a, b], VIEW, INSET);
        const k = `${out[1]!.variant}/${out[1]!.cand}`;
        if (last !== null && k !== last) changes++;
        last = k;
        now += 16;
      }
    }
    return changes;
  };
  it("labels do not swap places for as long as it turns: the slot a label was pushed to is kept until it is blocked", () => {
    expect(run(false)).toBeGreaterThanOrEqual(10); // the plan at rest in every pause takes the best place back, and the next step takes it away
    expect(run(true)).toBeLessThanOrEqual(1);
  });
  it("when it stops turning a plan at rest is owed: every label settles on its best place", () => {
    const t = tracker();
    t.setDrifting(true);
    const a = box(1, 100, 100, { score: 120 });
    const items = (x: number) => [a, box(2, x, 100)];
    let now = 0;
    t.step(now, items(190), VIEW, INSET);
    for (const x of [190, 200, 200]) for (let f = 0; f < 62; f++) t.step((now += 16), items(x), VIEW, INSET);
    const moved = t.step((now += 16), items(200), VIEW, INSET)[1]!.cand;
    expect(moved).not.toBe(SPOT.aboveLeft);
    t.setDrifting(false);
    expect(t.dueAt).not.toBeNull();
    t.settleNow();
    expect(t.step((now += 16), items(200), VIEW, INSET)[1]!.cand).toBe(SPOT.aboveLeft);
  });
});

describe("a globe that turns on its own does not re-plan for every quantum of motion", () => {
  const items = (dx: number, extra: TrackItem[] = []) => [box(1, 100 + dx, 100), box(2, 230 + dx, 100), box(3, 100 + dx, 300), ...extra];
  /** Drift every box by `px` per 16 ms frame for `frames` frames; returns the full plans that ran, and the clock. */
  const drift = (t: LabelTracker, from: number, px: number, frames: number, start = 0) => {
    let now = start;
    let plans = 0;
    for (let f = 0; f < frames; f++) {
      t.step(now, items(from + px * f), VIEW, SMOOTH);
      if (t.info.full) plans++;
      now += 16;
    }
    return { plans, now, dx: from + px * frames };
  };
  it("0.02 px a frame: a plan about every keepSlack/2 px of drift (about a second), not ten a second; the boxes are re-labelled in the first step", () => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS);
    t.setDrifting(true);
    t.step(0, items(0), VIEW, SMOOTH);
    const r = drift(t, 0, 0.02, 3750, 16); // a minute
    const every = SMOOTH.keepSlack / 2 / 0.02; // frames per plan (the change is seen on a quantum of 0.25 px: a plan takes up to 13 frames more)
    expect(r.plans).toBeGreaterThanOrEqual(Math.floor(3750 / (every + 13)) - 1);
    expect(r.plans).toBeLessThanOrEqual(Math.ceil(3750 / every) + 1);
    expect(r.plans).toBeLessThan(80); // (measured before: 588 a minute)
    // the same drift with the hint off is the old rate: a plan for every 0.25 px quantum, bounded by replanMs
    const u = new LabelTracker(new SlotMemory(100), PX_UNITS);
    u.step(0, items(0), VIEW, SMOOTH);
    expect(drift(u, 0, 0.02, 3750, 16).plans).toBeGreaterThan(r.plans * 5);
  });
  it("nothing is owed (no timer) while the drift stays under the slack, and the plan comes within replanMs of the drift reaching it", () => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS);
    t.setDrifting(true);
    t.step(0, items(0), VIEW, SMOOTH);
    const half = SMOOTH.keepSlack / 2;
    let now = 16;
    const a = t.step(now, items(half * 0.9), VIEW, SMOOTH);
    expect(a).toHaveLength(3);
    expect(t.info.full).toBe(false);
    expect(t.dueAt).toBeNull();
    now += 16;
    t.step(now, items(half + 0.3), VIEW, SMOOTH); // the box has moved more than half the slack since the last plan
    expect(t.dueAt).not.toBeNull();
    let planned = t.info.full;
    for (let k = 0; k < 8 && !planned; k++) {
      now += 16;
      t.step(now, items(half + 0.3), VIEW, SMOOTH);
      planned = t.info.full;
    }
    expect(planned).toBe(true);
    expect(now).toBeLessThanOrEqual(TRACK.replanMs + 16 * 2);
  });
  it("the drift is measured from the last plan, not from the last step: many small steps add up", () => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS);
    t.setDrifting(true);
    t.step(0, items(0), VIEW, SMOOTH);
    const r = drift(t, 0, 0.1, 40, 16); // 4 px in 40 steps of 0.1 px
    expect(r.plans).toBeGreaterThanOrEqual(2);
  });
  it("a node that appears or goes, or a room that changes, is planned at once whatever the drift", () => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS, { ...TRACK, dwellMs: 0 }); // (a young slot owes its own plan once it is old enough: not what is tested here)
    t.setDrifting(true);
    t.step(0, items(0), VIEW, SMOOTH);
    t.step(16, items(0), VIEW, SMOOTH);
    t.step(32, items(0.1), VIEW, SMOOTH);
    expect(t.dueAt).toBeNull();
    const added = t.step(48, items(0.1, [box(4, 400, 400)]), VIEW, SMOOTH);
    expect(added[3]!.fresh).toBe(true); // placed in the gaps in this very step
    expect(t.dueAt).not.toBeNull();
    t.step(TRACK.replanMs + 48, items(0.1, [box(4, 400, 400)]), VIEW, SMOOTH);
    expect(t.info.full).toBe(true);
    t.step(TRACK.replanMs + 64, items(0.1, [box(4, 400, 400)]), VIEW, SMOOTH);
    expect(t.dueAt).toBeNull();
    t.step(TRACK.replanMs + 80, items(0.1), VIEW, SMOOTH); // one goes
    expect(t.dueAt).not.toBeNull();
    t.step(2 * TRACK.replanMs + 80, items(0.1), VIEW, SMOOTH);
    expect(t.info.full).toBe(true);
    expect(t.dueAt).toBeNull();
    t.step(2 * TRACK.replanMs + 96, items(0.1), { cols: VIEW.cols + 40, rows: VIEW.rows }, SMOOTH);
    expect(t.dueAt).not.toBeNull();
  });
  it("a node that is away for a few frames (a group opens and closes again) re-plans nothing: the plan of a changed set waits replanMs; one that stays away is planned", () => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS, { ...TRACK, dwellMs: 0 });
    t.setDrifting(true);
    const three = items(0);
    const two = three.slice(0, 2);
    let now = 0;
    t.step(now, three, VIEW, SMOOTH);
    const slots = t.step((now += 16), three, VIEW, SMOOTH).map((p) => p.cand);
    let plans = 0;
    const go = (list: TrackItem[]) => {
      const out = t.step((now += 16), list, VIEW, SMOOTH);
      if (t.info.full) plans++;
      return out;
    };
    now = 500; // long after the last plan: a plan owed now would run at once
    for (let f = 0; f < 4; f++) go(two); // away for 64 ms
    expect(t.info.full).toBe(false);
    const back = go(three);
    expect(back.map((p) => p.cand)).toEqual(slots);
    for (let f = 0; f < 10; f++) go(three);
    expect(plans).toBe(0);
    expect(t.dueAt).toBeNull();
    go(two); // away for good
    expect(t.dueAt).not.toBeNull(); // owed, replanMs after the set changed
    for (let f = 0; f < 10; f++) go(two);
    expect(plans).toBe(1);
    expect(t.dueAt).toBeNull();
  });
  it("a box whose size changes counts as moved by the change of its edge", () => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS);
    t.setDrifting(true);
    const a = box(1, 100, 100);
    t.step(0, [a], VIEW, SMOOTH);
    t.step(16, [{ ...a, rect: { ...a.rect, c1: a.rect.c1 + 0.1 } }], VIEW, SMOOTH);
    expect(t.dueAt).toBeNull();
    t.step(32, [{ ...a, rect: { ...a.rect, c1: a.rect.c1 + 3 } }], VIEW, SMOOTH);
    expect(t.dueAt).not.toBeNull();
  });
  it("when the drift stops the plan at rest is still owed (every label settles on its best place), and without the hint the old rule holds", () => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS);
    t.setDrifting(true);
    t.step(0, items(0), VIEW, SMOOTH);
    t.step(16, items(0.3), VIEW, SMOOTH);
    expect(t.dueAt).toBeNull();
    t.setDrifting(false);
    expect(t.dueAt).not.toBeNull();
    const u = new LabelTracker(new SlotMemory(100), PX_UNITS);
    u.step(0, items(0), VIEW, SMOOTH);
    u.step(16, items(0.3), VIEW, SMOOTH);
    expect(u.dueAt).not.toBeNull(); // not drifting: any change owes a plan
  });
  it("units without a slack (keepSlack 0) owe a plan for any change, drifting or not", () => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS);
    t.setDrifting(true);
    const u = { ...SMOOTH, keepSlack: 0 };
    t.step(0, items(0), VIEW, u);
    t.step(16, items(0.5), VIEW, u);
    expect(t.dueAt).not.toBeNull();
  });
  it("a reset (the host parked, or the tree changed under it) forgets where the rectangles were planned: the next change is planned", () => {
    const t = new LabelTracker(new SlotMemory(100), PX_UNITS);
    t.setDrifting(true);
    t.step(0, items(0), VIEW, SMOOTH);
    t.step(16, items(0.05), VIEW, SMOOTH);
    expect(t.dueAt).toBeNull();
    t.reset();
    t.step(32, items(0.1), VIEW, SMOOTH);
    expect(t.dueAt).not.toBeNull();
  });
});

describe("what counts as a moving rectangle is a speed (MOTION), the same at any frame rate", () => {
  it("the limit scales with the interval, within its bounds", () => {
    expect(motionLimitPx(1000 / 60)).toBeCloseTo((MOTION.pxPerSec * 1000) / 60 / 1000, 12);
    expect(motionLimitPx(1000 / 144)).toBeLessThan(motionLimitPx(1000 / 30));
    expect(motionLimitPx(0)).toBeCloseTo((MOTION.pxPerSec * MOTION.minDtMs) / 1000, 12);
    expect(motionLimitPx(60_000)).toBeCloseTo((MOTION.pxPerSec * MOTION.maxDtMs) / 1000, 12);
    expect(motionLimitPx(NaN)).toBeNaN(); // the first run: nothing to compare with, everything counts as moved
  });
  it("the idle rotation (0.2 deg/s, 0.52 px/s at the centre of a 150 px disc) is motion at 30, 60 and 144 fps; a wobble of the last digits and a still camera are not", () => {
    const pxPerSec = ((0.2 * Math.PI) / 180) * 150;
    for (const fps of [30, 60, 144]) {
      const dt = 1000 / fps;
      expect((pxPerSec * dt) / 1000, `${fps} fps`).toBeGreaterThan(motionLimitPx(dt));
      expect(1e-6, `${fps} fps: float noise`).toBeLessThan(motionLimitPx(dt));
    }
    // the old rule (0.01 px a frame) called 0.52 px/s at 60 fps (0.0087 px) still: that is the case this replaces
    expect((pxPerSec * (1000 / 60)) / 1000).toBeLessThan(0.01);
  });
});

describe("a node that is fading out keeps gliding", () => {
  it("follows its box with the glide it had, and a slot that is not possible any more is a glide to the fallback place, not a jump", () => {
    const t = tracker();
    t.step(0, [box(1, 100, 100)], VIEW, INSET);
    const rect = { c0: 200, r0: 220, c1: 250, r1: 260 };
    const out = t.follow(16, [{ id: 1, rect, size: FULL }], VIEW, INSET);
    expect(out[0]).toMatchObject({ x: 200 - BLEED, y: 220 - FULL.h - GAP, gx: 0, gy: 0 });
    // an id with no slot: the fallback place, no glide
    expect(t.follow(32, [{ id: 9, rect, size: FULL }], VIEW, INSET)[0]).toMatchObject({ x: 200, y: 220 - FULL.h, gx: 0, gy: 0 });
  });
});

describe("a box that appears is labelled at once, in the gaps of the labels that stay", () => {
  it("the new label takes a free place and no other label moves", () => {
    const t = tracker();
    let items = [box(1, 100, 100), box(2, 400, 100)];
    const first = t.step(0, items, VIEW, INSET);
    items = items.map((it) => move(it, 3, 0));
    t.step(16, items, VIEW, INSET);
    // a new box right under the first one's label
    const fresh = box(3, 100, 120);
    const out = t.step(32, [...items.map((it) => move(it, 3, 0)), fresh], VIEW, INSET);
    expect(t.info).toMatchObject({ full: false, partial: 1 });
    expect(out[2]!.fresh).toBe(true);
    expect(out[0]!.cand).toBe(first[0]!.cand);
    expect(out[1]!.cand).toBe(first[1]!.cand);
    expect(out.slice(0, 2).every((p) => !p.moved)).toBe(true);
    for (const p of out.slice(0, 2)) expect(overlap(out[2]!, p, PX_UNITS.clearance)).toBe(false);
  });
  it("a node that has no label yet is never left without one, however crowded (the last resort draws it over the others)", () => {
    const t = tracker();
    const items = Array.from({ length: 30 }, (_, k) => box(k, 300 + (k % 6) * 14, 250 + Math.floor(k / 6) * 12, { w: 12, h: 10 }));
    const out = t.step(0, items, VIEW, INSET);
    expect(out.length).toBe(30);
    for (const p of out) expect(p.w).toBeGreaterThan(0);
    expect(out.some((p) => p.overlap)).toBe(true);
  });
});

describe("a slot that becomes impossible is replaced at once", () => {
  it("a label above a box that reaches the top of the screen leaves its slot for the inside of the box's top-left corner, never over the box's outline", () => {
    const t = tracker();
    let items = [box(1, 300, 200, { w: 200, h: 120 }), box(2, 600, 400)];
    const first = t.step(0, items, VIEW, INSET);
    expect(first[0]!.cand).toBe(SPOT.aboveLeft);
    let now = 0;
    let nested = false;
    for (const dy of [-60, -60, -60, -9]) {
      items = [move(items[0]!, 0, dy), items[1]!];
      const out = t.step((now += 16), items, VIEW, INSET);
      const rect = items[0]!.rect;
      const slot = out[0]!;
      // the plate stays on screen, and is either entirely outside the box or nested inside its outline: it never covers an arm or a dash
      const slotY = slot.y - slot.gy; // the slot's place (the plate itself glides there from where it was)
      const slotX = slot.x - slot.gx;
      expect(slotY).toBeGreaterThanOrEqual(0);
      const covers = slotX < rect.c1 && slotX + slot.w > rect.c0 && slotY < rect.r1 && slotY + slot.h > rect.r0;
      if (covers) expect(slot.inside).toBe(true);
      if (slot.inside) nested = true;
      expect(out[1]!.cand).toBe(first[1]!.cand);
      expect(t.info.full).toBe(false);
    }
    expect(items[0]!.rect.r0).toBeLessThan(0 + 40); // the box is at the top edge
    expect(nested).toBe(true);
    const pinned = t.step((now += 16), items, VIEW, INSET);
    expect(pinned[0]!.cand).toBe(SPOT.insideTopLeft);
  });
  it("at the left and right edges the plate slides along its box and stays in its slot", () => {
    const t = tracker();
    const it = box(1, 700, 200);
    t.step(0, [it], VIEW, INSET);
    const out = t.step(16, [move(it, 40, 0)], VIEW, INSET);
    expect(out[0]!.cand).toBe(SPOT.aboveLeft);
    expect(out[0]!.x + out[0]!.w).toBeLessThanOrEqual(VIEW.cols);
  });
  it("a nested label whose box becomes too small for it gets another slot", () => {
    const t = tracker();
    const big = box(1, 100, 4, { w: 400, h: 300 }); // no room above: nested
    const first = t.step(0, [big], VIEW, INSET);
    expect(first[0]!.inside).toBe(true);
    const small = box(1, 100, 4, { w: 60, h: 20 });
    const out = t.step(16, [small], VIEW, INSET);
    expect(out[0]!.inside).toBe(false);
  });
});

describe("sticky across plans and shared across overlays", () => {
  it("a second tracker on the same memory (the street overlay after the globe) starts from the slots the first chose", () => {
    const mem = new SlotMemory(10);
    const items = [box(1, 100, 100), box(2, 130, 100), box(3, 160, 100)];
    const a = new LabelTracker(mem, PX_UNITS).step(0, items, VIEW, INSET);
    const b = new LabelTracker(mem, PX_UNITS).step(0, items, VIEW, INSET);
    expect(b.map((p) => [p.cand, p.variant, p.x, p.y])).toEqual(a.map((p) => [p.cand, p.variant, p.x, p.y]));
    expect(b.some((p) => p.fresh)).toBe(false);
  });
  it("a changed text keeps the candidate as the preference", () => {
    const t = tracker();
    const it = box(1, 100, 100, { vkey: 7 });
    const first = t.step(0, [it], VIEW, INSET);
    const out = t.step(16, [{ ...it, vkey: 8, variants: [{ w: 120, h: 16 }, SHORT] }], VIEW, INSET);
    expect(out[0]!.cand).toBe(first[0]!.cand);
    expect(out[0]!.w).toBe(120);
  });
  it("planning twice in a row from the same memory gives the same plan (no hopping on a still camera)", () => {
    const t = tracker();
    const items = Array.from({ length: 40 }, (_, k) => box(k, 40 + ((k * 97) % 700), 40 + ((k * 61) % 500), { w: 30, h: 24 }));
    const a = t.step(0, items, VIEW, INSET);
    for (let f = 1; f <= 6; f++) {
      const b = t.step(f * 1000, items, VIEW, INSET);
      expect(b.map((p) => [p.cand, p.variant, p.x, p.y])).toEqual(a.map((p) => [p.cand, p.variant, p.x, p.y]));
    }
  });
});

describe("a node that is fading out", () => {
  it("a node that is only fading out keeps the slot it had, followed to its box", () => {
    const t = tracker();
    t.step(0, [box(1, 100, 100)], VIEW, INSET);
    const p = slotPosition(t.mem, 1, { c0: 200, r0: 220, c1: 250, r1: 260 }, FULL, VIEW, { ...PX_UNITS, inset: INSET });
    expect(p).toEqual({ x: 200 - BLEED, y: 220 - FULL.h - GAP });
    expect(slotPosition(t.mem, 9, { c0: 200, r0: 220, c1: 250, r1: 260 }, FULL, VIEW, { ...PX_UNITS, inset: INSET })).toEqual({ x: 200, y: 220 - FULL.h });
    // with the smooth units the slot's place is exact: one gap above the projected edge
    const q = slotPosition(t.mem, 1, { c0: 200.3, r0: 220.6, c1: 250.3, r1: 260.6 }, FULL, VIEW, SMOOTH);
    expect(q.x).toBeCloseTo(200.3, 9);
    expect(220.6 - (q.y + FULL.h)).toBeCloseTo(SMOOTH.gap, 9);
  });
});

/* ------------------------------------------------------------------------------------------------ the flicker metric */

/**
 * A deterministic camera sweep over 72 labelled boxes, four ways of drawing the labels: the plan run on EVERY frame (what the overlay did
 * before the tracker: `planLabels` with the last frame's choice as its memory), the continuous tracked plan WITHOUT its glide (a slot change
 * snaps: what the owner saw), reduced motion (no glide, plans only at rest) and the tracked plan with its glide. The camera pans and zooms 1 -> 1.45 over 3 s at 60 fps, with boxes snapped to 2.5 px cells like the real
 * ones, then rests for 1 s.
 *
 * FLICKER METRIC. For each label present in two consecutive frames:
 *  - a TELEPORT is a plate that moved in one frame (its nearer edge on each axis) by more than its box did (its fastest corner) plus 4 px plus
 *    the glide it had left before the frame (a stepped glide never moves a plate by more than what is left of it: a step is a share of the
 *    remainder, and the plate cannot pass its target). A label that changes slot at once, or hops, teleports; one that glides never does. This
 *    is what the eye sees as "snapping into place".
 *  - SMOOTHNESS (2026-10-13): the boxes are at fractions of a pixel (the projected rectangle, not snapped to cells), and a plate whose slot is
 *    kept moves by exactly what its box did (`lockstepErrors`), with a position that is not on a grid (`fractional`).
 *  - a CHANGE is a different slot (candidate position, or way of writing it): informative now (a change is a glide), counted to see that the
 *    sticky plan does not swap places back and forth.
 * A label that appears or disappears is counted apart (`visibility`: the camera and the cut decide it, the same for any plan).
 */
interface Sweep {
  /** Different slots of labels shown in two consecutive frames. */
  changes: number;
  /** Labels that appeared or disappeared (the camera and the cut decide it, the same for any plan). */
  visibility: number;
  /** Label-frames, for the rate. */
  shownFrames: number;
  teleports: number;
  /** Label-frames in which a plate was still on its way to its slot. */
  glidingFrames: number;
  /** The largest step a plate made against its box in one frame (px). */
  maxStep: number;
  labels: number;
  worstFrame: number;
  perLabel: number;
  finalOverlaps: number;
  /** After the rest: labels with a glide left, and the largest distance between a drawn plate and its slot's place. */
  gliding: number;
  atRestError: number;
  /** Frames from the camera stopping to the last plate arriving. */
  settleFrames: number;
  /** Label-frames whose plate was not on a 2.5 px grid (smooth: most of them); label-frames in lockstep with their box (same slot, no glide, clear of the edges) and those where the plate and its box moved by different amounts. */
  fractional: number;
  lockstepFrames: number;
  lockstepErrors: number;
}

/** The every-frame plan with the distances the pixel version had: 1 cell of clearance, 2 cells of margin before a better slot is taken, on 2.5 px cells. */
const OLD_UNITS = { clearance: 2.5, upgradeMargin: 5, shiftStep: 5, inset: 2.5, quant: 2.5, gap: 0, bleed: 0, keepSlack: 0 };

interface Seen {
  cand: number;
  variant: number;
  px: number;
  py: number;
  px1: number;
  py1: number;
  gx: number;
  gy: number;
  r: TrackItem["rect"];
}

function sweep(strategy: "every-frame" | "no-glide" | "reduced" | "tracked"): Sweep {
  const N = 72;
  const world = Array.from({ length: N }, (_, k) => {
    // clusters, so that labels crowd each other
    const cx = 50 + (k % 9) * 108 + ((k * 37) % 40);
    const cy = 30 + Math.floor(k / 9) * 74 + ((k * 53) % 30);
    const name = ["Marrakesh", "Fès", "Chefchaouen", "Essaouira", "Ouarzazate", "Merzouga", "Tangier", "Rabat", "Casablanca", "Agadir"][k % 10]!;
    return { cx, cy, name, w: 10 + ((k * 7) % 5) * 3, h: 10 + ((k * 3) % 4) * 3 };
  });
  const variantsFor = (name: string) => {
    const full = { w: Math.ceil(name.length * 6.2 + 6), h: 16 };
    return [full, { w: Math.ceil(6 * 6.2 + 6), h: 16 }];
  };
  const mem = new SlotMemory(N);
  // "no-glide": the same continuous plan with a glide of no length, so that a slot change is instant (what the labels did when a re-plan ran: a snap)
  const tr = new LabelTracker(mem, PX_UNITS, strategy === "no-glide" ? { ...TRACK, glideMs: 0 } : TRACK);
  tr.instant = strategy === "reduced";
  const prevOld = new Map<number, Prev>();
  let last = new Map<number, Seen>();
  const MOVE = 180;
  const FRAMES = MOVE + 60;
  let changes = 0;
  let visibility = 0;
  let shownFrames = 0;
  let teleports = 0;
  let glidingFrames = 0;
  let maxStep = 0;
  let worstFrame = 0;
  let settleFrames = 0;
  const everShown = new Set<number>();
  let finalOverlaps = 0;
  let atRestError = 0;
  let fractional = 0;
  let lockstepErrors = 0;
  let lockstepFrames = 0;
  for (let f = 0; f < FRAMES; f++) {
    // a hand on the map: a pan that swings both ways while the zoom breathes in and out, then rest
    const u = Math.min(1, f / MOVE);
    const scale = 1 + 0.45 * (0.5 - 0.5 * Math.cos(2 * Math.PI * u));
    const panX = 220 * Math.sin(2 * Math.PI * u * 1.5);
    const panY = 110 * Math.sin(2 * Math.PI * u * 1);
    const items: TrackItem[] = [];
    world.forEach((n, k) => {
      // the projected rectangle: any fraction of a pixel (the drawn box is snapped to cells, the labels do not follow that)
      const x0 = (n.cx - panX) * scale;
      const y0 = (n.cy - panY) * scale + 40;
      const w = n.w * scale;
      const h = n.h * scale;
      if (x0 + w < 0 || y0 + h < 0 || x0 > VIEW.cols || y0 > VIEW.rows) return; // not drawn
      items.push({ id: k, key: `n${k}`, rect: { c0: x0, r0: y0, c1: x0 + w, r1: y0 + h }, score: 50 + (k % 5), area: w * h, variants: variantsFor(n.name), vkey: k + 1 });
    });
    const now = new Map<number, Seen>();
    const plates: { x: number; y: number; w: number; h: number }[] = [];
    if (strategy === "every-frame") {
      const plan: PlanItem[] = items.map((it) => ({ score: it.score, area: it.area, key: it.key, rect: it.rect, variants: it.variants, prev: prevOld.get(it.id) ?? null }));
      const out = planLabels(plan, VIEW, OLD_UNITS);
      out.forEach((p, n) => {
        const it = items[n]!;
        prevOld.set(it.id, { variant: p.variant, cand: p.cand, dx: p.x - it.rect.c0, dy: p.y - it.rect.r0 });
        now.set(it.id, { cand: p.cand, variant: p.variant, px: p.x, py: p.y, px1: p.x + p.w, py1: p.y + p.h, gx: 0, gy: 0, r: it.rect });
        plates.push({ x: p.x, y: p.y, w: p.w, h: p.h });
      });
    } else {
      const out = tr.step(f * (1000 / 60), items, VIEW, SMOOTH);
      out.forEach((p, n) => {
        const it = items[n]!;
        if (!onLattice(p.x) || !onLattice(p.y)) fractional++;
        now.set(it.id, { cand: p.cand, variant: p.variant, px: p.x, py: p.y, px1: p.x + p.w, py1: p.y + p.h, gx: p.gx, gy: p.gy, r: it.rect });
        plates.push({ x: p.x, y: p.y, w: p.w, h: p.h });
        if (f === FRAMES - 1) atRestError = Math.max(atRestError, Math.abs(p.gx), Math.abs(p.gy));
      });
    }
    let frameChanges = 0;
    let anyGliding = false;
    for (const [id, s] of now) {
      everShown.add(id);
      shownFrames++;
      if (s.gx !== 0 || s.gy !== 0) {
        glidingFrames++;
        anyGliding = true;
      }
      const p = last.get(id);
      if (!p) {
        if (f > 0) visibility++; // appears
        continue;
      }
      if (p.cand !== s.cand || p.variant !== s.variant) frameChanges++;
      // lockstep: the same slot, no glide before or after, and clear of the screen's edges (where a plate slides along its box, or follows the visible part of it): the plate moved exactly as the corner of
      // its box it is aligned with (or the side it stands against) did, exactly. (The positions shifted along an edge follow neither corner: not counted.)
      if (strategy !== "every-frame" && p.cand === s.cand && p.variant === s.variant && p.gx === 0 && p.gy === 0 && s.gx === 0 && s.gy === 0 && p.cand >= 0 && !(p.cand >= SPOT.aboveShift && p.cand <= SPOT.aboveShift + 2) && !(p.cand >= SPOT.belowShift && p.cand <= SPOT.belowShift + 2)) {
        const clear = (q: Seen) => q.px >= CELL && q.py >= CELL && q.px1 <= VIEW.cols - CELL && q.py1 <= VIEW.rows - CELL && q.r.c0 >= 0 && q.r.r0 >= 0 && q.r.c1 <= VIEW.cols && q.r.r1 <= VIEW.rows; // plate and box wholly on the screen
        if (clear(p) && clear(s)) {
          lockstepFrames++;
          const dx = s.px - p.px;
          const dy = s.py - p.py;
          const xs = [s.r.c0 - p.r.c0, s.r.c1 - p.r.c1];
          const ys = [s.r.r0 - p.r.r0, s.r.r1 - p.r.r1];
          if (!xs.some((d) => Math.abs(d - dx) < 1e-9) || !ys.some((d) => Math.abs(d - dy) < 1e-9)) lockstepErrors++;
        }
      }
      // a teleport: the plate moved in one frame by more than its box moved (its fastest corner), 4 px, and what its glide may move it by
      const boxMove = Math.max(Math.abs(p.r.c0 - s.r.c0), Math.abs(p.r.r0 - s.r.r0), Math.abs(p.r.c1 - s.r.c1), Math.abs(p.r.r1 - s.r.r1));
      const glide = Math.max(Math.abs(p.gx), Math.abs(p.gy), Math.abs(s.gx), Math.abs(s.gy));
      const step = Math.max(Math.min(Math.abs(p.px - s.px), Math.abs(p.px1 - s.px1)), Math.min(Math.abs(p.py - s.py), Math.abs(p.py1 - s.py1))); // the nearer edge on each axis: a shorter text keeps the edge its plate is anchored on
      maxStep = Math.max(maxStep, step - boxMove);
      if (step > boxMove + 4 + glide) teleports++;
    }
    for (const id of last.keys()) if (!now.has(id)) visibility++; // disappears
    if (f < MOVE) {
      changes += frameChanges;
      worstFrame = Math.max(worstFrame, frameChanges);
    } else if (anyGliding) settleFrames = f - MOVE + 1;
    last = now;
    if (f === FRAMES - 1) {
      for (let a = 0; a < plates.length; a++) for (let b = a + 1; b < plates.length; b++) if (plates[a]!.x < plates[b]!.x + plates[b]!.w && plates[a]!.x + plates[a]!.w > plates[b]!.x && plates[a]!.y < plates[b]!.y + plates[b]!.h && plates[a]!.y + plates[a]!.h > plates[b]!.y) finalOverlaps++;
    }
  }
  return { changes, visibility, shownFrames, teleports, glidingFrames, maxStep, labels: everShown.size, worstFrame, perLabel: changes / everShown.size, finalOverlaps, gliding: tr.gliding, atRestError, settleFrames, fractional, lockstepErrors, lockstepFrames };
}

describe("flicker metric over a camera sweep: labels move all the time and never teleport", () => {
  const old = sweep("every-frame");
  const snap = sweep("no-glide");
  const reduced = sweep("reduced");
  const now = sweep("tracked");
  it("reports the numbers (the plan on every frame, the tracked plan without its glide, reduced motion, the tracked plan with its glide)", () => {
    const line = (n: string, r: Sweep) => `${n}: ${r.changes} slot changes (${r.perLabel.toFixed(2)} per label, worst frame ${r.worstFrame}), ${r.teleports} teleports, ${r.glidingFrames} label-frames gliding (largest step against the box ${r.maxStep.toFixed(1)} px), ${r.settleFrames} frames to settle, ${r.finalOverlaps} overlaps at rest, ${r.fractional} between cells, ${r.lockstepErrors} of ${r.lockstepFrames} label-frames out of lockstep`;
    console.info(`label motion over the sweep (${old.labels} labels, 240 frames, ${old.visibility} appearances and disappearances for all four):\n  ${line("every-frame plan", old)}\n  ${line("tracked, no glide (a slot change snaps)", snap)}\n  ${line("tracked, reduced motion", reduced)}\n  ${line("tracked, gliding", now)}`);
    expect(old.labels).toBeGreaterThan(40);
    expect(now.visibility).toBe(old.visibility);
    expect(now.labels).toBe(old.labels);
  });
  it("the metric sees what the owner saw: the plan on every frame, and a slot change that is not glided, teleport", () => {
    expect(old.teleports).toBeGreaterThan(40);
    expect(snap.teleports).toBeGreaterThan(20);
  });
  it("reduced motion: no glide, and the labels do not hop while the camera moves (plans only at rest): few teleports (the labels forced off the screen's edge), far fewer changes", () => {
    expect(reduced.glidingFrames).toBe(0);
    // the only hops are the labels whose slot became impossible at the screen's edge (a plate is never pinned over its box's outline any more): a handful, against the every-frame plan's
    expect(reduced.teleports).toBeLessThan(old.teleports / 4);
    expect(reduced.changes).toBeLessThan(now.changes / 3);
  });
  it("with the glide NO plate teleports over the sweep, and the plates do move (they glide, they are not frozen)", () => {
    expect(now.teleports).toBe(0);
    expect(now.glidingFrames).toBeGreaterThan(50);
    expect(now.maxStep).toBeLessThan(40); // the biggest step of a glide against its box, px: the first frame of the ease-out, 2 / glideMs of the move per ms
  });
  it("the plates are NOT on a grid of cells (they follow the projected boxes to the sub-pixel), and a plate whose slot is kept moves exactly as its box does", () => {
    for (const r of [snap, reduced, now]) {
      expect(r.fractional).toBeGreaterThan(r.shownFrames / 2);
      expect(r.lockstepFrames).toBeGreaterThan(1000);
      expect(r.lockstepErrors).toBe(0);
    }
  });
  it("the sticky plan does not swap places back and forth: far fewer slot changes than the every-frame plan, under two per label", () => {
    expect(now.perLabel).toBeLessThan(2);
    expect(now.changes * 1.5).toBeLessThanOrEqual(old.changes);
  });
  it("no frame starts more glides than a crowded sweep needs", () => {
    expect(now.worstFrame).toBeLessThanOrEqual(16);
  });
  it("at rest every label is exactly at its target: no glide left, none owed, and the plates are as collision-free as the every-frame plan leaves them", () => {
    expect(now.gliding).toBe(0);
    expect(now.atRestError).toBe(0);
    expect(now.settleFrames).toBeLessThan(60); // within a second of the camera stopping
    expect(now.finalOverlaps).toBeLessThanOrEqual(old.finalOverlaps + 1);
  });
});

describe("the position the cut reserved reaches the plan (TrackItem.pref)", () => {
  it("a new label takes it, and keeps it while the plan runs again", () => {
    const t = tracker();
    const items = [box(1, 100, 100, { pref: SPOT.belowRight }), box(2, 400, 100)];
    const first = t.step(0, items, VIEW, INSET);
    expect(first.map((p) => p.cand)).toEqual([SPOT.belowRight, SPOT.aboveLeft]);
    for (let f = 1; f < 40; f++) expect(t.step(f * 16, items, VIEW, INSET).map((p) => p.cand), `frame ${f}`).toEqual([SPOT.belowRight, SPOT.aboveLeft]);
  });
});

describe("a node that was fading out and is wanted again glides from where its plate was drawn (no hop)", () => {
  it("the plate drawn by `follow` at the fallback place does not jump to the planned slot", () => {
    const t = tracker();
    const it = box(1, 100, 100);
    // a node that has no slot yet is followed (fading out): drawn at the fallback above-left of its box
    const fb = t.follow(1000, [{ id: 1, rect: it.rect, size: FULL }], VIEW, INSET)[0]!;
    // wanted again a frame later, with a reserved position that is not the fallback
    const placed = t.step(1016, [{ ...it, pref: SPOT.belowRight }], VIEW, INSET)[0]!;
    expect(placed.cand).toBe(SPOT.belowRight);
    expect(Math.hypot(placed.x - fb.x, placed.y - fb.y)).toBeLessThan(6); // (it starts where it was)
    expect(placed.gx !== 0 || placed.gy !== 0).toBe(true); // and glides
  });
});
