/**
 * Labels that follow their boxes smoothly (pure, unit tested): WHICH slot a label has, WHEN the plan runs, and how a label gets from one
 * slot to the next.
 *
 * `planLabels` (engine/label-plan.ts) puts every label where it collides with nothing. Run on every frame it makes labels flicker: a plate
 * that moves a pixel with the camera frees or takes a position and a neighbour hops left and right. So the plan is not a function of the
 * frame, it is a decision that is kept, and what is DRAWN is not the decision but a follower of it:
 *
 *  1. A label keeps its SLOT (the candidate position and the way of writing it) between plans. Between plans the plate is put at its slot's
 *     place around the box's CURRENT rectangle (`spotAt`), O(1) per label, no collision test: the plate sticks to its box, it never lags.
 *  2. The plan is re-run for ALL labels continuously but at a bounded rate: as soon as a rectangle changed and `TRACK.replanMs` (100 ms) have
 *     passed since the last plan, so at most 10 plans a second while the camera moves, and once more after it stopped (a timer: an idle map
 *     draws no frames, `dueAt`). A plan is sticky (the planner keeps a choice that is still free and gives it up for a better one only when that
 *     one is free with `upgradeMargin` px of room), so slots change rarely, but they change WHEN they have to, in the middle of the motion, not
 *     in a lump after it. While the globe turns on its own (`setDrifting`: 0.02 px a frame) the rectangles change in every frame but only
 *     slightly: a plan is then owed only once a rectangle has moved `keepSlack / 2` px since the last plan (about once a second instead of
 *     ten times), or when the set of labels or the room changed. At the edges of the screen the plate slides along its box (or stays at the screen's edge, over the box) instead of
 *     changing slot (`slide`).
 *  3. A slot change never moves the plate at once. The plate is drawn at `target + glide`: the target is the slot's place around the box NOW,
 *     the glide a remainder (in px, relative to the box) that runs to zero in `TRACK.glideMs` (about 200 ms) on a continuous smoothstep curve
 *     (ease-in-out), a function of time only (the same path at any frame rate). Plates and boxes move continuously: the host gives the PROJECTED rectangle
 *     of a box (not the one snapped to art cells), so while a slot is kept the plate follows its box exactly, to the sub-pixel, and with the
 *     earth spinning the labels glide instead of stepping by a cell (2026-10-13; on 2026-10-12 they moved in whole-cell steps and the owner
 *     took that back). A re-plan that changes a slot sets the glide to "where the plate was minus the new target", so the plate stays where
 *     it is and sets off for the new place from there. The glide is relative to the box: a moving box takes its plate along. A lattice and a
 *     staircase are still available (`PlanUnits.lattice`, `TRACK.stepMs` > 0), unused. Reduced motion (`instant`): no glide, and the plan runs
 *     only once the camera has stopped (a plan that moves a label would be a hop).
 *  4. A label that has no slot yet (its node just appeared) or whose slot became impossible (it would leave the screen, a nested label no longer
 *     fits its box) is placed at once, in the free places left by the labels that stay (`planLabels` with the others as `fixed` plates: their
 *     TARGETS): a drawn box always has its label, and a new label never displaces another. A new label has no glide (the node's fade shows it).
 *  5. Appearing and disappearing stays binary and timed (the node's own fade, engine/fade.ts); the text variants (whole / shortened) have the
 *     planner's hysteresis (`upgradeMargin`) and change only in a plan.
 *  5b. The last plan of a move runs at rest (the camera stopped for `restMs`): the dwell is over and the upgrade margin is 0, so every label
 *     ends on its FIRST free position (above its top-left corner, else inside it), never on a worse one it kept for want of room to spare.
 *  6. At rest (every glide is over) the glide is exactly 0: every label is at its target. `gliding` counts the labels that are not yet
 *     there; the host keeps its frame loop going while it is not 0 and not a frame longer.
 *
 * Hover, focus and selection are NOT inputs of the plan, and they change neither the text nor the size of a label (the plate is inverted when
 * selected, nothing else): moving the pointer never moves a label.
 */
