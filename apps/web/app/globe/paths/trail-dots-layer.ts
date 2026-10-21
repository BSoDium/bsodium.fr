/**
 * The canvas of the patterned legs (paths/trail-dots.ts) and the sparks at their heads: a `cols x rows` canvas of the map's own art cells
 * scaled up with nearest-neighbour, the same grid the boxes are drawn on, under them. Colours are the trail's solid palette (globe/paths/trail.ts):
 * the gradient's bands along a leg, the lit colour along the selected place's legs, the spark at a head.
 *
 * The sparks (a cell at the destination, a plus when lit) are drawn only from `SPARK_FROM_ZOOM`: from far away they are noise, up close they sit
 * inside the place's box.
 */
import type { TrailRgb } from "./trail";
import { TRAIL_BANDS, trailIndex } from "./trail";
import { isLegMode } from "./modes";
import { legCells } from "./trail-dots";
import { BADGE_PX, badgeElement, hasIcon } from "./mode-icons";
import { ARC_LIFT_PER_RADIAN } from "./network";
import { STRAIGHT_FADE_MIX, STRAIGHT_FADE_STEPS } from "./thin";

type LonLat = [number, number];
export interface DotLeg {
  key: string;
  mode: ReturnType<typeof modeOf>;
  parts: LonLat[][];
  /** The destination. */
  head: LonLat;
  /** How high above the surface the middle of the leg is on the globe, in radii (0 for a leg that follows a path on the ground). */
  arcLift: number;
}
const modeOf = (m: unknown) => (isLegMode(m) ? m : "unknown");

/** Map zoom from which the sparks are drawn (a region's scale: the places have their own boxes by then). */
export const SPARK_FROM_ZOOM = 6.5;
/** Map zoom from which the legs wear the picture of their mode, how long (art pixels) a leg must be to wear one, and the air kept between two pictures. */
export const ICON_FROM_ZOOM = 5.5;
/** The share of the view's smaller side (in art pixels) a leg must span to wear a picture, and the selected place's legs (they may be shorter). */
export const ICON_MIN_SHARE = 0.3;
export const ICON_MIN_SHARE_LIT = 0.18;
export const ICON_GAP = 3;
/** Map zoom from which a rail's cross-ticks are drawn (before it a rail is a dashed line, as on the globe: `paths/lod.ts` `TICK_FROM`). */
export const TICK_FROM_STREET = 6.5;

/** The point `d` art pixels along the pieces of a leg, or null. */
function pointAt(parts: ReadonlyArray<ReadonlyArray<readonly [number, number]>>, d: number): { x: number; y: number } | null {
  let left = d;
  for (const part of parts) {
    for (let i = 1; i < part.length; i++) {
      const len = Math.hypot(part[i]![0] - part[i - 1]![0], part[i]![1] - part[i - 1]![1]);
      if (left <= len && len > 0) {
        const t = left / len;
        return { x: part[i - 1]![0] + (part[i]![0] - part[i - 1]![0]) * t, y: part[i - 1]![1] + (part[i]![1] - part[i - 1]![1]) * t };
      }
      left -= len;
    }
  }
  return null;
}

/** The legs of `legFeatures` as drawable legs: their pieces and their destination. */
export function dotLegs(fc: GeoJSON.FeatureCollection<GeoJSON.MultiLineString>): DotLeg[] {
  return fc.features.map((f) => {
    const parts = f.geometry.coordinates as LonLat[][];
    const last = parts[parts.length - 1]!;
    const first = parts[0]![0]!;
    const head = last[last.length - 1]!;
    // an arc is lifted `ARC_LIFT_PER_RADIAN` of its angle above the surface at the middle (paths/network.ts)
    const rad = Math.PI / 180;
    const omega = Math.acos(Math.min(1, Math.max(-1, Math.sin(first[1] * rad) * Math.sin(head[1] * rad) + Math.cos(first[1] * rad) * Math.cos(head[1] * rad) * Math.cos((head[0] - first[0]) * rad))));
    return { key: String(f.properties?.key), mode: modeOf(f.properties?.mode), parts, head, arcLift: f.properties?.arc ? ARC_LIFT_PER_RADIAN * omega : 0 };
  });
}

