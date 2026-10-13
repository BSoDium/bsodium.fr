import { describe, expect, it } from "vitest";
import { pickNode } from "./hit-area";
import { CLEARANCE, PX_UNITS, UPGRADE_MARGIN, boxesToAvoid, planLabels, pxUnits, smoothUnits, type PlanItem, type PlanResult } from "./label-plan";
import { LOD } from "./lod-tree";
import { SPOT, chipText, labelVariants } from "./pixel-labels";

const GRID = { cols: 600, rows: 400 };
/** A box of `w x h` cells at (x, y) with a label. */
const item = (key: string, x: number, y: number, extra: Partial<PlanItem> & { name?: string; chip?: string | null; w?: number; h?: number } = {}): PlanItem => {
  const { name = "Name", chip = null, w = 40, h = 30, ...rest } = extra;
  return { score: 80, area: w * h, key, rect: { c0: x, r0: y, c1: x + w, r1: y + h }, variants: labelVariants(name, chip).map((v) => v.layout), prev: null, ...rest };
};
const overlaps = (a: PlanResult, b: PlanResult, pad = 0) => a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;

describe("every drawn box has its label: there is no label that loses and no dimmed box", () => {
  it("every item gets a plate, however crowded", () => {
    const items = Array.from({ length: 40 }, (_, k) => item(`n${k}`, 200 + (k % 5) * 6, 150 + Math.floor(k / 5) * 5, { name: "A rather long name here", w: 14, h: 12 }));
    const plan = planLabels(items, GRID);
    expect(plan.length).toBe(40);
    for (const p of plan) {
      expect(p.w).toBeGreaterThan(0);
      expect(p.x >= 0 && p.y >= 0 && p.x + p.w <= GRID.cols && p.y + p.h <= GRID.rows).toBe(true);
    }
  });
  it("an isolated box gets the first position: above its top-left corner, whole", () => {
    const plan = planLabels([item("a", 200, 200, { name: "Houston", chip: chipText(4) })], GRID);
    expect(plan[0]).toMatchObject({ cand: SPOT.aboveLeft, variant: 0, overlap: false, x: 200 });
    expect(plan[0]!.y + plan[0]!.h).toBe(200);
  });
  it("a neighbour's label in the way moves the label to the next free position instead of dropping it", () => {
    const a = item("a", 200, 200, { score: 120, name: "Alpha Beta Gamma" });
    const b = item("b", 210, 205, { score: 80, name: "Delta Epsilon" });
    const plan = planLabels([a, b], GRID);
    expect(plan[0]!.cand).toBe(SPOT.aboveLeft);
    expect(plan[1]!.cand).not.toBe(SPOT.aboveLeft);
    expect(plan[1]!.variant).toBe(0); // still whole: another position was free
    expect(plan[1]!.overlap).toBe(false);
    expect(overlaps(plan[0]!, plan[1]!, CLEARANCE)).toBe(false);
  });
  it("placed in priority order: the better one gets the first position, whatever the order of the input", () => {
    const a = item("a", 200, 200, { score: 80 });
    const b = item("b", 210, 205, { score: 120 });
    const one = planLabels([a, b], GRID);
    const two = planLabels([b, a], GRID);
    expect(one[1]!.cand).toBe(SPOT.aboveLeft);
    expect(one[0]!.cand).not.toBe(SPOT.aboveLeft);
    expect(two[0]!).toEqual(one[1]!);
    expect(two[1]!).toEqual(one[0]!);
  });
  it("equal scores: the bigger box first, then the key", () => {
    const small = item("a", 200, 200, { w: 20, h: 20 });
    const big = item("b", 205, 205, { w: 60, h: 60 });
    const plan = planLabels([small, big], GRID);
    expect(plan[1]!.cand).toBe(SPOT.aboveLeft);
    const x = item("x", 200, 200);
    const y = item("y", 205, 205);
    expect(planLabels([x, y], GRID)[0]!.cand).toBe(SPOT.aboveLeft);
  });
  it("with no room above (the top of the grid) the label nests inside the box", () => {
    const plan = planLabels([item("a", 100, 3, { w: 200, h: 100, name: "Bulgaria" })], GRID);
    expect(plan[0]!.cand).toBe(SPOT.insideTopLeft);
    expect(plan[0]!.inside).toBe(true);
  });
  it("when no position is free the label is shortened: the counter first, then the name with an ellipsis", () => {
    // a row of boxes whose labels fill the space on every side: only a shorter label fits
    const items: PlanItem[] = [];
    for (let k = 0; k < 9; k++) items.push(item(`n${k}`, 40 + (k % 3) * 55, 60 + Math.floor(k / 3) * 55, { w: 12, h: 12, name: "Western Europe", chip: chipText(6), score: 100 - k }));
    const plan = planLabels(items, { cols: 190, rows: 200 });
    const shortened = plan.filter((p) => p.variant > 0);
    expect(shortened.length).toBeGreaterThan(0);
    for (const p of plan) expect(p.w).toBeGreaterThan(0);
  });
  it("the last resort draws it anyway, on top, and never below six characters", () => {
    // a grid so small that nothing is free next to the first label: the second is drawn over it, as short as it can be
    const a = item("a", 5, 18, { score: 120, name: "Western Europe", w: 12, h: 12 });
    const b = item("b", 10, 18, { score: 80, name: "Eastern Europe", w: 12, h: 12 });
    const plan = planLabels([a, b], { cols: 100, rows: 40 });
    expect(plan[0]!.overlap).toBe(false);
    expect(plan[1]!.overlap).toBe(true);
    const v = labelVariants("Eastern Europe", null)[plan[1]!.variant]!;
    expect(Array.from(v.text).length).toBeGreaterThanOrEqual(6);
    expect(plan[1]!.x >= 0 && plan[1]!.y >= 0 && plan[1]!.x + plan[1]!.w <= 100 && plan[1]!.y + plan[1]!.h <= 40).toBe(true);
  });
  it("a selected node (boosted score) is placed first, ahead of a stronger neighbour", () => {
    const a = item("a", 200, 200, { score: 500, name: "A long name that will want room" });
    const b = item("b", 210, 205, { score: 1000 + 80, name: "Selected Place", chip: chipText(3) });
    const plan = planLabels([a, b], GRID);
    expect(plan[1]).toMatchObject({ cand: SPOT.aboveLeft, variant: 0, overlap: false });
    expect(overlaps(plan[0]!, plan[1]!)).toBe(false);
  });
  it("the plan has no state input but the items: hovering does not exist for it (a hovered label is written longer by the host, around its slot)", () => {
    const items = Array.from({ length: 12 }, (_, k) => item(`n${k}`, 100 + ((k * 37) % 300), 80 + ((k * 53) % 200), { name: `Place ${k}` }));
    expect(planLabels(items, GRID)).toEqual(planLabels(items.map((t) => ({ ...t })), GRID));
  });
  it("deterministic: the same input gives the same plan", () => {
    const items = Array.from({ length: 25 }, (_, k) => item(`n${k}`, 100 + ((k * 37) % 400), 80 + ((k * 53) % 250), { name: `Place number ${k}`, score: 50 + (k % 7) }));
    expect(planLabels(items, GRID)).toEqual(planLabels(items, GRID));
  });
});