import { occupied, planLabels, type PlanItem, type PlanUnits, type Plate, type Prev, type Sized } from "./label-plan";
import { HASH_SEED, hashStep, spotAt, type CellRect, type GridSize } from "./pixel-labels";

export const TRACK = {
  /** Least time between two plans while the rectangles change (ms); the plan owed after the last change runs this long after the previous one. */
  replanMs: 100,
  /** How long a glide takes, from the frame the slot changed (ms): the plate has arrived exactly `glideMs` later, on a smoothstep (ease-in-out) curve. */
  glideMs: 200,
  /** 0: the glide is continuous. More: a staircase that changes at most once per this many ms (with a lattice, whole cells): the 2026-10-12 version had 36, taken back on 2026-10-13. */
  stepMs: 0,
  /** While the camera moves, a slot is kept at least this long (ms) unless it stops being free: a better position is taken only after it, so a crowd that shifts as the camera moves cannot make labels swap places back and forth (it is longer than a glide). */
  dwellMs: 350,
  /** No rectangle changed for this long (ms): the camera has stopped and the dwell is over, the next plan puts every label at its best place. */
  restMs: 160,
  /** A label that was not stepped for this long (ms) has no glide to continue (it was out of view). */
  staleMs: 1500,
  /** A label that was drawn this recently (ms) as a node fading out (`follow`) and is wanted again glides from where it was: a frame or two, a hitch included. */
  shownMs: 100,
} as const;

/**
 * When a rectangle counts as moving (the host draws labels at their exact sub-pixel positions while it does, and rounded to device pixels once nothing
 * moves): a SPEED, not a distance per frame, so the answer is the same at 30, 60 and 144 fps and on any screen. The idle rotation (0.2 degrees a second)
 * moves a box on a phone about 0.5 px a second, 0.008 px a frame: it must stay on the sub-pixel path, while a float that wobbles in its last digits (a
 * thousandth of a px at most) or a camera that stopped is far under the speed.
 */
export const MOTION = {
  /** Least speed of a rectangle's edge that is motion (px/s). */
  pxPerSec: 0.05,
  /** The interval a speed is measured over is held within these (ms): two runs in the same instant must not turn a rounding error into a speed, and a long pause must not hide a jump. */
  minDtMs: 4,
  maxDtMs: 100,
} as const;

/** The distance (px) an edge may have moved in `dtMs` and still not be moving (`MOTION`). */
export function motionLimitPx(dtMs: number): number {
  return (MOTION.pxPerSec * Math.min(MOTION.maxDtMs, Math.max(MOTION.minDtMs, dtMs))) / 1000;
}

export type TrackOptions = { [K in keyof typeof TRACK]: number };

/** What every node remembers between frames: the slot of its label and its glide. Shared by the overlays of one tree, so a handover keeps the labels where they were. */
export class SlotMemory {
  readonly set: Uint8Array;
  readonly variant: Uint8Array;
  readonly cand: Int16Array;
  /** The plate's offset from its box's top-left corner (what a label drawn over others keeps). */
  readonly dx: Float32Array;
  readonly dy: Float32Array;
  /** Identity of the list of ways of writing the label it was chosen from. */
  readonly vkey: Int32Array;
  /** The glide: where the plate is minus where its slot is (px, relative to the box), as drawn. 0 at rest. */
  readonly gx: Float64Array;
  readonly gy: Float64Array;
  /** The glide as it started (px, relative to the box), and the clock of its start (ms). */
  readonly g0x: Float64Array;
  readonly g0y: Float64Array;
  readonly gt: Float64Array;
  /** Where the plate was drawn at the last step, relative to its box's top-left corner (the slot's place plus the glide). */
  readonly ox: Float64Array;
  readonly oy: Float64Array;
  /** The clock of the last step that drew the label (ms), and of the last time its slot changed. */
  readonly seen: Float64Array;
  readonly since: Float64Array;

