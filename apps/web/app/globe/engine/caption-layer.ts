/**
 * The caption as objects in the globe's space (docs/web-architecture.md, "Orbiting type"; the maths is engine/caption.ts).
 *
 * Each line is a strip of the shell `CAPTION.radius` on a REAL parallel of the globe, with a texture of its words (a few faces and weights on one
 * baseline: the reading serif, its italic, the site's mono, a handwriting), STACKED `CAPTION.slices` times from the front face back towards the
 * planet: the front face shows the letters in the face colour with a thin outline, the slices behind it are the side of the letters (a short,
 * retro extrusion that costs one small geometry and no layout). Nothing is laid out or rasterised per frame: the words are drawn once into one
 * small canvas per line (a size class), the colours are uniforms (a theme change is no rebuild), and a frame is a rotation per line about the
 * earth's axis (the view's longitude and the entrance's turn).
 *
 * Drawn crisp: by a second `WebGLRenderer` onto a canvas of its own at the device's resolution, over the globe's (same camera, same rectangle, same
 * edge mask), with the planet in it as a depth-only sphere so the planet still hides what is behind it. Depth-tested and back-face culled: a letter
 * past the horizon is gone, nothing is ever seen mirrored.
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
import {
  CAPTION_FACE,
  CAPTION_FACES,
  CAPTION_FALLBACK_STYLE,
  CAPTION_STYLES,
  CaptionMotion,
  captionColors,
  captionFont,
  entranceSides,
  entranceStart,
  lineHidden,
  lineOf,
  minScaleFor,
  parallelPoint,
  planPieces,
  runsText,
  solveParallels,
  spanOf,
  swapEnterAngle,
  swapExitAngle,
  swapMs,
  unitBand,
  type CaptionContent,
  type CaptionExit,
  type CaptionLine,
  type CaptionPiece,
  type CaptionRun,
  type CaptionStyleKey,
  type Placement,
  type SolveHint,
} from "./caption";
import { OCCLUDER_RADIUS } from "./materials";
import { CAPTION } from "./tuning";

/**
 * One unit strip serves every line (`unitBand`: `position` is `(u, v, layer)`), and the line's parallel is a handful of uniforms: where the strip
 * is on the globe is computed here, so a change of the camera's tilt, which moves every line to another parallel, is a few uniforms and no new
 * geometry. The formula is `bandPoint` (engine/caption.ts, tested).
 */
const VERT = /* glsl */ `
  uniform float uBaseLat;
  uniform float uBelow;
  uniform float uAbove;
  uniform float uHalfSpan;
  uniform float uR;
  uniform float uDepth;
  varying vec2 vUv;
  varying float vLayer;
  void main() {
    vUv = position.xy;
    vLayer = position.z;
    float lat = uBaseLat - uBelow + position.y * (uBelow + uAbove);
    float a = (position.x * 2.0 - 1.0) * uHalfSpan;
    float rs = uR - uDepth * (1.0 - position.z);
    float cl = cos(lat);
    vec3 p = rs * vec3(cl * sin(a), sin(lat), cl * cos(a));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

/**
 * The texture holds the glyph's inside in its green channel and its outline in the red one; coverage is its alpha (the edge's: alpha to coverage on
 * a multisampled canvas keeps it smooth). The front face is the face colour inside and the outline colour on the outline; every slice behind it is
 * the side colour (the letters' thickness).
 */
const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform vec3 uFace;
  uniform vec3 uOutline;
  uniform vec3 uSide;
  varying vec2 vUv;
  varying float vLayer;
  void main() {
    vec4 t = texture2D(uMap, vUv, ${CAPTION.lodBias.toFixed(2)});
    if (t.a < 0.02) discard;
    bool front = vLayer > 0.999;
    // the inside is green, the outline red
    vec3 col = front ? (t.g > t.r ? uFace : uOutline) : uSide;
    gl_FragColor = vec4(col, smoothstep(0.1, 0.9, t.a));
  }
`;

/** One drawn strip: a row of a phrase set (`set` >= 0: it takes its turn) or a fixed row (`set` -1). Built once, all of them, ahead of time. */
interface Variant {
  row: number;
  set: number;
  piece: CaptionPiece;
  /** Where it is now (rewritten in place as the camera tilts). */
  line: CaptionLine;
  mesh: Mesh;
  material: ShaderMaterial;
}

interface Built {
  /** The solver's piece of each row: the widest variant's box (so the row's chord is the worst case of the sets). */
  pieces: CaptionPiece[];
  places: Placement[];
  variants: Variant[];
  /** How many rows take turns (the first ones); the rest are fixed. */
  slotRows: number;
  scale: number;
  clearances: number[];
  centreY: number;
  /** Where the last solve left off (`SolveHint`): the next, for a camera that moved a little, starts there. */
  hint: SolveHint | null;
  key: string;
}

