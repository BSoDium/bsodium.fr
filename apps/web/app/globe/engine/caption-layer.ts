/**
 * The caption as objects in the globe's space (docs/web-architecture.md, "Orbiting type"; the maths is engine/caption.ts).
 *
 * Each line is a strip of the shell `CAPTION.radius` on a REAL parallel of the globe, with a texture of its text (an outlined serif: the inside of a
 * letter the page colour, its outline the ink), STACKED `CAPTION.slices` times from the front face back towards the planet in the ink: the stack is
 * the thickness of the letters (their side is the outline's colour), a retro extrusion that costs one small geometry and no layout. Nothing is laid
 * out or rasterised per frame: the text is drawn once into one small canvas per line (a face, a size class; the two colours are uniforms, so a theme
 * change is two uniforms and no rebuild), and a frame is a rotation per line about the earth's axis (the view's longitude and the entrance's turn).
 *
 * Two ways to draw the same meshes (`?orbit-pixel=0|1`):
 *  - `pixel`: in the globe's own scene, in the same pass, at the drawing buffer's resolution (one art cell a pixel, upscaled with nearest-neighbour),
 *    thresholded to two colours: exactly as pixelated as the coastlines;
 *  - `crisp`: in a second scene drawn by a second renderer onto a canvas of its own, at the device's resolution, over the globe's (same camera, same
 *    rectangle, same edge mask), with the planet in it as a depth-only sphere so the planet still hides what is behind it.
 * Both are depth-tested and back-face culled: a letter past the horizon is gone, nothing is ever seen mirrored.
 *
 * Nothing runs while the lines are hidden, and at rest the frame loop is asked for nothing: only an entrance or a departure animates.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  FrontSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  WebGLRenderer,
} from "three";
import type { GlobeTheme } from "./colors";
import { bandColumns, bandMesh, CAPTION_FACE, CaptionMotion, entranceStart, layoutCaption, lineHidden, topLatitude, type CaptionLayout } from "./caption";
import { OCCLUDER_RADIUS } from "./materials";
import { CAPTION } from "./tuning";

const VERT = /* glsl */ `
  attribute float aLayer;
  varying vec2 vUv;
  varying float vLayer;
  void main() {
    vUv = uv;
    vLayer = aLayer;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * The texture holds the glyph's inside in its green channel and its outline in the red one; coverage is its alpha. The front face is the page colour
 * inside and the ink on the outline; every slice behind it is the ink (the letters' side). The pixel pass thresholds (two colours, no grey); the
 * crisp one keeps the edge's coverage (alpha to coverage on a multisampled canvas).
 */
const frag = (pixel: boolean) => /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform vec3 uInk;
  uniform vec3 uBack;
  varying vec2 vUv;
  varying float vLayer;
  void main() {
    vec4 t = texture2D(uMap, vUv, ${CAPTION.lodBias.toFixed(2)});
    ${pixel ? `if (t.a < ${CAPTION.cut.toFixed(2)}) discard;` : "if (t.a < 0.02) discard;"}
    bool front = vLayer > 0.999;
    vec3 col = (front && t.g > t.r) ? uBack : uInk;
    gl_FragColor = vec4(col, ${pixel ? "1.0" : "smoothstep(0.1, 0.9, t.a)"});
  }
`;

interface Built {
  layout: CaptionLayout;
  meshes: Mesh[];
  starts: number[];
  key: string;
}

export interface CaptionState {
  pixel: boolean;
  built: boolean;
  phase: string;
  wrapped: boolean;
  stepDeg: number;
  capCells: number;
  lines: { text: string; theta: number; visible: boolean; halfSpanDeg: number; baseLat: number; capR: number }[];
  texture: { width: number; height: number }[];
  crisp: boolean;
}

/**
 * Where the crisp canvas lays itself (CSS px, on the stage): a window of the globe's own canvas round the planet (the caption never leaves it:
 * a quarter of the pixels of the whole canvas, and multisampled), and the globe's edge mask, offset to follow.
 */
export interface CaptionRect {
  w: number;
  h: number;
  left: number;
  top: number;
  mask: string;
  /** The globe canvas's own size, and where the window is in it: the mask's frame. */
  full: { w: number; h: number };
  at: { x: number; y: number };
}