  constructor(size: number) {
    const n = Math.max(1, size);
    this.set = new Uint8Array(n);
    this.variant = new Uint8Array(n);
    this.cand = new Int16Array(n);
    this.dx = new Float32Array(n);
    this.dy = new Float32Array(n);
    this.vkey = new Int32Array(n);
    this.gx = new Float64Array(n);
    this.gy = new Float64Array(n);
    this.g0x = new Float64Array(n);
    this.g0y = new Float64Array(n);
    this.gt = new Float64Array(n);
    this.ox = new Float64Array(n);
    this.oy = new Float64Array(n);
    this.seen = new Float64Array(n);
    this.since = new Float64Array(n);
  }

  prev(i: number): Prev | null {
    return this.set[i] ? { variant: this.variant[i]!, cand: this.cand[i]!, dx: this.dx[i]!, dy: this.dy[i]! } : null;
  }
}

export interface TrackItem {
  /** Index of the node (the slot in the memory). */
  id: number;
  key: string;
  rect: CellRect;
  score: number;
  area: number;
  variants: readonly Sized[];
  /** Changes whenever the list of ways of writing the label changes (its text); a changed list forgets the slot's variant. */
  vkey: number;
  /** The rectangles the plate must also stay clear of when it is planned (`PlanItem.avoid`: the other nodes' boxes), built only for a node that is planned. */
  avoid?: (() => readonly Plate[]) | undefined;
  /** The candidate the cut reserved for the plate (`PlanItem.pref`). */
  pref?: number | undefined;
  /** The label is selected: the room of its card (flush with the box) is kept clear too (`PlanItem.reserve`). */
  reserve?: boolean | undefined;
}

export interface Placed {
  variant: number;
  cand: number;
  /** Where the plate is DRAWN: its slot's place plus the glide. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** What is left of the glide (px): drawn minus slot place. Both 0 at rest. */
  gx: number;
  gy: number;
  inside: boolean;
  /** Drawn over other plates (nothing was free): the last resort. */
  overlap: boolean;
  /** Its slot (position or way of writing) is not the one it had in the previous step: a new label, or one a re-plan moved. */
  moved: boolean;
  /** It had no slot before (a node that just appeared, or whose text changed). */
  fresh: boolean;
}

export interface StepInfo {
  /** The rectangles changed since the previous step: the camera is moving (or the cut changed). */
  changed: boolean;
  /** A re-plan of every label ran in this step. */
  full: boolean;
  /** Labels that were placed in the gaps of the others in this step (new, or with an impossible slot). */
  partial: number;
}

/** How a label's place was decided in this step: fresh (no glide), a new slot (the plate sets off from where it is), the same slot (the glide goes on). */
type Move = "fresh" | "retarget" | "keep";

/**
 * What is left of a glide that started `elapsedMs` ago with the offset `g0` (px, one axis): an ease-in-out curve (smoothstep) over `TRACK.glideMs`, continuous
 * (or, when `stepMs` > 0, sampled on a staircase in time) and, when `cell` > 0, rounded to whole cells of `cell` px. Exactly `g0` at the start,
 * exactly 0 from `glideMs` on, monotone in between and never past 0 (a function of time only: the same at any frame rate).
 */
export function glideRemainder(g0: number, elapsedMs: number, cell: number, o: { glideMs: number; stepMs: number } = TRACK): number {
  if (!(elapsedMs < o.glideMs)) return 0;
  const t = Math.max(0, elapsedMs);
  const sampled = o.stepMs > 0 ? Math.floor(t / o.stepMs) * o.stepMs : t;
  const u = sampled / o.glideMs;
  const r = g0 * (1 - u * u * (3 - 2 * u)); // smoothstep: it sets off from rest and comes to rest, the share of the move that is left
  return cell > 0 ? Math.round(r / cell) * cell + 0 : r;
}

