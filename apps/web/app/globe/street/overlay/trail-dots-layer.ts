/**
 * The canvas of the patterned legs (street/overlay/trail-dots.ts) and the sparks at their heads: a `cols x rows` canvas of the map's own art cells
 * scaled up with nearest-neighbour, the same grid the boxes are drawn on, under them. Colours are the trail's solid palette (globe/paths/trail.ts):
 * the gradient's bands along a leg, the lit colour along the selected place's legs, the spark at a head.
 *
 * The sparks (a cell at the destination, a plus when lit) are drawn only from `SPARK_FROM_ZOOM`: from far away they are noise, up close they sit
 * inside the place's box.
 */
import type { TrailRgb } from "../../paths/trail";
import { TRAIL_BANDS, trailIndex } from "../../paths/trail";
import { isLegMode } from "../../paths/modes";
import { legCells } from "./trail-dots";

type LonLat = [number, number];
export interface DotLeg {
  key: string;
  mode: ReturnType<typeof modeOf>;
  parts: LonLat[][];
  /** The destination. */
  head: LonLat;
}
const modeOf = (m: unknown) => (isLegMode(m) ? m : "unknown");

/** Map zoom from which the sparks are drawn (a city's scale: the boxes are big enough to hold them). */
export const SPARK_FROM_ZOOM = 9;

/** The legs of `legFeatures` as drawable legs: their pieces and their destination. */
export function dotLegs(fc: GeoJSON.FeatureCollection<GeoJSON.MultiLineString>): DotLeg[] {
  return fc.features.map((f) => {
    const parts = f.geometry.coordinates as LonLat[][];
    const last = parts[parts.length - 1]!;
    return { key: String(f.properties?.key), mode: modeOf(f.properties?.mode), parts, head: last[last.length - 1]! };
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

  constructor(root: HTMLElement) {
    this.canvas.dataset.trailDots = "";
    this.canvas.setAttribute("aria-hidden", "true");
    Object.assign(this.canvas.style, { position: "absolute", left: "0", top: "0", pointerEvents: "none", imageRendering: "pixelated" });
    root.prepend(this.canvas);
  }

  setLegs(legs: DotLeg[]) {
    this.legs = legs.filter((l) => l.mode !== "road");
    this.signature = "";
  }
  setFocus(keys: readonly string[]) {
    this.focus = new Set(keys);
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
  draw(project: (p: LonLat) => { x: number; y: number }, w: number, h: number, cell: number, zoom: number, camera: string) {
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
    for (const leg of this.legs) {
      const lit = this.focus.has(leg.key);
      const parts = leg.parts.map((part) => part.map((p) => {
        const s = project(p);
        return [s.x / cell, s.y / cell] as const;
      }));
      for (const c of legCells(parts, leg.mode, { cols, rows })) ink(c.col, c.row, lit ? color("lit") : color(Math.min(TRAIL_BANDS - 1, c.band)));
      if (zoom >= SPARK_FROM_ZOOM) {
        const s = project(leg.head);
        const col = Math.floor(s.x / cell);
        const row = Math.floor(s.y / cell);
        const spark = color("spark");
        ink(col, row, spark);
        if (lit) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) ink(col + dc, row + dr, spark);
      }
    }
  }
}