describe("one anchor: above the top-left corner, then inside it, the rest are last resorts", () => {
  it("a plate in the way of the above-left position sends the label inside the box's top-left corner, not to the right or below", () => {
    // the blocker's plate sits above its own box, exactly where mine's above-left plate would go
    const blocker = item("blocker", 200, 190, { score: 500, name: "Blocker with a wide name", w: 30, h: 20 });
    const mine = item("mine", 200, 190, { w: 200, h: 120, name: "Mine" });
    const plan = planLabels([blocker, mine], GRID);
    expect(plan[1]!.cand).toBe(SPOT.insideTopLeft);
    expect(plan[1]!.inside).toBe(true);
    expect(plan[1]!.overlap).toBe(false);
  });
  it("the order of the ids is the order of preference: above-left, visible above-left, inside top-left, then the rest", () => {
    expect([SPOT.aboveLeft, SPOT.aboveVisibleLeft, SPOT.insideTopLeft]).toEqual([0, 1, 2]);
    for (const other of [SPOT.aboveRight, SPOT.aboveShift, SPOT.insideTopRight, SPOT.insideBottomLeft, SPOT.belowLeft, SPOT.left, SPOT.right]) expect(other).toBeGreaterThan(SPOT.insideTopLeft);
    expect(SPOT.left).toBeGreaterThan(SPOT.belowShift);
  });
  it("no plate covers its own box's outline, not even the last resort (a plate over other plates is displaced outside the box or nested in it)", () => {
    const items: PlanItem[] = [];
    for (let k = 0; k < 12; k++) items.push(item(`n${k}`, 20 + (k % 4) * 22, 20 + Math.floor(k / 4) * 22, { w: 10, h: 10, name: "A long name here", score: 100 - k }));
    const plan = planLabels(items, { cols: 100, rows: 90 });
    expect(plan.some((p) => p.overlap)).toBe(true);
    plan.forEach((p, n) => {
      const r = items[n]!.rect;
      const covers = p.x < r.c1 && p.x + p.w > r.c0 && p.y < r.r1 && p.y + p.h > r.r0;
      if (covers) expect(p.inside).toBe(true);
    });
  });
});