export class LabelTracker {
  private sig = NaN;
  private lastFull = -Infinity;
  private owed = false;
  /** The plan that is owed is owed only because the set of labels changed (a drifting globe): it is cancelled when the set is the planned one again and nothing moved. */
  private owedBySet = false;
  private lastChange = -Infinity;
  /** Where every rectangle was (c0, r0, c1, r1 per node id; NaN: none) when it was last planned, and the identity of the set of labels and room then: what a drift is measured from. */
  private anchor: Float64Array;
  private planSet = NaN;
  /** The identity of the set of labels at the previous step, and when it last changed (a drifting globe only plans a changed set after `replanMs` of it staying changed). */
  private prevSet = NaN;
  private setAt = -Infinity;
  /** The art cell of the lattice of the step in progress (CSS px; 0: none), set by `step` and `follow`. */
  private cell = 0;
  private snapOnce = false;
  /** This step ends every glide (`settleNow`). */
  private snap = false;
  private count = 0;
  /** Reduced motion: no glide, a label is where its slot is. */
  instant = false;
  /**
   * The camera is turning without a pause but slowly (the idle rotation): a box moves one art cell only every second or so, so "no rectangle changed
   * for `restMs`" would read as a camera at rest between two cell steps and run a plan with no upgrade margin and no dwell, in which a label takes
   * its best slot back the moment a neighbour's cell jitter frees it (and loses it at the next step): two labels swapping places for as long as the
   * globe turns, 10 to 50 times a minute at 0.15 to 0.6 degrees a second. While this is set the camera counts as moving (`setDrifting`).
   */
  private drifting = false;
  info: StepInfo = { changed: false, full: false, partial: 0 };

  constructor(
    readonly mem: SlotMemory,
    private units: PlanUnits,
    private opts: TrackOptions = TRACK,
  ) {
    this.anchor = new Float64Array(mem.set.length * 4).fill(NaN);
  }

  /** When the re-plan that is owed is due (ms on the clock of `step`), or null when none is. The host arms a timer for it: an idle map draws no frames. */
  get dueAt(): number | null {
    if (!this.owed) return null;
    let due = this.lastFull + this.opts.replanMs;
    if (this.drifting) due = Math.max(due, this.setAt + this.opts.replanMs);
    return this.instant ? Math.max(due, this.lastChange + this.opts.restMs) : due;
  }

  /** Labels that have not arrived at their slot yet after the last step: the host keeps drawing frames while this is not 0. */
  get gliding(): number {
    return this.count;
  }

  /** The camera is (or is no longer) turning slowly and continuously. When it stops, the plan at rest is owed (every label settles on its best place). */
  setDrifting(on: boolean): void {
    if (on === this.drifting) return;
    this.drifting = on;
    if (!on) this.owe();
  }

  /** Run the owed plan at the next step whatever the time, and end every glide (checks, and a host that knows the camera is at rest and wants the final picture). */
  settleNow(): void {
    this.lastFull = -Infinity;
    this.lastChange = -Infinity;
    this.owe();
    this.snapOnce = true;
  }

  /** A plan is owed (for a reason that nothing cancels). */
  private owe(): void {
    this.owed = true;
    this.owedBySet = false;
  }

  /** Forget that a plan is owed (the host is parked, or the tree changed under it). */
  reset(): void {
    this.sig = NaN;
    this.owed = false;
    this.owedBySet = false;
    this.count = 0;
    this.planSet = NaN;
    this.prevSet = NaN;
    this.anchor.fill(NaN);
  }

  /** Has any rectangle of `items` moved (or resized) by `limit` px or more since it was planned? A node that was never planned has. */
  private drifted(items: readonly TrackItem[], limit: number): boolean {
    const a = this.anchor;
    for (const it of items) {
      const o = it.id * 4;
      const r = it.rect;
      if (!(Math.abs(r.c0 - a[o]!) < limit && Math.abs(r.r0 - a[o + 1]!) < limit && Math.abs(r.c1 - a[o + 2]!) < limit && Math.abs(r.r1 - a[o + 3]!) < limit)) return true;
    }
    return false;
  }

  /** Remember where the rectangle of `it` was when it was planned. */
  private anchorAt(it: TrackItem): void {
    const o = it.id * 4;
    const a = this.anchor;
    a[o] = it.rect.c0;
    a[o + 1] = it.rect.r0;
    a[o + 2] = it.rect.c1;
    a[o + 3] = it.rect.r1;
  }