/** The second canvas of the crisp mode: its own renderer and scene, with the planet in it as a depth-only sphere. */
class CrispCanvas {
  readonly scene = new Scene();
  private renderer: WebGLRenderer;
  private lost = false;
  private shown = false;

  constructor(host: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setClearColor(0x000000, 0);
    const el = this.renderer.domElement;
    el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, { position: "absolute", pointerEvents: "none", display: "block", visibility: "hidden" } satisfies Partial<CSSStyleDeclaration>);
    host.append(el);
    el.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
      this.hide();
    });
    el.addEventListener("webglcontextrestored", () => (this.lost = false));
    // The planet, in the depth buffer only: what is behind it is not drawn.
    const globe = new Mesh(new SphereGeometry(OCCLUDER_RADIUS, 96, 48), new MeshBasicMaterial({ colorWrite: false }));
    globe.renderOrder = -1;
    this.scene.add(globe);
  }

  render(camera: PerspectiveCamera, rect: CaptionRect, dpr: number): void {
    if (this.lost) return;
    const r = this.renderer;
    const el = r.domElement;
    r.setPixelRatio(dpr);
    const w = Math.round(rect.w);
    const h = Math.round(rect.h);
    if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) r.setSize(w, h, false);
    Object.assign(el.style, { width: `${w}px`, height: `${h}px`, left: `${rect.left}px`, top: `${rect.top}px` });
    const pos = `${-rect.at.x}px ${-rect.at.y}px`;
    const size = `${rect.full.w}px ${rect.full.h}px`;
    for (const [k, v] of [["mask-image", rect.mask], ["mask-position", pos], ["mask-size", size], ["mask-repeat", "no-repeat"]] as const) {
      el.style.setProperty(k, v);
      el.style.setProperty(`-webkit-${k}`, v);
    }
    r.render(this.scene, camera);
    if (!this.shown) {
      el.style.visibility = "";
      this.shown = true;
    }
  }

  hide(): void {
    if (!this.shown) return;
    this.renderer.domElement.style.visibility = "hidden";
    this.shown = false;
  }

  get maxAnisotropy(): number {
    return this.renderer.capabilities.getMaxAnisotropy();
  }

  dispose(): void {
    this.scene.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as MeshBasicMaterial).dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

export class CaptionLayer {
  private motion = new CaptionMotion();
  private built: Built | null = null;
  private textures: CanvasTexture[] = [];
  private geometries: BufferGeometry[] = [];
  private materials: ShaderMaterial[] = [];
  /** The two colours of the theme, shared by every line's material. */
  private ink = { value: [1, 1, 1] as number[] };
  private back = { value: [0, 0, 0] as number[] };
  /** A build that threw (a canvas context refused, ...): the caption is not there and asks for no frames. */
  private failed = false;
  private disposed = false;
  private want = false;
  private reduced: boolean;
  private token = 0;
  private crisp: CrispCanvas | null = null;
  private tmp = new Matrix4();
  private lastThetas: number[] = [];
  /** What the meshes were last placed with: a frame that changes none of it does nothing. */
  private placed: { lon: number; thetas: number[]; d: number; lat: number } | null = null;
  private allHidden = false;
  private anyVisible = false;
  private texSizes: { width: number; height: number }[] = [];
  /** The art cell and the planet's radius at the lowest zoom (CSS px): what decides the cap heights and the wrapping. */
  private sizing: { cell: number; r: number; d: number } | null = null;
  private viewLat = 28;
  /** Checks only: the shell's radius, in place of `CAPTION.radius` (1.001 puts the caption on the surface, over the graticule's own parallels). */
  private radius: number | null = null;

  constructor(
    private scene: Scene,
    private opts: {
      phrases: readonly string[];
      /** Drawn in the globe's pixel pass (true) or crisp in a second canvas (false). */
      pixel: boolean;
      /** The element the crisp canvas goes into (the globe's stage). */
      host: HTMLElement;
      theme: GlobeTheme;
      reduced: boolean;
      maxAnisotropy: number;
      /** The lines are built: a frame is wanted. */
      onChange(): void;
    },
  ) {
    this.reduced = opts.reduced;
    if (!opts.pixel) {
      try {
        this.crisp = new CrispCanvas(opts.host);
      } catch {
        // no second context: the pass of the globe's own (pixelated) is the fallback
        this.crisp = null;
      }
    }
    this.setTheme(opts.theme);
  }