describe("stable between frames: the previous choice is kept with hysteresis", () => {
  it("a label whose previous choice is still free keeps it unless a better one is free with room to spare", () => {
    const keep = planLabels([item("a", 200, 200, { prev: { variant: 0, cand: SPOT.aboveLeft, dx: 0, dy: -30 } })], GRID)[0]!;
    expect(keep.cand).toBe(SPOT.aboveLeft);
    const up = planLabels([item("a", 200, 200, { prev: { variant: 0, cand: SPOT.belowLeft, dx: 0, dy: 0 } })], GRID)[0]!;
    expect(up.cand).toBe(SPOT.aboveLeft); // nothing in the way: the better position wins
  });
  it("it moves to the better position only when that one is free with UPGRADE_MARGIN cells to spare", () => {
    const prev = { variant: 0, cand: SPOT.aboveRight, dx: 0, dy: 0 };
    const plateW = labelVariants("Mine", null)[0]!.layout.w;
    // a wide box (so the positions are far apart) and a blocker whose own label lands on the same rows, `gap` cells right of where the above-left plate ends
    const run = (gap: number) => planLabels([item("blocker", 200 + plateW + gap, 200, { score: 500, name: "Mine" }), item("mine", 200, 200, { w: 300, prev, name: "Mine" })], GRID)[1]!;
    expect(run(CLEARANCE).cand).toBe(SPOT.aboveRight); // free, but not by enough: it stays
    expect(run(CLEARANCE + UPGRADE_MARGIN - 1).cand).toBe(SPOT.aboveRight);
    expect(run(CLEARANCE + UPGRADE_MARGIN).cand).toBe(SPOT.aboveLeft); // free with room to spare: it moves
    const fresh = planLabels([item("blocker", 200 + plateW + CLEARANCE, 200, { score: 500, name: "Mine" }), item("mine", 200, 200, { w: 300, name: "Mine" })], GRID)[1]!;
    expect(fresh.cand).toBe(SPOT.aboveLeft); // without the memory, the first free position at once
  });
  it("a previous choice that is no longer free is replaced at once", () => {
    const blockerBelow = item("blocker", 200, 232, { score: 500, name: "Under", w: 40, h: 20 });
    const mine = item("mine", 200, 200, { prev: { variant: 0, cand: SPOT.belowLeft, dx: 0, dy: 0 } });
    // the blocker's label (above its box, at y ~ 232 - h) lands on mine's below-left plate
    const plan = planLabels([blockerBelow, mine], GRID);
    expect(plan[1]!.cand).not.toBe(SPOT.belowLeft);
    expect(overlaps(plan[0]!, plan[1]!, CLEARANCE)).toBe(false);
  });
  it("a shortened label is made whole again as soon as there is room, not kept forever", () => {
    const whole = item("a", 200, 200, { name: "Western Europe", chip: chipText(6), prev: { variant: 2, cand: SPOT.aboveLeft, dx: 0, dy: -30 } });
    expect(planLabels([whole], GRID)[0]!.variant).toBe(0);
  });
  it("frame to frame the same input with its own output as the memory gives the same plan (no hopping)", () => {
    const items = Array.from({ length: 30 }, (_, k) => item(`n${k}`, 100 + ((k * 41) % 420), 70 + ((k * 59) % 280), { name: `Somewhere ${k}`, chip: k % 3 ? null : chipText(k), score: 50 + (k % 5) }));
    const first = planLabels(items, GRID);
    const second = planLabels(
      items.map((t, n) => ({ ...t, prev: { variant: first[n]!.variant, cand: first[n]!.cand, dx: first[n]!.x - t.rect.c0, dy: first[n]!.y - t.rect.r0 } })),
      GRID,
    );
    expect(second).toEqual(first);
  });
});