  /**
   * Where a label is drawn: its slot's place `(x, y)` (container px, on the lattice when the units carry one) around the box `rect`, plus its glide as of time `t`.
   * Writes the glide and where the plate is (relative to its box) into the memory.
   */
  private place(t: number, i: number, rect: CellRect, x: number, y: number, kind: Move): { x: number; y: number; gx: number; gy: number } {
    const mem = this.mem;
    const o = this.opts;
    const tx = x - rect.c0;
    const ty = y - rect.r0;
    if (this.instant || this.snap || kind === "fresh" || t - mem.seen[i]! > o.staleMs) {
      mem.g0x[i] = mem.g0y[i] = mem.gx[i] = mem.gy[i] = 0;
    } else if (kind === "retarget") {
      // the plate stays where it was (relative to its box) and sets off for the new place from there
      mem.g0x[i] = mem.ox[i]! - tx;
      mem.g0y[i] = mem.oy[i]! - ty;
      mem.gt[i] = t;
    }
    if (mem.g0x[i] !== 0 || mem.g0y[i] !== 0) {
      const elapsed = t - mem.gt[i]!;
      const gx = glideRemainder(mem.g0x[i]!, elapsed, this.cell, o);
      const gy = glideRemainder(mem.g0y[i]!, elapsed, this.cell, o);
      if (gx === 0 && gy === 0) {
        mem.g0x[i] = mem.g0y[i] = mem.gx[i] = mem.gy[i] = 0;
      } else {
        mem.gx[i] = gx;
        mem.gy[i] = gy;
        this.count++;
      }
    }
    mem.ox[i] = tx + mem.gx[i]!;
    mem.oy[i] = ty + mem.gy[i]!;
    mem.seen[i] = t;
    return { x: x + mem.gx[i]!, y: y + mem.gy[i]!, gx: mem.gx[i]!, gy: mem.gy[i]! };
  }

