import {
  BufferAttribute,
  DataTexture,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineSegments,
  NearestFilter,
  RedFormat,
  UnsignedByteType,
  type Scene,
  type ShaderMaterial,
} from "three";
import type { GlobeRoute } from "../types";
import type { GlobeTheme } from "./colors";
import { clamp, easeInOutCubic } from "./geo";
import { PATH_MAX_LEVELS, pathMaterial } from "./materials";
import { coastLevel } from "./palette";
import { TUNING } from "./tuning";
import { FADE_FROM_CELLS, FADE_FULL_CELLS, levelFor, metresPerCell } from "../paths/lod";
import { buildBuffers, buildNetwork, legsAt, type PathBuffers, type PathNetwork } from "../paths/network";

/** Marching speed of the dashes of a leg while it draws on, in px per second. */
const MARCH_PX_PER_S = 30;
/** Texels per row of the per-leg state texture. */
const STATE_ROW = 1024;
/** The state texel of a leg: none, starts at the selected place (the draw-on runs forwards), ends there (backwards). */
const STATE_NONE = 0;
const STATE_FWD = 128;
const STATE_REV = 255;

export interface PathStats {
  legs: number;
  /** Vertices (the finest level, shared by every level). */
  vertices: number;
  /** Segments per level, finest first. */
  levelSegments: number[];
  /** Bytes held by the GPU buffers (vertex attributes + indices) and the state texture. */
  bytes: number;
  /** The level drawn now, and the segments it draws. */
  level: number;
  drawnSegments: number;
  /** Draw calls this layer issues per frame (0 when it is off or empty). */
  drawCalls: number;
  /** Legs lit by the selected place. */
  lit: number;
}

/**
 * ALL the routes' legs, drawn faintly at all times, and the legs next to the selected place in full ink with a draw-on. One
 * instanced `LineSegments` for every mode (one draw call), built once: the selection is a texel per leg and a uniform, the zoom
 * picks a simplification level by `setDrawRange`. Idle cost is zero (nothing animates but the draw-on; `advance` reports whether
 * another frame is needed). The legs themselves come from `paths/network.ts`: a decoded polyline per leg, or the geodesic arc.
 */
export class RouteLayer {
  readonly network: PathNetwork;
  private buffers: PathBuffers | null = null;
  private line: LineSegments | null = null;
  private geometry: InstancedBufferGeometry | null = null;
  private material: ShaderMaterial | null = null;
  private state: DataTexture | null = null;
  private stateData = new Uint8Array(0);
  private level: number | null = null;
  private lit = new Set<number>();
  private litRoutes = new Set<string>();
  /** performance.now() at which the draw-on began, or null when the legs are complete. */
  private drawStart: number | null = null;
  private enabled = true;
  private mPerCell = 0;
  private cssPerCell = 1;
  private finalLevel = 8;
  private ramp: GlobeTheme["ramp"] | null = null;
  private lengthByRoute = new Map<string, number[]>();

  constructor(
    private scene: Scene,
    routes: readonly GlobeRoute[],
  ) {
    this.network = buildNetwork(routes);
    if (this.network.legs.length === 0) return;
    const b = buildBuffers(this.network);
    this.buffers = b;
    const g = new InstancedBufferGeometry();
    g.setAttribute("position", new BufferAttribute(b.position, 3));
    g.setAttribute("aDist", new BufferAttribute(b.dist, 1));
    g.setAttribute("aInfo", new BufferAttribute(b.info, 3));
    g.setAttribute("aTan", new BufferAttribute(b.tangent, 3));
    const hasRail = this.network.legs.some((l) => l.mode === "rail");
    g.setAttribute("aCopy", new InstancedBufferAttribute(Float32Array.from([0, 1, 2]), 1));
    g.instanceCount = hasRail ? 3 : 1;
    g.setIndex(new BufferAttribute(b.index, 1));
    this.geometry = g;

    const rows = Math.ceil(b.legCount / STATE_ROW);
    const width = Math.min(STATE_ROW, b.legCount);
    this.stateData = new Uint8Array(width * rows);
    const tex = new DataTexture(this.stateData, width, rows, RedFormat, UnsignedByteType);
    tex.minFilter = NearestFilter;
    tex.magFilter = NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.state = tex;

    const material = pathMaterial();
    material.uniforms.uState!.value = tex;
    material.uniforms.uTexSize!.value = [width, rows];
    material.uniforms.uFadeFrom!.value = FADE_FROM_CELLS;
    material.uniforms.uFadeFull!.value = FADE_FULL_CELLS;
    this.material = material;

    const line = new LineSegments(g, material);
    line.renderOrder = 4;
    line.frustumCulled = false;
    this.line = line;
    this.applyLevel(0);
    scene.add(line);
    for (const leg of this.network.legs) {
      const arr = this.lengthByRoute.get(leg.routeId) ?? [];
      arr.push(leg.index);
      this.lengthByRoute.set(leg.routeId, arr);
    }
  }

  /** Whether any leg exists (a projection without routes has no layer at all). */
  get empty(): boolean {
    return this.line === null;
  }

  private applyLevel(level: number) {
    if (!this.buffers || !this.geometry) return;
    this.level = level;
    const r = this.buffers.levels[level]!;
    this.geometry.setDrawRange(r.start, r.count);
  }