/** A swap of the phrase set in progress: the rows of `from` go round the orbit, then those of `to` come in. */
interface Swap {
  from: number;
  to: number;
  t0: number;
  /** The clock reading the swap was frozen at (a fade began): it stays there while the canvas fades. */
  frozen: number | null;
  /** The side each row goes towards (out) and comes from (in): +1 east, -1 west. */
  out: number[];
  in: number[];
}

export interface CaptionState {
  built: boolean;
  phase: string;
  /** The caption canvas's opacity now (a fade runs it from 1 to 0). */
  opacity: number;
  wrapped: boolean;
  scale: number;
  viewLat: number;
  parallelsFor: number;
  capCells: number;
  seed: number | null;
  lines: { text: string; parent: number; theta: number; visible: boolean; halfSpanDeg: number; baseLat: number; capR: number; side: number; styles: string[] }[];
  /** The phrase sets that take turns: how many, which one is shown, whether a swap is on, and whether a timer is waiting for the next. */
  cycle: { sets: number; current: number; swapping: boolean; waiting: boolean; paused: boolean; swaps: number; lastOut: number[]; lastIn: number[] };
  clearances: number[];
  centreY: number;
  texture: { width: number; height: number }[];
  colors: { face: number[]; outline: number[]; side: number[] };
  /** What the parallels' solver costs: the last run, the worst, how many runs. */
  solver: { lastMs: number; maxMs: number; runs: number };
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

/** The second canvas: its own renderer and scene, with the planet in it as a depth-only sphere. Throws when no second context can be had. */
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
    // (above the hero's text plate, which is a wash over the lower half of the planet for the hero's own text: under it the caption would
    // fade to nothing at the bottom; below the credits, the panel and the header. The canvas takes no pointer events.)
    Object.assign(el.style, { position: "absolute", pointerEvents: "none", display: "block", visibility: "hidden", zIndex: "15" } satisfies Partial<CSSStyleDeclaration>);
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

  /**
   * The canvas fades out: a CSS opacity transition, run by the compositor (no JS and no frame of its own: the canvas goes on being drawn with the
   * camera while it fades, so the words stay locked to the globe). `restore` puts it back at once for the next entrance.
   */
  fadeOut(ms: number): void {
    const el = this.renderer.domElement;
    el.style.transition = `opacity ${ms}ms linear`;
    el.style.opacity = "0";
  }

  restore(): void {
    const el = this.renderer.domElement;
    el.style.transition = "none";
    el.style.opacity = "1";
  }