  /**
   * One step at time `t` (ms): the labels of `items` for the rectangles they have NOW. `grid` is the room (CSS px); `result[n]` belongs to `items[n]`.
   * Items are the nodes the cut wants drawn. `units` is the nested label's distance from the box's edge (a number), or the distances of this
   * frame (`smoothUnits(cell)`: they depend on the art cell; with a lattice, `pxUnits(cell, left, top)`, the plates move in whole cells). Call `follow` after it, in the same frame, for the
   * nodes that are fading out.
   */
  step(t: number, items: readonly TrackItem[], grid: GridSize, units_: number | Partial<PlanUnits>): Placed[] {
    const mem = this.mem;
    const units: PlanUnits = { ...this.units, ...(typeof units_ === "number" ? { inset: units_ } : units_) };
    this.cell = units.lattice?.cell ?? 0;
    this.count = 0;
    this.snap = this.snapOnce;
    this.snapOnce = false;
    // Did the rectangles change? (rounded: a float that wobbles in its last digits is not motion)
    // (`set`: which labels, in which room, without where they are: what a plan owed by a drift must not have changed)
    let set = hashStep(hashStep(HASH_SEED, grid.cols * 4096 + grid.rows), items.length);
    let h = set;
    for (const it of items) {
      set = hashStep(set, it.id);
      h = hashStep(hashStep(h, it.id), Math.round(it.rect.c0 * 4) * 8192 + Math.round(it.rect.r0 * 4));
      h = hashStep(h, Math.round(it.rect.c1 * 4) * 8192 + Math.round(it.rect.r1 * 4));
    }
    const changed = h !== this.sig;
    this.sig = h;
    if (set !== this.prevSet) {
      if (this.prevSet === this.prevSet) this.setAt = t; // (not the first step, or the first after a reset)
      this.prevSet = set;
    }
    if (changed) {
      this.lastChange = t;
      // A globe that turns on its own moves every rectangle a little in every frame: a plan is owed when one has moved far enough to matter to a
      // kept slot (`keepSlack`, half of it) since the last plan, not for every quantum of motion. Everything else owes it at once.
      const far = !this.drifting || this.drifted(items, units.keepSlack / 2);
      if (!this.owed) {
        if (far) this.owe();
        else if (set !== this.planSet) {
          this.owe();
          this.owedBySet = true;
        }
      } else if (this.owedBySet && set === this.planSet && !far) {
        this.owed = false; // the node that was away is back and nothing moved: the plan it owed has nothing to do
        this.owedBySet = false;
      }
    }
    const moving = this.drifting || t - this.lastChange < this.opts.restMs;
    // reduced motion has no glide, so a plan that moves a label is a hop: it runs only when the camera has stopped (as the labels did before they had a glide)
    // A turning globe plans a changed set of labels (a node comes or goes: the limb, a group opening) only after it has stayed changed for `replanMs`: a
    // node that is away for a few frames (its group opens and closes again) must not send every label elsewhere and back (the node that comes is
    // labelled at once in the gaps, as ever; the others keep their slots meanwhile).
    const settled = !this.drifting || t - this.setAt >= this.opts.replanMs;
    const full = this.owed && t - this.lastFull >= this.opts.replanMs && settled && !(this.instant && moving);
    if (full) {
      this.owed = false;
      this.owedBySet = false;
      this.lastFull = t;
      this.planSet = set;
    }

    // Slots that stay: remembered, still possible. Everything else is planned.
    const out: Placed[] = new Array(items.length);
    const plan: number[] = [];
    const fixed: Plate[] = [];
    const at = { x: 0, y: 0, inside: false };
    const before = items.map((it) => (mem.set[it.id] ? { cand: mem.cand[it.id]!, variant: mem.variant[it.id]!, dx: mem.dx[it.id]!, dy: mem.dy[it.id]! } : null));
    for (let n = 0; n < items.length; n++) {
      const it = items[n]!;
      const i = it.id;
      if (mem.set[i] && mem.vkey[i] !== it.vkey) mem.set[i] = 0; // the text changed: its slot is meaningless
      if (full || !mem.set[i] || mem.variant[i]! >= it.variants.length) {
        plan.push(n);
        continue;
      }
      const v = mem.variant[i]!;
      const { w, h: hh } = it.variants[v]!;
      let x: number;
      let y: number;
      let inside = false;
      let ok: boolean;
      if (mem.cand[i]! >= 0) {
        ok = spotAt(mem.cand[i]!, it.rect, w, hh, grid, { inset: units.inset, quant: units.quant, gap: units.gap, bleed: units.bleed, bleedY: units.bleedY, lattice: units.lattice, slide: true }, at);
        x = at.x;
        y = at.y;
        inside = at.inside;
      } else {
        x = it.rect.c0 + mem.dx[i]!;
        y = it.rect.r0 + mem.dy[i]!;
        ok = x >= 0 && y >= 0 && x + w <= grid.cols && y + hh <= grid.rows;
      }
      if (!ok) {
        plan.push(n); // would leave the screen, or no longer fits: replaced at once
        continue;
      }
      const d = this.place(t, i, it.rect, x, y, "keep");
      out[n] = { variant: v, cand: mem.cand[i]!, x: d.x, y: d.y, w, h: hh, gx: d.gx, gy: d.gy, inside, overlap: mem.cand[i]! < 0, moved: false, fresh: false };
      fixed.push(occupied(x, y, w, hh, it.reserve && mem.cand[i]! >= 0 ? mem.cand[i]! : -1, units)); // the slot's place, not the drawn one: the plan keeps clear of where a plate WILL be (and of the selected card's)
    }
    let held = false; // a plan ran while a choice was still young: it is owed again once the youngest is old enough
    if (plan.length) {
      const sub: PlanItem[] = plan.map((n) => {
        const it = items[n]!;
        return { score: it.score, area: it.area, key: it.key, rect: it.rect, variants: it.variants, prev: mem.prev(it.id), hold: moving && mem.set[it.id] === 1 && t - mem.since[it.id]! < this.opts.dwellMs, avoid: it.avoid?.(), pref: it.pref, reserve: it.reserve };
      });
      // At rest nothing moves, so a better place needs no room to spare to be taken: labels settle on their first free position (the one anchor)
      const planUnits: PlanUnits = full && !moving ? { ...units, upgradeMargin: 0 } : units;
      const res = planLabels(sub, grid, planUnits, full ? [] : fixed);
      plan.forEach((n, k) => {
        const it = items[n]!;
        const p = res[k]!;
        const i = it.id;
        const fresh = !mem.set[i];
        const b = before[n]!;
        // a new slot: another position, or, for the last resort, another displacement
        // (a label that was on the screen a frame ago as a node fading out, `follow`, and is wanted again has no slot but a place: it glides from there)
        const shown = mem.seen[i]! > 0 && t - mem.seen[i]! < this.opts.shownMs;
        const kind: Move = fresh ? (shown ? "retarget" : "fresh") : b && (b.cand !== p.cand || (p.cand < 0 && (Math.abs(b.dx - (p.x - it.rect.c0)) > 0.01 || Math.abs(b.dy - (p.y - it.rect.r0)) > 0.01))) ? "retarget" : "keep";
        const changedSlot = fresh || !b || b.cand !== p.cand || b.variant !== p.variant;
        if (changedSlot) mem.since[i] = t;
        else if (full && moving && t - mem.since[i]! < this.opts.dwellMs) held = true;
        mem.set[i] = 1;
        mem.variant[i] = p.variant;
        mem.cand[i] = p.cand;
        mem.dx[i] = p.x - it.rect.c0;
        mem.dy[i] = p.y - it.rect.r0;
        mem.vkey[i] = it.vkey;
        const d = this.place(t, i, it.rect, p.x, p.y, kind);
        out[n] = { variant: p.variant, cand: p.cand, x: d.x, y: d.y, w: p.w, h: p.h, gx: d.gx, gy: d.gy, inside: p.inside, overlap: p.overlap, moved: changedSlot, fresh };
      });
    }
    if (full) for (const it of items) this.anchorAt(it);
    else for (const n of plan) this.anchorAt(items[n]!);
    if (held) this.owe();
    // a plan that ran while the camera was still moving (and kept slots from before) is followed by one at rest (the dwell is over, the upgrade margin is 0): every label ends on its best place
    if (full && moving && !this.drifting && before.some((b) => b !== null)) this.owe();
    this.info = { changed, full, partial: full ? 0 : plan.length };
    return out;
  }