describe("a box is always a target, labelled or not", () => {
  it("a box with no label plate (the target is the box alone) is still picked, at its own opacity", () => {
    const box = { x0: 100, y0: 100, x1: 125, y1: 125 };
    const nameless = { id: 1, box, plate: null, alpha: 1, priority: 50, big: false, slug: "a" };
    expect(pickNode([nameless], 112, 112, "mouse", LOD.pickAlphaMin)).toBe(1);
    expect(pickNode([nameless], 128, 112, "mouse", LOD.pickAlphaMin)).toBe(1); // within the slop
    expect(pickNode([nameless], 140, 112, "mouse", LOD.pickAlphaMin)).toBe(-1);
  });
  it("the hull follows a label that is not above the box: a plate below it is part of the target", () => {
    const box = { x0: 100, y0: 100, x1: 125, y1: 125 };
    const plate = { x0: 100, y0: 125, x1: 190, y1: 150 };
    const t = { id: 2, box, plate, alpha: 1, priority: 50, big: false, slug: "b" };
    expect(pickNode([t], 150, 138, "mouse", LOD.pickAlphaMin)).toBe(2);
  });
});

describe("a label keeps clear of the other nodes' boxes (PlanItem.avoid, boxesToAvoid)", () => {
  const PX = { cols: 1440, rows: 900 };
  const rect = { c0: 600, r0: 400, c1: 623, r1: 423 };
  const variants = labelVariants("Valencia", null).map((v) => v.layout);
  it("the planner takes the first position that touches none of the rectangles it is told to avoid; with none left, the first position of the wording", () => {
    const free = planLabels([{ score: 1, area: 1, key: "p", rect, variants, prev: null }], PX, pxUnits(2.5))[0]!;
    expect(free.cand).toBe(0);
    const avoid = [{ x0: free.x - 5, y0: free.y - 5, x1: free.x + free.w + 5, y1: free.y + free.h + 5 }];
    const moved = planLabels([{ score: 1, area: 1, key: "p", rect, variants, prev: null, avoid }], PX, pxUnits(2.5))[0]!;
    expect(moved.overlap).toBe(false);
    expect(moved.cand).not.toBe(0);
    expect(moved.x < avoid[0]!.x1 && moved.x + moved.w > avoid[0]!.x0 && moved.y < avoid[0]!.y1 && moved.y + moved.h > avoid[0]!.y0).toBe(false);
    // a wall of rectangles all around: no position keeps clear of them, the first one is taken all the same (not a last resort: it is over no plate, and the label is not shortened)
    const wall = [{ x0: 0, y0: 0, x1: 1440, y1: 900 }];
    const walled = planLabels([{ score: 1, area: 1, key: "p", rect, variants, prev: null, avoid: wall }], PX, pxUnits(2.5))[0]!;
    expect(walled.overlap).toBe(false);
    expect(walled.cand).toBe(free.cand);
    expect(walled.variant).toBe(0);
  });
  it("a kept position that lies over another node's box is given up for a clear one even when the clear one has no room to spare", () => {
    const Y = rect.r0;
    const right = { variant: 0, cand: SPOT.right, dx: rect.c1 - rect.c0 + 3, dy: 0 };
    // a plate of another node close to the above-left position (free, but within the upgrade margin) and a box on the kept right position
    const blocker = { score: 500, area: 1, key: "b", rect: { c0: 560, r0: Y + 30, c1: 575, r1: Y + 45 }, variants: labelVariants("Valencia", null).map((v) => v.layout), prev: null };
    const covered = [{ x0: rect.c1 + 5, y0: Y + 2, x1: rect.c1 + 30, y1: Y + 20 }];
    const out = planLabels([blocker, { score: 1, area: 1, key: "p", rect, variants, prev: right, avoid: covered }], PX, pxUnits(2.5));
    expect(out[1]!.cand).not.toBe(SPOT.right);
    expect(out[1]!.overlap).toBe(false);
  });
  it("boxesToAvoid: the other boxes within reach of a node's own box, never its own", () => {
    const boxes = [
      { x0: 100, y0: 100, x1: 130, y1: 130 },
      { x0: 160, y0: 100, x1: 190, y1: 130 }, // 30 px to the right
      { x0: 600, y0: 600, x1: 630, y1: 630 }, // far
    ];
    expect(boxesToAvoid(boxes, 0, 50)).toEqual([boxes[1]]);
    expect(boxesToAvoid(boxes, 0, 10)).toEqual([]);
    expect(boxesToAvoid(boxes, 2, 50)).toEqual([]);
    expect(boxesToAvoid(boxes, 1, 1000)).toEqual([boxes[0], boxes[2]]);
  });
});