  /** The canvas's opacity now (checks). */
  get opacity(): number {
    return Number(getComputedStyle(this.renderer.domElement).opacity);
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

/**
 * One load per style of the page, for the page's life (`document.fonts` keeps what is added: a rebuild for another size must not add the same
 * file again). The promise says whether the face is usable; a style whose face is not falls back (`CAPTION_FALLBACK_STYLE`) so the texture is
 * never drawn in a stand-in that then changes.
 */
const STYLE_LOADS = new Map<CaptionStyleKey, Promise<boolean>>();

const SAMPLE = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz .,;:!?'·-";

function loadStyle(style: CaptionStyleKey): Promise<boolean> {
  let p = STYLE_LOADS.get(style);
  if (!p) {
    p = (async () => {
      const st = CAPTION_STYLES[style];
      const face = CAPTION_FACES[st.face];
      try {
        if (typeof document === "undefined" || !document.fonts) return false;
        if (face.url) {
          const added = new FontFace(face.family.replace(/"/g, ""), `url(${face.url})`, { weight: String(st.weight), style: st.italic ? "italic" : "normal", display: "block" });
          document.fonts.add(added);
          await added.load();
          return true;
        }
        const font = captionFont(style, 64);
        await document.fonts.load(font, SAMPLE);
        return document.fonts.check(font, SAMPLE);
      } catch {
        return false;
      }
    })();
    STYLE_LOADS.set(style, p);
  }
  return p;
}

export class CaptionLayer {
  private motion = new CaptionMotion();
  private built: Built | null = null;
  private textures: CanvasTexture[] = [];
  private texSizes: { width: number; height: number }[] = [];
  /** The three colours of the theme's caption, shared by every strip's material. */
  private face = { value: [1, 1, 1] as number[] };
  private outline = { value: [0, 0, 0] as number[] };
  private side = { value: [0, 0, 0] as number[] };
  /** A build that threw (a canvas context refused, ...): the caption is not there and asks for no frames. */
  private failed = false;
  private disposed = false;
  private want = false;
  private reduced: boolean;
  private token = 0;
  private crisp: CrispCanvas;
  private tmp = new Matrix4();
  private lastThetas: number[] = [];
  private allHidden = false;
  private anyVisible = false;
  /** The art cell, the planet's radius at the lowest zoom (CSS px) and the camera's distance there: what decides the cap heights and where an entrance starts. */
  private sizing: { cell: number; r: number; d: number } | null = null;
  private viewLat = 28;
  /** The latitude the parallels were last picked for (it glides towards the camera's), the clock reading of the last frame and whether it is still gliding. */
  private phi: number | null = null;
  private placedPhi: number | null = null;
  private lastAt = 0;
  private gliding = false;
  /** The strip every line shares (`unitBand`). */
  private unit: BufferGeometry | null = null;
  /** Checks only: the shell's radius, in place of `CAPTION.radius` (1.001 puts the caption on the surface, over the graticule's own parallels). */
  private radius: number | null = null;
  /** The key of the build in flight (a frame that sees the layout out of date must not start the same build again). */
  private building: string | null = null;
  /** The phrase set shown (of those that take turns), the swap in progress, and the timer that starts the next one. */
  private cur = 0;
  private swap: Swap | null = null;
  private swaps = 0;
  private lastOut: number[] = [];
  private lastIn: number[] = [];
  private timer = 0;
  private paused = false;
  /** What the parallels' solver costs (checks): the last, the worst and how many times it ran. */
  private placeMs = 0;
  private placeMax = 0;
  private places = 0;

  /** Throws when the second WebGL canvas cannot be had: the page then has no caption (the hero's how-to line shows). */
  constructor(
    private opts: {
      /** What it says: phrase sets that take turns in the upper rows, and the rows that stay under them. */
      content: CaptionContent;
      /** The element the caption's canvas goes into (the globe's stage). */
      host: HTMLElement;
      theme: GlobeTheme;
      reduced: boolean;
      maxAnisotropy: number;
      /** The lines are built, or a swap is to begin: a frame is wanted. */
      onChange(): void;
    },
  ) {
    this.reduced = opts.reduced;
    this.crisp = new CrispCanvas(opts.host);
    // Each entrance draws the sides the lines come in from at random, from a seed of the session.
    this.motion.seed = (Math.random() * 0x7fffffff) | 0;
    this.setTheme(opts.theme);
  }

  private makeMaterial(map: CanvasTexture, radius: number): ShaderMaterial {
    return new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uMap: { value: map },
        uFace: this.face,
        uOutline: this.outline,
        uSide: this.side,
        uBaseLat: { value: 0 },
        uBelow: { value: 0 },
        uAbove: { value: 0 },
        uHalfSpan: { value: 0 },
        uR: { value: radius },
        uDepth: { value: CAPTION.depth },
      },
      side: FrontSide,
      depthTest: true,
      depthWrite: true,
      transparent: false,
      alphaToCoverage: true,
    });
  }

  /**
   * Where the caption will be seen: the art cell, the planet's radius at the lowest zoom (CSS px) and the camera's distance there (the renderer
   * tells at start and when the viewport changes). The lines are built when it is known and again only when what they depend on changes.
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

  /** Checks and captures: the seed of the sides the lines come in from (null: all from the east), drawn again at once. */
  setSeed(seed: number | null): void {
    this.motion.reseed(seed);
  }

  setTheme(theme: GlobeTheme): void {
    const c = captionColors(theme);
    this.face.value = [...c.face];
    this.outline.value = [...c.outline];
    this.side.value = [...c.side];
  }

  setReduced(on: boolean): void {
    this.reduced = on;
    if (on) {
      this.motion.settle(this.want);
      this.cancelCycle();
      this.finishSwap();
      this.cur = 0;
    } else this.maybeSchedule();
  }

  /**
   * The page cannot be looked at (the tab is hidden, the globe is not drawn, the context is lost): the phrase sets do not turn, and no timer
   * waits. They begin again from the set shown when it can be.
   */
  setPaused(on: boolean): void {
    if (on === this.paused) return;
    this.paused = on;
    if (on) this.cancelCycle();
    else this.maybeSchedule();
  }

  /** The showcase begins (`now`: the clock reading) or, before the first frame exists, `null`: the entrance then starts with the first frame. */
  show(now: number | null): void {
    this.want = true;
    this.crisp.restore();
    // every showing begins with the first phrase set, whole
    this.swap = null;
    this.cur = 0;
    this.cancelCycle();
    if (this.reduced) this.motion.settle(true);
    else this.motion.enter(now);
  }

  /**
   * The showcase ends. By default the caption FADES (an interaction's exit: only the canvas's opacity changes, the lines keep following the
   * camera); `"orbit"` sends the lines on round behind the planet instead (kept for a caption that cycles its words). Reduced motion: gone at once.
   * Once the fade is over nothing of the caption runs: no placement, no render call, no depth pass. A swap in progress is frozen where it is for
   * the fade and settled when it is over, so the next showing is consistent.
   */
  hide(now: number, exit: CaptionExit = "fade"): void {
    this.want = false;
    this.cancelCycle();
    if (this.reduced) {
      this.motion.settle(false);
      this.finishSwap();
      this.crisp.hide();
      return;
    }
    if (this.swap) this.swap.frozen = now;
    this.motion.leave(now, exit);
    if (exit === "fade" && this.motion.phase === "fade") this.crisp.fadeOut(CAPTION.fadeMs);
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
    return this.built !== null && !this.failed && (this.motion.animating || this.gliding || this.swap !== null);
  }

  get isBuilt(): boolean {
    return this.built !== null;
  }

  /** Begin the next swap now (checks and captures; the timer does it on the page). Returns whether one began. */
  swapNow(now: number): boolean {
    return this.startSwap(now, true);
  }

  /* ------------------------------ the phrase sets' turns ------------------------------ */

  private eligible(): boolean {
    const b = this.built;
    return !!b && !this.failed && !this.disposed && !this.reduced && !this.paused && this.want && b.slotRows > 0 && this.opts.content.sets.length > 1 && this.motion.phase === "rest" && this.swap === null;
  }

  private cancelCycle(): void {
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = 0;
  }

  /** Wait `dwellMs` for the next swap, when the caption is at rest and nothing forbids it. At rest no frame is asked for meanwhile. */
  private maybeSchedule(): void {
    if (this.timer || !this.eligible()) return;
    this.timer = window.setTimeout(() => {
      this.timer = 0;
      if (this.startSwap(performance.now(), false)) this.opts.onChange();
    }, CAPTION.cycle.dwellMs);
  }

  private startSwap(now: number, force: boolean): boolean {
    const b = this.built;
    if (!b || this.swap || (!force && !this.eligible())) return false;
    const n = this.opts.content.sets.length;
    if (n < 2 || b.slotRows < 1) return false;
    const from = this.cur;
    const to = (from + 1) % n;
    const rows = b.slotRows;
    this.swaps++;
    const sides = entranceSides((this.motion.seed ?? 0) ^ 0x5bd1e995, this.swaps, rows * 2);
    this.swap = { from, to, t0: now, frozen: null, out: sides.slice(0, rows), in: sides.slice(rows) };
    this.lastOut = this.swap.out;
    this.lastIn = this.swap.in;
    return true;
  }

  /** The swap's end (or its abandonment): the incoming set is the one shown. */
  private finishSwap(): void {
    if (!this.swap) return;
    this.cur = this.swap.to;
    this.swap = null;
  }

  /* ------------------------------ per frame ------------------------------ */

  /**
   * Per frame, after the camera is current: put every line on its parallel for the camera's tilt and turn it to where the clock has it. `lon`
   * and `lat` are the view's longitude and latitude (degrees: the lines are centred on the view's meridian; the parallels they are on are picked
   * for the latitude, `solveParallels`, which glides there over `CAPTION.glideMs`), `d` the camera's distance, `now` the clock the entrance runs
   * on (the same one `show` and `hide` were given).
   */
  sync(d: number, lon: number, lat: number, now: number): void {
    this.viewLat = lat;
    const b = this.built;
    if (!b || this.failed) return;
    if (this.sizing && b.key !== this.keyFor()) void this.build();
    if (this.motion.waiting) this.motion.begin(now, CAPTION.enter.loadDelayMs);
    // A fade changes the canvas's opacity only (a CSS transition, run by the compositor): the lines go on following the camera exactly as at rest
    // (zoom, drag, tilt: the same uniforms and one render a frame the globe draws anyway), and when it is over the caption is hidden.
    this.motion.tick(now);
    // the parallels glide to the camera's tilt (at once under reduced motion, on the first frame, and when hidden: nobody sees it)
    const dt = Math.min(Math.max(now - this.lastAt, 0), 64);
    this.lastAt = now;
    const hiddenNow = this.motion.phase === "hidden" && this.motion.pinned === null && this.motion.pinnedAngle === null;
    if (hiddenNow && this.swap) this.finishSwap();
    if (this.motion.phase === "fade") {
      // In a fade the rows stay on the parallels they were on: they are part of the earth, which turns and tilts under the camera, and nothing is
      // solved again (no work for a caption that is leaving).
      this.gliding = false;
    } else {
      if (this.phi === null || this.reduced || hiddenNow) this.phi = lat;
      else this.phi += (lat - this.phi) * (1 - Math.exp(-dt / CAPTION.glideMs));
      this.gliding = Math.abs(lat - this.phi) > 0.02;
      if (!this.gliding) this.phi = lat;
      if (this.placedPhi !== this.phi) this.place(this.phi);
    }
    // Hidden (the showcase is off and the lines have gone): every mesh is hidden once, and then there is nothing to do, whatever the camera does.
    if (hiddenNow) {
      if (!this.allHidden) {
        for (const v of b.variants) v.mesh.visible = false;
        this.allHidden = true;
        this.anyVisible = false;
        this.lastThetas.length = b.pieces.length;
        for (let r = 0; r < b.pieces.length; r++) this.lastThetas[r] = this.rowStart(r) * this.motion.side(r);
      }
      return;
    }
    this.allHidden = false;
    // a swap that has run its course
    if (this.swap && (this.swap.frozen ?? now) - this.swap.t0 >= swapMs(b.slotRows)) {
      this.finishSwap();
      this.maybeSchedule();
    }
    const rows = b.pieces.length;
    this.lastThetas.length = rows;
    const rowTheta: number[] = [];
    for (let r = 0; r < rows; r++) {
      rowTheta.push(this.motion.angle(now, r, this.rowStart(r)));
      this.lastThetas[r] = rowTheta[r]!;
    }
    const tSwap = this.swap ? (this.swap.frozen ?? now) - this.swap.t0 : 0;
    let any = false;
    for (const v of b.variants) {
      let theta = 0;
      let on = false;
      if (v.set < 0) {
        theta = rowTheta[v.row]!;
        on = true;
      } else if (this.swap) {
        const sw = this.swap;
        if (v.set === sw.from) {
          theta = swapExitAngle(tSwap, v.row, sw.out[v.row]! * this.startFor(v));
          on = true;
        } else if (v.set === sw.to) {
          theta = swapEnterAngle(tSwap, v.row, b.slotRows, sw.in[v.row]! * this.startFor(v));
          on = true;
        }
      } else if (v.set === this.cur) {
        theta = rowTheta[v.row]!;
        on = true;
      }
      const hidden = !on || lineHidden(theta, v.line, d, lat);
      v.mesh.visible = !hidden;
      if (hidden) continue;
      any = true;
      // The earth's axis is y: a line's own meridian is the view's (`lon`), turned by the entrance's `theta` (east positive, west negative).
      this.tmp.makeRotationY((lon * Math.PI) / 180 + theta);
      v.mesh.matrix.copy(this.tmp);
      v.mesh.matrixWorldNeedsUpdate = true;
    }
    this.anyVisible = any;
    this.maybeSchedule();
  }

  /** How far behind the planet row `r` (its widest variant) starts, for its parallel now. */
  private rowStart(r: number): number {
    const b = this.built!;
    const pl = b.places[r]!;
    return entranceStart({ baseLat: pl.baseLat, halfSpan: pl.halfSpan }, this.viewLat, this.sizing?.d ?? 16);
  }

  private startFor(v: Variant): number {
    return entranceStart(v.line, this.viewLat, this.sizing?.d ?? 16);
  }

  /** Put the rows on the parallels picked for a camera looking at latitude `phi`, and hand every strip its uniforms. */
  private place(phi: number): void {
    const b = this.built;
    const sizing = this.sizing;
    if (!b || !sizing) return;
    const t0 = performance.now();
    const solved = solveParallels(b.pieces, phi, sizing.d, b.places, minScaleFor(b.pieces, sizing.r), b.hint);
    this.placeMs = performance.now() - t0;
    this.placeMax = Math.max(this.placeMax, this.placeMs);
    this.places++;
    b.hint = solved.hint;
    b.scale = solved.scale;
    b.clearances = solved.clearances;
    b.centreY = solved.centreY;
    const r = this.radius ?? CAPTION.radius;
    for (const v of b.variants) {
      const pl = b.places[v.row]!;
      // the row's parallel and size, the strip's own width: a set's row is as wide as its words
      lineOf(v.piece, { ...pl, halfSpan: spanOf(v.piece.box.widthEm, pl.capR, pl.baseLat) / 2 }, v.line);
      const u = v.material.uniforms;
      u.uBaseLat!.value = (v.line.baseLat * Math.PI) / 180;
      u.uBelow!.value = v.line.below;
      u.uAbove!.value = v.line.above;
      u.uHalfSpan!.value = v.line.halfSpan;
      u.uR!.value = r;
    }
    this.placedPhi = phi;
  }

  /** Draw the caption over the globe's frame. */
  renderCrisp(camera: PerspectiveCamera, rect: CaptionRect, dpr: number): void {
    if (!this.anyVisible || !this.built || this.failed) {
      this.crisp.hide();
      return;
    }
    this.crisp.render(camera, rect, Math.min(dpr, 2));
  }

  /**
   * The two ends of the line the widest on the screen, in the globe's frame where the line is now (positions at its baseline, turned as the mesh
   * is): for the checks that measure the caption's size on the screen. Null when no line is in view.
   */
  widestEnds(): { left: [number, number, number]; right: [number, number, number] } | null {
    const b = this.built;
    if (!b) return null;
    let best: Variant | null = null;
    for (const v of b.variants) if (v.mesh.visible && (!best || v.line.halfSpan > best.line.halfSpan)) best = v;
    if (!best) return null;
    const line = best.line;
    const m = best.mesh.matrix.elements;
    const at = (a: number): [number, number, number] => {
      const p = parallelPoint(a, line.baseLat, this.radius ?? CAPTION.radius);
      return [m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2], m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2], m[2]! * p[0] + m[6]! * p[1] + m[10]! * p[2]];
    };
    return { left: at(-line.halfSpan), right: at(line.halfSpan) };
  }

  /**
   * The edges of every strip in view, in the globe's frame as drawn (the top edge and the bottom edge of the ink box, `samples` + 1 points each):
   * for the checks that measure the caption's real layout on the screen (clearances between rows, where the block sits).
   */
  edges(samples = 16): { row: number; top: [number, number, number][]; bottom: [number, number, number][] }[] {
    const b = this.built;
    if (!b) return [];
    const out: { row: number; top: [number, number, number][]; bottom: [number, number, number][] }[] = [];
    for (const v of b.variants) {
      if (!v.mesh.visible) continue;
      const m = v.mesh.matrix.elements;
      const r = this.radius ?? CAPTION.radius;
      const turn = (p: [number, number, number]): [number, number, number] => [m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2], m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2], m[2]! * p[0] + m[6]! * p[1] + m[10]! * p[2]];
      const top: [number, number, number][] = [];
      const bottom: [number, number, number][] = [];
      for (let k = 0; k <= samples; k++) {
        const a = (-1 + (2 * k) / samples) * v.line.halfSpan;
        top.push(turn(parallelPoint(a, v.line.baseLat + (v.line.above * 180) / Math.PI, r)));
        bottom.push(turn(parallelPoint(a, v.line.baseLat - (v.line.below * 180) / Math.PI, r)));
      }
      out.push({ row: v.row, top, bottom });
    }
    return out;
  }

  /** The globe is not drawn (the street map owns the view): the second canvas must not show a stale frame. */
  hideCrisp(): void {
    this.crisp.hide();
  }

  state(): CaptionState {
    const b = this.built;
    const shown = (b?.variants ?? []).filter((v) => v.set < 0 || v.set === (this.swap ? this.swap.to : this.cur));
    return {
      built: b !== null,
      phase: this.motion.phase,
      opacity: this.crisp.opacity,
      wrapped: false,
      scale: b?.scale ?? 1,
      viewLat: this.viewLat,
      parallelsFor: this.phi ?? this.viewLat,
      capCells: this.sizing ? (CAPTION.capR.slot * this.sizing.r) / this.sizing.cell : 0,
      seed: this.motion.seed,
      lines: shown.map((v) => ({
        text: v.line.text,
        parent: v.row,
        theta: this.lastThetas[v.row] ?? 0,
        visible: v.mesh.visible,
        halfSpanDeg: (v.line.halfSpan * 180) / Math.PI,
        baseLat: v.line.baseLat,
        capR: v.line.capR,
        side: this.motion.side(v.row),
        styles: [...new Set(v.line.runs.map((r) => r.style ?? "plain"))],
      })),
      cycle: { sets: this.opts.content.sets.length, current: this.cur, swapping: this.swap !== null, waiting: this.timer !== 0, paused: this.paused, swaps: this.swaps, lastOut: this.lastOut, lastIn: this.lastIn },
      clearances: b?.clearances ?? [],
      centreY: b?.centreY ?? 0,
      solver: { lastMs: this.placeMs, maxMs: this.placeMax, runs: this.places },
      texture: this.texSizes,
      colors: { face: this.face.value, outline: this.outline.value, side: this.side.value },
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.token++;
    this.cancelCycle();
    this.release();
    this.unit?.dispose();
    this.unit = null;
    this.crisp.dispose();
    this.built = null;
  }

  /** Take the strips out of the scene and free what they hold (texture, per-strip material). */
  private release(): void {
    for (const v of this.built?.variants ?? []) {
      this.crisp.scene.remove(v.mesh);
      v.material.dispose();
    }
    for (const t of this.textures) t.dispose();
    this.textures = [];
    this.texSizes = [];
    this.allHidden = false;
    this.anyVisible = false;
  }

  /* ------------------------------ building ------------------------------ */

  private keyFor(): string {
    const s = this.sizing;
    return `${s ? Math.round(s.r) : 0}|${s ? s.cell : 0}|${s ? Math.round(s.d * 10) : 0}|${this.radius ?? 0}`;
  }

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
    const content = this.opts.content;
    // The faces first: the texture is drawn once and must not be drawn in a stand-in. A style whose face failed is drawn in its fallback style.
    const used = new Set<CaptionStyleKey>();
    for (const set of content.sets) for (const row of set) for (const r of row) used.add(r.style ?? "plain");
    for (const row of content.fixed) for (const r of row) used.add(r.style ?? "plain");
    const ok = new Map<CaptionStyleKey, CaptionStyleKey>();
    await Promise.all(
      [...used].map(async (style) => {
        const loaded = await loadStyle(style);
        ok.set(style, loaded ? style : (CAPTION_FALLBACK_STYLE[style] ?? "plain"));
      }),
    );
    if (this.disposed || token !== this.token) return;
    const clean = (row: readonly CaptionRun[]): CaptionRun[] =>
      row.filter((r) => r.text.length > 0).map((r) => ({ text: r.text, style: ok.get(r.style ?? "plain") ?? "plain" }) as CaptionRun);
    const sets = content.sets.map((set) => set.map(clean).filter((row) => row.some((r) => r.text.trim().length > 0)));
    const fixed = content.fixed.map(clean).filter((row) => row.some((r) => r.text.trim().length > 0));
    const slotRows = sets.reduce((a, s) => Math.max(a, s.length), 0);
    if (slotRows + fixed.length === 0) return;
    this.failed = false;
    const emPx = CAPTION.texCap / CAPTION_FACE.capEm;
    const probe = document.createElement("canvas").getContext("2d");
    if (!probe) throw new Error("no 2D context");
    const hasSpacing = "letterSpacing" in probe;
    const outlinePx = CAPTION.outline * CAPTION.texCap;
    const faceOf = (run: CaptionRun) => CAPTION_FACES[CAPTION_STYLES[run.style ?? "plain"].face];
    const emboldenPx = (run: CaptionRun) => faceOf(run).embolden * CAPTION.texCap;
    /** Set `c`'s font and spacing for a run; the advance of the run (tracking included) is what `measureText` says then. */
    const setRun = (c: CanvasRenderingContext2D, run: CaptionRun) => {
      const f = faceOf(run);
      c.font = captionFont(run.style ?? "plain", emPx);
      if (hasSpacing) (c as unknown as { letterSpacing: string }).letterSpacing = `${f.tracking * emPx * f.scale}px`;
    };
    const advance = (run: CaptionRun, m: TextMetrics) => m.width + (hasSpacing ? 0 : faceOf(run).tracking * emPx * faceOf(run).scale * run.text.length);
    /**
     * The ink of a piece, measured from the faces: where the words start and end on the baseline (a script overhangs its advance, an italic its
     * first glyph's), how high and how low they go, and the room of the outline: the texture and the strip are made to that, not to the advance.
     */
    const boxPx = (runs: readonly CaptionRun[]) => {
      let x = 0;
      let minL = 0;
      let maxR = 0;
      let asc = 0;
      let desc = 0;
      let margin = 0;
      const at: number[] = [];
      for (const run of runs) {
        setRun(probe, run);
        const m = probe.measureText(run.text);
        const f = faceOf(run);
        at.push(x);
        minL = Math.min(minL, x - m.actualBoundingBoxLeft);
        maxR = Math.max(maxR, x + Math.max(advance(run, m), m.actualBoundingBoxRight));
        asc = Math.max(asc, m.actualBoundingBoxAscent - f.dy * emPx);
        desc = Math.max(desc, m.actualBoundingBoxDescent + f.dy * emPx);
        margin = Math.max(margin, outlinePx + emboldenPx(run) / 2 + 3);
        x += advance(run, m);
      }
      return { at, x0: margin - minL, width: maxR - minL + 2 * margin, above: Math.max(asc + margin, CAPTION.texCap * 1.05), below: desc + margin };
    };
    const boxOf = (runs: readonly CaptionRun[]) => {
      const b = boxPx(runs);
      return { widthEm: b.width / emPx, aboveCaps: b.above / CAPTION.texCap, belowCaps: b.below / CAPTION.texCap };
    };
    const measure = (r: CaptionRun) => {
      setRun(probe, r);
      return advance(r, probe.measureText(r.text)) / emPx;
    };
    // every strip there is: the rows of every phrase set and the fixed rows, each with its own texture; the solver sees each row as its widest
    const rowsOf: { row: number; set: number; runs: CaptionRun[] }[] = [];
    for (let s = 0; s < sets.length; s++) for (let r = 0; r < sets[s]!.length; r++) rowsOf.push({ row: r, set: s, runs: sets[s]![r]! });
    fixed.forEach((runs, i) => rowsOf.push({ row: slotRows + i, set: -1, runs }));
    const totalRows = slotRows + fixed.length;
    const reps: CaptionRun[][] = [];
    for (let r = 0; r < totalRows; r++) {
      const cands = rowsOf.filter((x) => x.row === r);
      reps.push(cands.reduce((best, c) => (boxOf(c.runs).widthEm > boxOf(best.runs).widthEm ? c : best)).runs);
    }
    const caps = reps.map((_, r) => (r < slotRows ? CAPTION.capR.slot : CAPTION.capR.fixed));
    const plan = planPieces({ rows: reps, caps, measure, box: boxOf, rPx: this.sizing.r });
    // the representative boxes take the largest extent over the variants of the row (the solver's clearance must hold for any of them)
    plan.pieces.forEach((p, r) => {
      for (const c of rowsOf.filter((x) => x.row === r)) {
        const b = boxOf(c.runs);
        p.box = { widthEm: Math.max(p.box.widthEm, b.widthEm), aboveCaps: Math.max(p.box.aboveCaps, b.aboveCaps), belowCaps: Math.max(p.box.belowCaps, b.belowCaps) };
      }
    });
    // The sheets first (they can throw): a rebuild replaces the strips only once the new ones are made.
    const sheets = rowsOf.map((x) => {
      const b = boxPx(x.runs);
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(b.width);
      canvas.height = Math.ceil(b.above + b.below);
      const c = canvas.getContext("2d");
      if (!c) throw new Error("no 2D context");
      c.textBaseline = "alphabetic";
      c.textAlign = "left";
      c.lineJoin = "round";
      c.miterLimit = 2;
      // The words one after the other on one baseline. First the outline (red, drawn at twice its width: the half inside the letter is covered by
      // the fill that follows), then the inside (green): the outline is outside the glyph, so the face keeps its whole area.
      const baseline = b.above;
      for (const pass of ["stroke", "fill"] as const) {
        x.runs.forEach((run, k) => {
          setRun(c, run);
          const f = faceOf(run);
          const px = b.x0 + b.at[k]!;
          const py = baseline + f.dy * emPx;
          if (pass === "stroke") {
            c.lineWidth = outlinePx * 2 + emboldenPx(run);
            c.strokeStyle = "rgb(255 0 0)";
            c.strokeText(run.text, px, py);
          } else {
            c.fillStyle = "rgb(0 255 0)";
            c.fillText(run.text, px, py);
            if (f.embolden > 0) {
              c.lineWidth = emboldenPx(run);
              c.strokeStyle = "rgb(0 255 0)";
              c.strokeText(run.text, px, py);
            }
          }
        });
      }
      return { canvas, box: boxOf(x.runs) };
    });
    this.release();
    this.built = null;
    const anisotropy = Math.min(this.opts.maxAnisotropy, this.crisp.maxAnisotropy);
    if (!this.unit) {
      const unit = unitBand();
      this.unit = new BufferGeometry();
      this.unit.setAttribute("position", new BufferAttribute(unit.attributes, 3));
      this.unit.setIndex(new BufferAttribute(unit.indices, 1));
    }
    const radius = this.radius ?? CAPTION.radius;
    const variants: Variant[] = rowsOf.map((x, i) => {
      const { canvas, box } = sheets[i]!;
      const tex = new CanvasTexture(canvas);
      tex.generateMipmaps = true;
      tex.minFilter = LinearMipmapLinearFilter;
      tex.magFilter = LinearFilter;
      tex.anisotropy = anisotropy;
      this.textures.push(tex);
      this.texSizes.push({ width: canvas.width, height: canvas.height });
      const material = this.makeMaterial(tex, radius);
      const mesh = new Mesh(this.unit!, material);
      mesh.matrixAutoUpdate = false;
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.renderOrder = 7;
      this.crisp.scene.add(mesh);
      const piece: CaptionPiece = { runs: x.runs, text: runsText(x.runs), parent: x.row, cap: plan.pieces[x.row]!.cap, box };
      return { row: x.row, set: x.set, piece, line: {} as CaptionLine, mesh, material };
    });
    this.built = { pieces: plan.pieces, places: [], variants, slotRows, scale: 1, clearances: [], centreY: 0, hint: null, key };
    this.placedPhi = null;
    this.cur = Math.min(this.cur, Math.max(0, sets.length - 1));
    this.place(this.phi ?? this.viewLat);
    this.motion.setStarts(
      plan.pieces.map((_, r) => this.rowStart(r)),
      plan.pieces.map((_, r) => r),
    );
    if (this.want && this.reduced) this.motion.settle(true);
    this.opts.onChange();
  }
}