  /**
   * Light the legs next to the place (`placeKey`) and none other; none when `key` is null. With `animate` they draw on from the
   * place outwards (from `now`), else they are complete.
   */
  select(key: string | null, animate: boolean, now: number) {
    if (!this.state) return;
    this.stateData.fill(STATE_NONE);
    this.lit.clear();
    this.litRoutes.clear();
    if (key !== null) {
      for (const { leg, dir } of legsAt(this.network, key)) {
        this.stateData[leg] = dir === "fwd" ? STATE_FWD : STATE_REV;
        this.lit.add(leg);
        this.litRoutes.add(this.network.legs[leg]!.routeId);
      }
    }
    this.state.needsUpdate = true;
    const animating = animate && this.lit.size > 0;
    this.drawStart = animating ? now : null;
    this.setFront(animating ? 0 : 2, 0);
    this.updateVisible();
  }

  /** The "Paths" switch: off hides every path, on shows them (the selection is kept either way). */
  setEnabled(on: boolean) {
    this.enabled = on;
    this.updateVisible();
  }

  private updateVisible() {
    if (this.line) this.line.visible = this.enabled;
  }

  /** Ids of the routes with a leg lit now (measurement and tests). */
  shown(): string[] {
    return this.enabled ? [...this.litRoutes] : [];
  }

  /** Leg ids lit now (checks). */
  litLegs(): number[] {
    return [...this.lit];
  }

  /** Reduced motion: the lit legs are complete and static. */
  finishAll() {
    this.drawStart = null;
    this.setFront(2, 0);
  }

  /** Advance any draw-on; returns true while another frame is needed. */
  advance(now: number): boolean {
    if (this.drawStart === null) return false;
    const elapsed = now - this.drawStart;
    const t = clamp(elapsed / TUNING.routeDrawMs, 0, 1);
    if (t >= 1) {
      this.drawStart = null;
      this.setFront(2, 0);
      return false;
    }
    this.setFront(easeInOutCubic(t), ((elapsed / 1000) * MARCH_PX_PER_S) / this.cssPerCell);
    return true;
  }

  private setFront(front: number, marchCells: number) {
    if (!this.material) return;
    this.material.uniforms.uFront!.value = front;
    this.material.uniforms.uMarch!.value = marchCells;
  }

  /**
   * Per-frame scale: `cssPerCell` is the art pixel in CSS px and `radiusPx` the globe's radius in CSS px. Sets the cell in world units
   * (the fade) and picks the simplification level (with hysteresis).
   */
  setScale(cssPerCell: number, radiusPx: number) {
    if (!this.material) return;
    this.cssPerCell = cssPerCell;
    this.mPerCell = metresPerCell(radiusPx, cssPerCell);
    this.material.uniforms.uCell!.value = cssPerCell / radiusPx;
    const level = levelFor(this.mPerCell, this.level);
    if (level !== this.level) this.applyLevel(level);
  }

  /** 1 = lifted arcs, 0 = flat on the ground (handover: they flatten before the street map takes over). */
  setLift(lift: number) {
    if (this.material) this.material.uniforms.uLift!.value = lift;
  }

  /** One buffer pixel in clip space (y flipped). */
  setPixelSize(bufW: number, bufH: number) {
    if (this.material) this.material.uniforms.uPixel!.value = [2 / bufW, -2 / bufH];
  }

  applyTheme(t: GlobeTheme) {
    this.ramp = t.ramp;
    if (!this.material) return;
    this.material.uniforms.uInk!.value.setRGB(...t.ink);
    const ramp = this.material.uniforms.uRamp!.value as { setRGB(r: number, g: number, b: number): void }[];
    for (let k = 0; k < PATH_MAX_LEVELS; k++) {
      const c = t.ramp[Math.min(k, t.ramp.length - 1)]!;
      ramp[k]!.setRGB(...c);
    }
    // The faint tone is the loudest map tone (`coast`): the legs step up through the palette to it as they get longer on screen.
    this.finalLevel = coastLevel(t.ramp.length);
    this.material.uniforms.uFinal!.value = this.finalLevel;
  }

  /** The tone a faint leg reaches at full size, and the ink (for the contrast checks and the docs). */
  tones() {
    return this.ramp ? { faint: this.ramp[this.finalLevel]!, ink: this.ramp[this.ramp.length - 1]! } : null;
  }

  stats(): PathStats {
    const b = this.buffers;
    if (!b) return { legs: 0, vertices: 0, levelSegments: [], bytes: 0, level: 0, drawnSegments: 0, drawCalls: 0, lit: 0 };
    const level = this.level ?? 0;
    return {
      legs: b.legCount,
      vertices: b.vertexCount,
      levelSegments: b.levels.map((l) => l.count / 2),
      bytes: b.position.byteLength + b.dist.byteLength + b.info.byteLength + b.tangent.byteLength + b.index.byteLength + this.stateData.byteLength,
      level,
      drawnSegments: b.levels[level]!.count / 2,
      drawCalls: this.enabled ? 1 : 0,
      lit: this.lit.size,
    };
  }

  dispose() {
    if (this.line) this.scene.remove(this.line);
    this.geometry?.dispose();
    this.material?.dispose();
    this.state?.dispose();
    this.line = null;
    this.geometry = null;
    this.material = null;
    this.state = null;
    this.buffers = null;
  }
}