const css = (c: TrailRgb) => `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;

export class TrailDotsLayer {
  readonly canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d");
  private legs: DotLeg[] = [];
  private focus = new Set<string>();
  private trail: readonly TrailRgb[] = [];
  private visible = true;
  private signature = "";
  /** The legs that stay at this zoom (`paths/thin.ts`), or null: all of them. */
  private kept: ReadonlySet<string> | null = null;
  private page: TrailRgb = [1, 1, 1];
  /** The straight legs quietened at this view (`paths/thin.ts` `fadeStraight`), by key with their step; null: none. */
  private quiet: ReadonlyMap<string, number> | null = null;

  /** `lines: false`: the legs' lines are drawn by someone else (the globe's shader); only the pictures of the modes are drawn here. `iconFromZoom`: the zoom (the caller's own) from which they show. */
  constructor(root: HTMLElement, private readonly opts: { lines: boolean; iconFromZoom: number; onTop?: boolean } = { lines: true, iconFromZoom: ICON_FROM_ZOOM }) {
    this.canvas.dataset.trailDots = "";
    this.canvas.setAttribute("aria-hidden", "true");
    Object.assign(this.canvas.style, { position: "absolute", left: "0", top: "0", pointerEvents: "none", imageRendering: "pixelated" });
    // under the boxes of the street map's overlay, or over the globe's own canvas
    Object.assign(this.badges.style, { position: "absolute", left: "0", top: "0", width: "0", height: "0", pointerEvents: "none", overflow: "visible" });
    this.badges.dataset.legBadges = "";
    this.badges.setAttribute("aria-hidden", "true");
    if (opts.onTop) root.append(this.canvas, this.badges);
    else root.prepend(this.canvas, this.badges);
  }

  private left = 0;
  private top = 0;
  /** The badges (DOM, full resolution) over the canvas: `mode-icons.ts`. */
  private readonly badges = document.createElement("div");
  /** Where the canvas sits in its container (CSS px), when it is not at the corner. */
  setOrigin(left: number, top: number) {
    if (left === this.left && top === this.top) return;
    this.left = left;
    this.top = top;
    this.canvas.style.left = `${left}px`;
    this.canvas.style.top = `${top}px`;
    this.badges.style.left = `${left}px`;
    this.badges.style.top = `${top}px`;
  }

  /** Take both elements out of the page. */
  dispose() {
    this.canvas.remove();
    this.badges.remove();
  }

  setLegs(legs: DotLeg[]) {
    this.legs = legs; // roads too (their line is MapLibre's; their head's spark and their picture are drawn here): their line is MapLibre's, but their head's spark is drawn here (legCells gives a road no cells)
    this.signature = "";
  }
  setFocus(keys: readonly string[]) {
    if (keys.length === this.focus.size && keys.every((k) => this.focus.has(k))) return;
    this.focus = new Set(keys);
    this.signature = "";
  }
  setKept(keys: ReadonlySet<string> | null) {
    if (keys === this.kept) return;
    this.kept = keys;
    this.signature = "";
  }
  setQuiet(map: ReadonlyMap<string, number> | null) {
    if (map === this.quiet) return;
    this.quiet = map;
    this.signature = "";
  }
  setPage(rgb: TrailRgb) {
    this.page = rgb;
    this.signature = "";
  }
  setTrail(colors: readonly TrailRgb[]) {
    this.trail = colors;
    this.signature = "";
  }
  setVisible(on: boolean) {
    if (on === this.visible) return;
    this.visible = on;
    this.signature = "";
    // hidden: nothing may stay on screen (the next `draw` only comes when the lines are back, so the pictures and the dots are cleared now)
    if (!on) {
      this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.badges.replaceChildren();
    }
  }

  /** Draw for a camera: `project` gives container CSS px, `camera` is anything that changes when the view does (it keys the redraw). */
  draw(project: (p: LonLat, lift: number) => { x: number; y: number } | null, w: number, h: number, cell: number, zoom: number, camera: string, liftScale = 0) {
    const ctx = this.ctx;
    if (!ctx || this.trail.length === 0) return;
    const cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    const sig = `${camera}|${cols}x${rows}@${cell}|${this.visible ? 1 : 0}`;
    if (sig === this.signature) return;
    this.signature = sig;
    if (this.canvas.width !== cols || this.canvas.height !== rows) {
      this.canvas.width = cols;
      this.canvas.height = rows;
    }
    this.canvas.style.width = `${cols * cell}px`;
    this.canvas.style.height = `${rows * cell}px`;
    ctx.clearRect(0, 0, cols, rows);
    this.badges.replaceChildren();
    if (!this.visible || this.legs.length === 0) return;
    const color = (band: number | "lit" | "spark") => css(this.trail[trailIndex(0, band)]!);
    const ink = (col: number, row: number, fill: string) => {
      if (col < 0 || row < 0 || col >= cols || row >= rows) return;
      ctx.fillStyle = fill;
      ctx.fillRect(col, row, 1, 1);
    };
    interface Candidate {
      leg: DotLeg;
      lit: boolean;
      length: number;
      parts: Array<Array<readonly [number, number]>>;
    }
    const candidates: Candidate[] = [];
    for (const leg of this.legs) {
      if (this.kept && !this.kept.has(leg.key) && !this.focus.has(leg.key)) continue;
      const lit = this.focus.has(leg.key);
      // the leg's points on the canvas, split where the planet hides them; an arc is lifted by sin(pi t) of its apex
      const total = leg.parts.reduce((n, part) => n + part.length, 0);
      let seen = 0;
      const parts: Array<Array<readonly [number, number]>> = [];
      for (const part of leg.parts) {
        let cur: Array<readonly [number, number]> = [];
        for (const p of part) {
          const t = total > 1 ? seen / (total - 1) : 0;
          seen++;
          const s = project(p, leg.arcLift * liftScale * Math.sin(Math.PI * t));
          if (s) cur.push([s.x / cell, s.y / cell]);
          else if (cur.length) {
            parts.push(cur);
            cur = [];
          }
        }
        if (cur.length) parts.push(cur);
      }
      if (this.opts.lines) {
        const step = lit ? 0 : this.quiet?.get(leg.key) ?? 0;
        // a straight line quietened up close: each tone of the path mixed toward the page, solid (never an opacity)
        const quieter = (band: number) => css(this.trail[trailIndex(0, band)]!.map((v, i) => v + (this.page[i]! - v) * STRAIGHT_FADE_MIX * (step / STRAIGHT_FADE_STEPS)) as unknown as TrailRgb);
        for (const c of legCells(parts, leg.mode, { cols, rows }, 3, zoom >= TICK_FROM_STREET)) {
          const band = Math.min(TRAIL_BANDS - 1, c.band);
          ink(c.col, c.row, lit ? color("lit") : step ? quieter(band) : color(band));
        }
      }
      const head = this.opts.lines && zoom >= SPARK_FROM_ZOOM ? project(leg.head, 0) : null;
      if (head) {
        const col = Math.floor(head.x / cell);
        const row = Math.floor(head.y / cell);
        const spark = color("spark");
        ink(col, row, spark);
        if (lit) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) ink(col + dc, row + dr, spark);
      }
      let length = 0;
      for (const part of parts) for (let i = 1; i < part.length; i++) length += Math.hypot(part[i]![0] - part[i - 1]![0], part[i]![1] - part[i - 1]![1]);
      candidates.push({ leg, lit, length, parts });
    }
    if (zoom >= this.opts.iconFromZoom) this.drawIcons(candidates, cols, rows, cell, color);
  }

  /**
   * One badge with the picture of the mode on each long enough leg, the selected place's first and then the longest: at the middle of the leg (or the
   * nearest place along it that is on screen), on the cell grid so it moves in the same steps as the line, in the colour of the path there (the
   * selected place's legs in the lit colour) with the icon in the page colour, at full resolution; and only where it does not touch another badge
   * (so a crowd of legs shows a badge each where there is room and none where there is not).
   */
  private drawIcons(
    candidates: ReadonlyArray<{ leg: DotLeg; lit: boolean; length: number; parts: ReadonlyArray<ReadonlyArray<readonly [number, number]>> }>,
    cols: number,
    rows: number,
    cell: number,
    color: (band: number | "lit" | "spark") => string,
  ): void {
    const order = [...candidates].sort((a, b) => Number(b.lit) - Number(a.lit) || b.length - a.length);
    const placed: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
    const ink = css(this.page);
    const half = BADGE_PX / 2;
    const frag = document.createDocumentFragment();
    for (const c of order) {
      if (!hasIcon(c.leg.mode) || c.length < (c.lit ? ICON_MIN_SHARE_LIT : ICON_MIN_SHARE) * Math.min(cols, rows) || this.quiet?.has(c.leg.key)) continue;
      let spot: { x: number; y: number; f: number } | null = null;
      for (const f of [0.5, 0.38, 0.62, 0.26, 0.74]) {
        const p = pointAt(c.parts, c.length * f);
        if (p && p.x * cell >= BADGE_PX && p.y * cell >= BADGE_PX && p.x < cols - BADGE_PX / cell && p.y < rows - BADGE_PX / cell) {
          spot = { ...p, f };
          break;
        }
      }
      if (!spot) continue;
      const cx = Math.round(spot.x) * cell + cell / 2;
      const cy = Math.round(spot.y) * cell + cell / 2;
      const box = { x0: cx - half - ICON_GAP * cell, y0: cy - half - ICON_GAP * cell, x1: cx + half + ICON_GAP * cell, y1: cy + half + ICON_GAP * cell };
      if (placed.some((q) => box.x0 < q.x1 && box.x1 > q.x0 && box.y0 < q.y1 && box.y1 > q.y0)) continue;
      placed.push(box);
      const band = Math.min(TRAIL_BANDS - 1, Math.floor(spot.f * TRAIL_BANDS));
      const el = badgeElement(c.leg.mode, c.lit ? color("lit") : color(band), ink, ink);
      if (!el) continue;
      el.style.left = `${cx - half}px`;
      el.style.top = `${cy - half}px`;
      frag.append(el);
    }
    this.badges.append(frag);
  }
}