describe("the position the cut reserved (PlanItem.pref)", () => {
  it("is taken first when it is free, whatever the order of the positions", () => {
    const plan = planLabels([item("a", 200, 200, { name: "Houston", pref: SPOT.belowRight })], GRID);
    expect(plan[0]).toMatchObject({ cand: SPOT.belowRight, variant: 0, overlap: false });
  });
  it("is not taken when another plate is on it: the usual order", () => {
    // b is placed first (higher score) and sits where a's reserved position would be
    const b = item("b", 200, 236, { score: 120, name: "Beta" });
    const a = item("a", 200, 200, { score: 80, name: "Houston", pref: SPOT.belowLeft });
    const plan = planLabels([a, b], GRID);
    expect(plan[0]!.cand).not.toBe(SPOT.belowLeft);
    expect(plan[0]!.overlap).toBe(false);
    expect(overlaps(plan[0]!, plan[1]!, CLEARANCE)).toBe(false);
  });
  it("is not taken when it touches a neighbour's box (PlanItem.avoid)", () => {
    const avoid = [{ x0: 190, y0: 238, x1: 280, y1: 300 }];
    const plan = planLabels([item("a", 200, 200, { name: "Houston", pref: SPOT.belowLeft, avoid })], GRID);
    expect(plan[0]!.cand).not.toBe(SPOT.belowLeft);
  });
  it("is not a candidate for a wording other than the whole label, and a position off the grid falls back to the usual order", () => {
    const plan = planLabels([item("a", 200, 2, { w: 20, h: 20, name: "Houston", pref: SPOT.aboveLeft })], GRID);
    expect(plan[0]!.y).toBeGreaterThanOrEqual(0);
    expect(plan[0]!.cand).not.toBe(SPOT.aboveLeft);
  });
});