  /**
   * The labels of nodes that are fading out (not planned): the slot they had, followed to their box, with the glide they had going on. Same
   * frame as `step` (it uses the step's clock). `result[n]` belongs to `items[n]`.
   */
  follow(t: number, items: readonly { id: number; rect: CellRect; size: Sized }[], grid: GridSize, units_: number | Partial<PlanUnits>): { x: number; y: number; gx: number; gy: number }[] {
    const units: PlanUnits = { ...this.units, ...(typeof units_ === "number" ? { inset: units_ } : units_) };
    this.cell = units.lattice?.cell ?? 0;
    return items.map((it) => {
      const p = slotSpot(this.mem, it.id, it.rect, it.size, grid, units);
      // a slot that is not possible any more puts the plate at the fallback place: a new place, reached by gliding
      return this.place(t, it.id, it.rect, p.x, p.y, !this.mem.set[it.id] ? "fresh" : p.ok ? "keep" : "retarget");
    });
  }
}

/**
 * Where the plate of a label that is not being planned (a node fading out) is, from the slot it had: around its current rectangle, else
 * above-left, clamped to the room.
 */
export function slotPosition(mem: SlotMemory, id: number, rect: CellRect, size: Sized, grid: GridSize, units: PlanUnits): { x: number; y: number } {
  const { x, y } = slotSpot(mem, id, rect, size, grid, units);
  return { x, y };
}

/** `slotPosition`, and whether the position is the slot's own (false: the fallback above-left of the box, the slot is not possible any more). */
function slotSpot(mem: SlotMemory, id: number, rect: CellRect, size: Sized, grid: GridSize, units: PlanUnits): { x: number; y: number; ok: boolean } {
  const at = { x: 0, y: 0, inside: false };
  if (mem.set[id]) {
    if (mem.cand[id]! >= 0) {
      if (spotAt(mem.cand[id]!, rect, size.w, size.h, grid, { ...units, slide: true }, at)) return { x: at.x, y: at.y, ok: true };
    } else return { x: rect.c0 + mem.dx[id]!, y: rect.r0 + mem.dy[id]!, ok: true };
  }
  return { x: rect.c0, y: rect.r0 - size.h, ok: false };
}