  /** In the globe's pixel pass (the toggle, or the fallback when a second context could not be had). */
  get isPixel(): boolean {
    return this.crisp === null;
  }

  private makeMaterial(map: CanvasTexture): ShaderMaterial {
    const pixel = this.isPixel;
    return new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: frag(pixel),
      uniforms: { uMap: { value: map }, uInk: this.ink, uBack: this.back },
      side: FrontSide,
      depthTest: true,
      depthWrite: true,
      transparent: false,
      alphaToCoverage: !pixel,
    });
  }

  /**
   * Where the caption will be seen: the art cell and the planet's radius at the lowest zoom, CSS px, and the camera's distance there (the renderer
   * tells at start and when the viewport changes: the entrance starts far enough round to be hidden from that far). The cap heights and whether the lines wrap follow from them; the lines are built when it is known and again only when
   * what they depend on changes.
   */
  setSizing(cell: number, r: number, d: number): void {
    if (this.disposed || !(cell > 0) || !(r > 0) || !(d > 1)) return;
    this.sizing = { cell, r, d };
    void this.build();
  }

  /** Checks only: lay the lines on a shell of this radius (null: the tuned one); the lines are built again. */
  setRadius(r: number | null): void {
    this.radius = r;
    void this.build();
  }

  setTheme(theme: GlobeTheme): void {
    this.ink.value = [...theme.ink];
    this.back.value = [...theme.background];
  }

  setReduced(on: boolean): void {
    this.reduced = on;
    if (on) this.motion.settle(this.want);
  }

  /** The showcase begins (`now`: the clock reading) or, before the first frame exists, `null`: the entrance then starts with the first frame. */
  show(now: number | null): void {
    this.want = true;
    if (this.reduced) this.motion.settle(true);
    else this.motion.enter(now);
  }

  hide(now: number): void {
    this.want = false;
    if (this.reduced) this.motion.settle(false);
    else this.motion.leave(now);
  }

  /** Checks and captures: hold the entrance at `ms` after its start; null lets it run (or rest) again. */
  pin(ms: number | null): void {
    this.motion.pinned = ms;
  }

  /** Checks and captures: hold every line at `deg` degrees east of its place (null releases it). */
  pinAngle(deg: number | null): void {
    this.motion.pinnedAngle = deg === null ? null : (deg * Math.PI) / 180;
  }

  /** Something is moving: the frame loop must keep going. */
  get animating(): boolean {
    return this.built !== null && !this.failed && this.motion.animating;
  }

  get isBuilt(): boolean {
    return this.built !== null;
  }

  /**
   * Per frame, after the camera is current: turn each line to where the clock has it. `lon` and `lat` are the view's longitude and latitude
   * (degrees: the lines are centred on the view's meridian and sit on the parallels above its latitude), `d` the camera's distance, `now` the clock
   * the entrance runs on (the same one `show` and `hide` were given).
   */
  sync(d: number, lon: number, lat: number, now: number): void {
    this.viewLat = lat;
    const b = this.built;
    if (!b || this.failed) return;
    // The block follows the view's latitude in graticule steps: a new top parallel is a new layout (the home screen's latitude is fixed).
    if (this.sizing && b.key !== this.keyFor()) void this.build();
    if (this.motion.waiting) this.motion.begin(now, CAPTION.enter.loadDelayMs);
    const n = b.meshes.length;
    // Hidden (the showcase is off and the lines have gone): every mesh is hidden once, and then there is nothing to do, whatever the camera does.
    if (this.motion.phase === "hidden" && this.motion.pinned === null && this.motion.pinnedAngle === null) {
      if (!this.allHidden) {
        for (const m of b.meshes) m.visible = false;
        this.allHidden = true;
        this.placed = null;
        this.anyVisible = false;
        this.lastThetas.length = n;
        for (let i = 0; i < n; i++) this.lastThetas[i] = b.starts[i]!;
      }
      return;
    }
    this.allHidden = false;
    this.lastThetas.length = n;
    const thetas = this.placed?.thetas ?? new Array<number>(n).fill(NaN);
    let changed = this.placed === null || this.placed.lon !== lon || this.placed.d !== d || this.placed.lat !== lat;
    for (let i = 0; i < n; i++) {
      const theta = this.motion.angle(now, i, b.starts[i]!);
      if (thetas[i] !== theta) changed = true;
      thetas[i] = theta;
      this.lastThetas[i] = theta;
    }
    this.placed = { lon, thetas, d, lat };
    // At rest with the camera still (the showcase is on and nothing moves): the meshes are where they were.
    if (!changed) return;
    let any = false;
    for (let i = 0; i < n; i++) {
      const mesh = b.meshes[i]!;
      const hidden = lineHidden(thetas[i]!, b.layout.lines[i]!, d, lat);
      mesh.visible = !hidden;
      if (hidden) continue;
      any = true;
      // The earth's axis is y: a line's own meridian is the view's (`lon`), turned east by the entrance's `theta`.
      this.tmp.makeRotationY((lon * Math.PI) / 180 + thetas[i]!);
      mesh.matrix.copy(this.tmp);
      mesh.matrixWorldNeedsUpdate = true;
    }
    this.anyVisible = any;
  }

  /** Crisp mode: draw the caption over the globe's frame (a no-op in the pixel pass). */
  renderCrisp(camera: PerspectiveCamera, rect: CaptionRect, dpr: number): void {
    const c = this.crisp;
    if (!c) return;
    if (!this.anyVisible || !this.built || this.failed) {
      c.hide();
      return;
    }
    c.render(camera, rect, Math.min(dpr, 2));
  }

  /** The globe is not drawn (the street map owns the view): the second canvas must not show a stale frame. */
  hideCrisp(): void {
    this.crisp?.hide();
  }

  state(): CaptionState {
    const b = this.built;
    return {
      pixel: this.isPixel,
      crisp: this.crisp !== null,
      built: b !== null,
      phase: this.motion.phase,
      wrapped: b?.layout.wrapped ?? false,
      stepDeg: b?.layout.stepDeg ?? 0,
      capCells: this.sizing ? (CAPTION.capR[0]! * this.sizing.r) / this.sizing.cell : 0,
      lines: (b?.layout.lines ?? []).map((l, i) => ({
        text: l.text,
        theta: this.lastThetas[i] ?? 0,
        visible: b?.meshes[i]?.visible ?? false,
        halfSpanDeg: (l.halfSpan * 180) / Math.PI,
        baseLat: l.baseLat,
        capR: l.capR,
      })),
      texture: this.texSizes,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.token++;
    this.release();
    this.crisp?.dispose();
    this.crisp = null;
    this.built = null;
  }

  /** Take the lines out of the scene and free what they hold (geometry, texture, the per-line material). */
  private release(): void {
    const target = this.crisp ? this.crisp.scene : this.scene;
    for (const m of this.built?.meshes ?? []) target.remove(m);
    for (const g of this.geometries) g.dispose();
    for (const t of this.textures) t.dispose();
    for (const m of this.materials) m.dispose();
    this.geometries = [];
    this.textures = [];
    this.materials = [];
    this.texSizes = [];
    this.placed = null;
    this.allHidden = false;
    this.anyVisible = false;
  }

  /* ------------------------------ building ------------------------------ */

  private keyFor(): string {
    const s = this.sizing;
    return `${s ? Math.round(s.r) : 0}|${s ? s.cell : 0}|${s ? Math.round(s.d * 10) : 0}|${topLatitude(this.viewLat)}|${topLatitude(this.viewLat, CAPTION.aboveWrappedDeg)}|${this.radius ?? 0}`;
  }

  /** The key of the build in flight (a frame that sees the layout out of date must not start the same build again). */
  private building: string | null = null;

  private async build(): Promise<void> {
    const key = this.keyFor();
    if (this.building === key || this.built?.key === key) return;
    this.building = key;
    const token = ++this.token;
    try {
      await this.buildLines(token);
    } catch {
      // Anything the browser refuses (a 2D context, a texture): the caption is not there, quietly, and it asks for no frames.
      if (token === this.token && !this.disposed) {
        this.release();
        this.built = null;
        this.failed = true;
      }
    } finally {
      if (this.building === key) this.building = null;
    }
  }

  private async buildLines(token: number): Promise<void> {
    if (!this.sizing) return;
    const key = this.keyFor();
    if (this.built?.key === key) return;
    const emPx = CAPTION.texCap / CAPTION_FACE.capEm;
    const face = `${CAPTION_FACE.weight} ${emPx}px ${CAPTION_FACE.family}, ${CAPTION_FACE.fallback}`;
    // The reading face is on the page already (the intro is set in it); asking makes sure it is there at this weight before it is measured.
    if (typeof document !== "undefined" && document.fonts?.load) {
      try {
        await document.fonts.load(face);
      } catch {
        // the system serif then
      }
    }
    if (this.disposed || token !== this.token) return;
    const texts = this.opts.phrases.map((p) => p.trim()).filter((p) => p.length > 0);
    if (texts.length === 0) return;
    this.failed = false;
    const probe = document.createElement("canvas").getContext("2d");
    if (!probe) throw new Error("no 2D context");
    probe.font = face;
    const outlinePx = CAPTION.outline * CAPTION.texCap;
    const pad = Math.ceil(outlinePx * 2 + 4);
    const widthPx = (text: string) => probe.measureText(text).width + CAPTION_FACE.tracking * emPx * text.length + 2 * pad;
    const layout = layoutCaption({ texts, measure: (t) => widthPx(t) / emPx, rPx: this.sizing.r, viewLat: this.viewLat });
    // The sheets first (they can throw): a rebuild replaces the lines only once the new ones are made.
    const sheetH = Math.ceil((CAPTION_FACE.above + CAPTION_FACE.below) * CAPTION.texCap);
    const sheets = layout.lines.map((line) => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(widthPx(line.text));
      canvas.height = sheetH;
      const c = canvas.getContext("2d");
      if (!c) throw new Error("no 2D context");
      c.font = face;
      c.textBaseline = "alphabetic";
      c.textAlign = "left";
      c.lineJoin = "round";
      c.miterLimit = 2;
      if ("letterSpacing" in c) (c as unknown as { letterSpacing: string }).letterSpacing = `${CAPTION_FACE.tracking * emPx}px`;
      const baseline = CAPTION_FACE.above * CAPTION.texCap;
      // the inside first (green), then the outline (red) centred on the edge: the inside the page colour, the outline the ink
      c.fillStyle = "rgb(0 255 0)";
      c.fillText(line.text, pad, baseline);
      c.lineWidth = outlinePx;
      c.strokeStyle = "rgb(255 0 0)";
      c.strokeText(line.text, pad, baseline);
      return canvas;
    });
    this.release();
    this.built = null;
    const target = this.crisp ? this.crisp.scene : this.scene;
    const anisotropy = this.crisp ? Math.min(this.opts.maxAnisotropy, this.crisp.maxAnisotropy) : this.opts.maxAnisotropy;
    const meshes: Mesh[] = [];
    layout.lines.forEach((line, i) => {
      const sheet = sheets[i]!;
      const tex = new CanvasTexture(sheet);
      tex.generateMipmaps = true;
      tex.minFilter = LinearMipmapLinearFilter;
      tex.magFilter = LinearFilter;
      tex.anisotropy = anisotropy;
      this.textures.push(tex);
      this.texSizes.push({ width: sheet.width, height: sheet.height });
      const bm = bandMesh(line, bandColumns(line), CAPTION.slices, CAPTION.depth, this.radius ?? CAPTION.radius);
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(bm.positions, 3));
      g.setAttribute("uv", new BufferAttribute(bm.uvs, 2));
      g.setAttribute("aLayer", new BufferAttribute(bm.layers, 1));
      g.setIndex(new BufferAttribute(bm.indices, 1));
      this.geometries.push(g);
      const mat = this.makeMaterial(tex);
      this.materials.push(mat);
      const mesh = new Mesh(g, mat);
      mesh.matrixAutoUpdate = false;
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.renderOrder = 7; // after the globe's layers (the markers are 5, the outline 6)
      target.add(mesh);
      meshes.push(mesh);
    });
    const starts = layout.lines.map((l) => entranceStart(l, this.viewLat, this.sizing!.d));
    this.motion.setStarts(starts, layout.lines.map((l) => l.parent));
    this.built = { layout, meshes, starts, key };
    if (this.want && this.reduced) this.motion.settle(true);
    this.opts.onChange();
  }
}