describe("on the art-pixel lattice (pxUnits): every distance is a whole number of cells, so a plate moves with its box cell for cell", () => {
  const onGrid = (v: number, origin: number, cell: number) => Math.abs((v - origin) / cell - Math.round((v - origin) / cell)) < 1e-9;
  it("the units: the gap, the nested inset, the snap along an edge and the last resort's step are whole cells of the art pixel (2.5 px on a desktop, 2 px on a phone)", () => {
    for (const cell of [2.5, 2, 2.667, 3]) {
      const u = pxUnits(cell, -1, 0);
      for (const d of [u.gap, u.inset, u.quant, u.shiftStep]) expect(onGrid(d, 0, cell)).toBe(true);
      expect(u.gap).toBeGreaterThanOrEqual(cell - 1e-9);
      expect(u.gap).toBeLessThanOrEqual(3 + cell); // `LABEL_TYPE.boxGap` (3 px) to the nearest cell, never none
      expect(u.lattice).toEqual({ cell, ox: -1, oy: 0 });
    }
    expect(pxUnits(2.5).gap).toBe(2.5);
    expect(pxUnits(2.5).inset).toBe(5); // the outline's cell plus one more
  });
  it("every position of a plan is on the lattice, whatever the size of the plate and the origin of the grid (a canvas offset by a pixel)", () => {
    const u = pxUnits(2.5, -1, -2);
    const items = Array.from({ length: 30 }, (_, k) => {
      const w = 12.5 + (k % 5) * 7.5;
      const x = -1 + Math.round((60 + k * 31) / 2.5) * 2.5;
      const y = -2 + Math.round((40 + (k * 53) % 300) / 2.5) * 2.5;
      return { score: 50 + (k % 7), area: w * w, key: `n${k}`, rect: { c0: x, r0: y, c1: x + w, r1: y + w }, variants: [{ w: 83.5 + (k % 4), h: 38 }, { w: 61.5, h: 24 }], prev: null };
    });
    const plan = planLabels(items, GRID, u);
    for (const p of plan) {
      expect(onGrid(p.x, -1, 2.5)).toBe(true);
      expect(onGrid(p.y, -2, 2.5)).toBe(true);
    }
  });
  it("a plate above its box leaves at least the gap and less than the gap and one more cell (it is rounded away from the box, never onto it)", () => {
    const u = pxUnits(2.5, 0, 0);
    for (const h of [24, 38, 25, 40]) {
      const rect = { c0: 100, r0: 200, c1: 140, r1: 230 };
      const [p] = planLabels([{ score: 1, area: 1200, key: "a", rect, variants: [{ w: 90, h }], prev: null }], GRID, u);
      expect(p!.cand).toBe(SPOT.aboveLeft);
      const room = rect.r0 - (p!.y + p!.h);
      expect(room).toBeGreaterThanOrEqual(u.gap - 1e-9);
      expect(room).toBeLessThan(u.gap + 2.5);
    }
  });
  it("a plate whose size is whole cells has exactly the gap, on every side", () => {
    const u = pxUnits(2.5, 0, 0);
    const rect = { c0: 100, r0: 200, c1: 140, r1: 230 };
    const [p] = planLabels([{ score: 1, area: 1200, key: "a", rect, variants: [{ w: 90, h: 40 }], prev: null }], GRID, u);
    expect(rect.r0 - (p!.y + p!.h)).toBe(u.gap);
    expect(p!.x).toBe(rect.c0);
  });
});

