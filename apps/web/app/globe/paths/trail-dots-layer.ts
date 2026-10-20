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
import { ICON_H, ICON_W, MODE_ICONS } from "./mode-icons";
import { ARC_LIFT_PER_RADIAN } from "./network";

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
export const ICON_FROM_ZOOM = 5;
export const ICON_MIN_CELLS = 44;
export const ICON_MIN_CELLS_LIT = 24;
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

  /** `lines: false`: the legs' lines are drawn by someone else (the globe's shader); only the pictures of the modes are drawn here. `iconFromZoom`: the zoom (the caller's own) from which they show. */
  constructor(root: HTMLElement, private readonly opts: { lines: boolean; iconFromZoom: number; onTop?: boolean } = { lines: true, iconFromZoom: ICON_FROM_ZOOM }) {
    this.canvas.dataset.trailDots = "";
    this.canvas.setAttribute("aria-hidden", "true");
    Object.assign(this.canvas.style, { position: "absolute", left: "0", top: "0", pointerEvents: "none", imageRendering: "pixelated" });
    // under the boxes of the street map's overlay, or over the globe's own canvas
    if (opts.onTop) root.append(this.canvas);
    else root.prepend(this.canvas);
  }

  private left = 0;
  private top = 0;
  /** Where the canvas sits in its container (CSS px), when it is not at the corner. */
  setOrigin(left: number, top: number) {
    if (left === this.left && top === this.top) return;
    this.left = left;
    this.top = top;
    this.canvas.style.left = `${left}px`;
    this.canvas.style.top = `${top}px`;
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
  setPage(rgb: TrailRgb) {
    this.page = rgb;
    this.signature = "";
  }
  setTrail(colors: readonly TrailRgb[]) {
    this.trail = colors;
    this.signature = "";
  }
  setVisible(on: boolean) {
    this.visible = on;
    this.signature = "";
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
        for (const c of legCells(parts, leg.mode, { cols, rows }, 3, zoom >= TICK_FROM_STREET)) ink(c.col, c.row, lit ? color("lit") : color(Math.min(TRAIL_BANDS - 1, c.band)));
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
    if (zoom >= this.opts.iconFromZoom) this.drawIcons(ctx, candidates, cols, rows, color);
  }

  /**
   * One small picture of the mode on each long enough leg, the selected place's first and then the longest: at the middle of the leg (or the nearest
   * place along it that is on screen), on a plate of the page colour that cuts the line, and only where it does not touch another picture (so a
   * crowd of legs shows a picture each where there is room and none where there is not).
   */
  private drawIcons(
    ctx: CanvasRenderingContext2D,
    candidates: ReadonlyArray<{ leg: DotLeg; lit: boolean; length: number; parts: ReadonlyArray<ReadonlyArray<readonly [number, number]>> }>,
    cols: number,
    rows: number,
    color: (band: number | "lit" | "spark") => string,
  ): void {
    const order = [...candidates].sort((a, b) => Number(b.lit) - Number(a.lit) || b.length - a.length);
    const placed: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
    const plate = css(this.page);
    for (const c of order) {
      const icon = MODE_ICONS[c.leg.mode];
      if (!icon || c.length < (c.lit ? ICON_MIN_CELLS_LIT : ICON_MIN_CELLS)) continue;
      let spot: { x: number; y: number } | null = null;
      for (const f of [0.5, 0.38, 0.62, 0.26, 0.74]) {
        const p = pointAt(c.parts, c.length * f);
        if (p && p.x >= ICON_W && p.y >= ICON_H && p.x < cols - ICON_W && p.y < rows - ICON_H) {
          spot = p;
          break;
        }
      }
      if (!spot) continue;
      const x0 = Math.round(spot.x) - Math.floor(ICON_W / 2);
      const y0 = Math.round(spot.y) - Math.floor(ICON_H / 2);
      const box = { x0: x0 - ICON_GAP, y0: y0 - ICON_GAP, x1: x0 + ICON_W + ICON_GAP, y1: y0 + ICON_H + ICON_GAP };
      if (placed.some((q) => box.x0 < q.x1 && box.x1 > q.x0 && box.y0 < q.y1 && box.y1 > q.y0)) continue;
      placed.push(box);
      ctx.fillStyle = plate;
      ctx.fillRect(x0 - 1, y0 - 1, ICON_W + 2, ICON_H + 2);
      ctx.fillStyle = c.lit ? color("lit") : color(Math.min(TRAIL_BANDS - 1, 3));
      icon.forEach((row, dy) => {
        for (let dx = 0; dx < row.length; dx++) if (row[dx] === "#") ctx.fillRect(x0 + dx, y0 + dy, 1, 1);
      });
    }
  }
}