describe("the last resort: a label that has to be drawn over others keeps its second line unless losing it gets it off another plate", () => {
  const whole = { w: 90, h: 38, sub: "France" };
  const narrow = { w: 60, h: 38, sub: "France" };
  const shortest = { w: 40, h: 24, sub: null };
  const grid = { cols: 200, rows: 100 };
  const rect = { c0: 80, r0: 40, c1: 100, r1: 60 };
  /** Every plate position of the plan overlaps this wall: the label is a last resort whichever way it is written. */
  const wall = (x0: number, x1: number) => [{ x0, y0: 0, x1, y1: 100 }];
  it("it loses it when that is what gets it off another plate: the shortest way fits the 80 px lane left, the others do not", () => {
    const [p] = planLabels([{ score: 1, area: 400, key: "a", rect, variants: [whole, narrow, shortest], prev: null }], grid, pxUnits(1), [...wall(0, 50), ...wall(130, 200)]);
    expect(p!.variant).toBe(2);
    expect(p!.overlap).toBe(false); // (it fits in the lane that is left: no last resort at all)
  });
  it("it keeps it when the second line costs no more: every way overlaps the wall by the same, the one with the line wins", () => {
    // a wall wider than every way of writing, over the whole grid but the box: all positions overlap by the plate's own area, the taller plate by more
    // (area first), so make the plates the same height: the line is the only difference between the last two ways
    const a = { w: 60, h: 24, sub: "France" };
    const b = { w: 60, h: 24, sub: null };
    const [p] = planLabels([{ score: 1, area: 400, key: "a", rect, variants: [{ w: 90, h: 24, sub: "France" }, a, b], prev: null }], grid, pxUnits(1), [{ x0: 0, y0: 0, x1: 200, y1: 100 }]);
    expect(p!.overlap).toBe(true);
    expect(p!.variant).not.toBe(2); // not the way without its line: same overlap, so the one that keeps it
  });
});

describe("smoothUnits: what the labels are drawn with (no lattice, exact positions around the projected box)", () => {
  it("no lattice, exact shifts, a gap of boxGap plus one cell (the drawn outline is snapped to cells and lies up to a cell outside the projected box)", () => {
    for (const cell of [2, 2.5, 2.667, 3.5]) {
      const u = smoothUnits(cell);
      expect(u.lattice).toBeUndefined();
      expect(u.quant).toBe(0);
      expect(u.gap).toBe(PX_UNITS.gap + cell);
      expect(u.inset).toBeGreaterThan(cell); // the outline's cell and a margin
    }
  });
  it("positions are exact: above the projected top-left corner by the gap, at any fraction", () => {
    const u = smoothUnits(2.5);
    const rect = { c0: 100.37, r0: 203.81, c1: 140.1, r1: 233.2 };
    const [p] = planLabels([{ score: 1, area: 1000, key: "a", rect, variants: [{ w: 83.5, h: 38 }], prev: null }], GRID, u);
    expect(p!.cand).toBe(SPOT.aboveLeft);
    expect(p!.x).toBeCloseTo(100.37, 9);
    expect(rect.r0 - (p!.y + p!.h)).toBeCloseTo(u.gap, 9);
  });
  it("the positions shifted along an edge follow the box continuously (no snap to half a pixel)", () => {
    const u = smoothUnits(2.5);
    const ys: number[] = [];
    for (let k = 0; k < 6; k++) {
      const x0 = 20.1 + k * 0.07;
      const rect = { c0: x0, r0: 3, c1: x0 + 300, r1: 120 }; // no room above: only nested and shifted candidates
      const [p] = planLabels([{ score: 1, area: 1000, key: "a", rect, variants: [{ w: 83.5, h: 38 }], prev: { variant: 0, cand: SPOT.aboveShift + 1, dx: 0, dy: 0 } }], GRID, u);
      ys.push(p!.x);
    }
    // consecutive positions differ by about the box's own 0.07 px (a quarter-pixel snap would make some zero and some 0.5)
    for (let k = 1; k < ys.length; k++) expect(ys[k]! - ys[k - 1]!).toBeLessThan(0.5);
  });
});
