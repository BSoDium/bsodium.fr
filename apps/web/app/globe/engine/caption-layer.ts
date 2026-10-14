/**
 * The caption as objects of the globe's own scene (docs/web-architecture.md, "Orbiting type"; the maths is engine/caption.ts).
 *
 * Each line is a strip of the sphere `CAPTION.radius` with a texture of its text, drawn in the SAME pass as the globe: at the drawing buffer's
 * resolution (one art cell per buffer pixel, upscaled with nearest-neighbour), in two colours of the theme (the ink, and the page colour for the
 * keyline), by a shader that thresholds the texture, so it is exactly as pixelated as the coastlines are and holds only palette colours. It is
 * depth-tested against the planet's disc (the far side is hidden by the planet) and back-face culled (the shell's own far side is not drawn): a
 * letter past the horizon is gone, it is never seen mirrored or half cut.
 *
 * Cost. Nothing is laid out or rasterised per frame: the text is drawn once into one small canvas per line when the face is there (a font, a
 * size class), and a frame is a matrix per line (the entrance's rotation) and two draw calls. Nothing runs while the lines are hidden (they are
 * `visible = false`), and nothing animates at rest: the frame loop is asked for frames only while an entrance or a departure is on.
 */
import { BufferAttribute, BufferGeometry, CanvasTexture, FrontSide, LinearFilter, LinearMipmapLinearFilter, Matrix4, Mesh, ShaderMaterial, Vector3, type Scene } from "three";
import type { GlobeTheme } from "./colors";
import { bandColumns, bandFrame, bandMesh, CAPTION_FONTS, CaptionMotion, entranceStart, layoutCaption, legibleFont, lineHidden, type CaptionFont, type CaptionLayout } from "./caption";
import type { ViewBasis } from "./geo";
import { FONT_CAP, forEachInk, measureText } from "./pixel-font/pixel-font";
import { CAPTION } from "./tuning";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** The texture holds the fill in its green channel and the keyline in its red one; coverage is its alpha: thresholded, so the pass draws two colours. */
const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform vec3 uInk;
  uniform vec3 uBack;
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(uMap, vUv, ${CAPTION.lodBias.toFixed(2)});
    if (t.a < ${CAPTION.cut.toFixed(2)}) discard;
    gl_FragColor = vec4(t.g > t.r ? uInk : uBack, 1.0);
  }
`;

interface Built {
  sizeKey: string;
  font: CaptionFont;
  layout: CaptionLayout;
  meshes: Mesh[];
  starts: number[];
}

export interface CaptionState {
  font: CaptionFont;
  wanted: CaptionFont;
  capCells: number;
  built: boolean;
  phase: string;
  lines: { text: string; theta: number; visible: boolean; halfSpanDeg: number; lambdaDeg: number }[];
  capR: number;
  texture: { width: number; height: number }[];
}

/**
 * One load per face of the page, for the page's life: `document.fonts` keeps what is added (a rebuild for another size must not add the same file
 * again). The promise settles when the face is usable or has failed (a failed face is the system face: the lines are set in it rather than not at all).
 */
const FACE_LOADS = new Map<string, Promise<void>>();
function loadFace(family: string, url: string, weight: number): Promise<void> {
  const key = `${family}|${weight}|${url}`;
  let p = FACE_LOADS.get(key);
  if (!p) {
    p = (async () => {
      try {
        const face = new FontFace(family, `url(${url})`, { weight: String(weight), display: "block" });
        document.fonts.add(face);
        await face.load();
      } catch {
        // the face did not come
      }
    })();
    FACE_LOADS.set(key, p);
  }
  return p;
}

export class CaptionLayer {
  private motion = new CaptionMotion();
  private built: Built | null = null;
  private material: ShaderMaterial;
  private textures: CanvasTexture[] = [];
  private geometries: BufferGeometry[] = [];
  /** The per-line materials (clones over the shared shader): each is disposed with its line. */
  private materials: ShaderMaterial[] = [];
  /** A build that threw (a canvas context refused, ...): the caption is not there and asks for no frames. */
  private failed = false;
  private vE = new Vector3();
  private vN = new Vector3();
  private vC = new Vector3();
  /** The basis and turns the meshes were last placed with: a frame that changes none of them does nothing. */
  private placed: { key: number[]; thetas: number[] } | null = null;
  private allHidden = false;
  private disposed = false;
  private want = false;
  private reduced: boolean;
  private lastThetas: number[] = [];
  private tmp = new Matrix4();
  private basisM = new Matrix4();
  private axis = new Vector3();
  private texSizes: { width: number; height: number }[] = [];
  /** The art cell (CSS px) and the planet's radius at the lowest zoom (CSS px): what decides which face reads and how big a bitmap pixel is. */
  private sizing: { cell: number; r: number } | null = null;
  private token = 0;
  private capCells = 0;

  constructor(
    private scene: Scene,
    private opts: {
      phrases: readonly string[];
      font: CaptionFont;
      theme: GlobeTheme;
      reduced: boolean;
      maxAnisotropy: number;
      /** A face arrived and the lines are built: a frame is wanted. */
      onChange(): void;
    },
  ) {
    this.reduced = opts.reduced;
    this.material = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uMap: { value: null }, uInk: { value: [1, 1, 1] }, uBack: { value: [0, 0, 0] } },
      side: FrontSide,
      depthTest: true,
      depthWrite: true,
      transparent: false,
    });
    this.setTheme(opts.theme);
  }

  /**
   * Where the caption will be seen: the art cell and the planet's radius at the lowest zoom, CSS px (the renderer tells at start and when the
   * viewport changes). The face is the first of the chain from the one asked for whose strokes are at least a cell wide at that size; the
   * lines are built when it is known and again only when the choice changes.
   */
  setSizing(cell: number, r: number): void {
    if (this.disposed || !(cell > 0) || !(r > 0)) return;
    this.sizing = { cell, r };
    this.capCells = (CAPTION.capR * r) / cell;
    const font = legibleFont(this.opts.font, this.capCells);
    if (this.built?.font === font && this.built.sizeKey === this.sizeKey(font)) {
      // what is built is what is wanted: a build for another face that is still on its way must not land on top of it
      this.token++;
      return;
    }
    void this.build(font);
  }

  /**
   * What a build depends on besides the face: only the bitmap face's scale does (a pixel of the face is a whole number of art cells), so the
   * other faces are not rebuilt when the size moves.
   */
  private sizeKey(font: CaptionFont): string {
    return font === "bitmap" && this.sizing ? `${Math.round(this.capCells)}` : "";
  }

  setTheme(theme: GlobeTheme): void {
    const u = this.material.uniforms;
    u.uInk!.value = [...theme.ink];
    u.uBack!.value = [...theme.background];
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
    // Nothing to turn before the lines exist (the face is still coming, or the build failed): no frames are asked for.
    return this.built !== null && !this.failed && this.motion.animating;
  }

  get isBuilt(): boolean {
    return this.built !== null;
  }

  /**
   * Per frame, after the camera is current: turn each line to where the clock has it and put it in the view's frame. `now` is the clock the
   * entrance runs on (the same one `show` and `hide` were given).
   */
  sync(basis: ViewBasis, now: number): void {
    const b = this.built;
    if (!b || this.failed) return;
    if (this.motion.waiting) this.motion.begin(now, CAPTION.enter.loadDelayMs);
    const n = b.meshes.length;
    // Hidden (the showcase is off and the lines have gone): every mesh is hidden once, and then there is nothing to do, whatever the camera does.
    if (this.motion.phase === "hidden" && this.motion.pinned === null && this.motion.pinnedAngle === null) {
      if (!this.allHidden) {
        for (const m of b.meshes) m.visible = false;
        this.allHidden = true;
        this.placed = null;
        this.lastThetas.length = n;
        for (let i = 0; i < n; i++) this.lastThetas[i] = b.starts[i]!;
      }
      return;
    }
    this.allHidden = false;
    const d = basis.d;
    const e = basis.east;
    const nn = basis.north;
    const c = basis.c;
    this.lastThetas.length = n;
    let changed = this.placed === null;
    const key = this.placed?.key ?? new Array<number>(10).fill(0);
    const next = [e[0], e[1], e[2], nn[0], nn[1], nn[2], c[0], c[1], c[2], d];
    for (let k = 0; k < 10; k++) {
      if (key[k] !== next[k]) changed = true;
      key[k] = next[k]!;
    }
    const thetas = this.placed?.thetas ?? new Array<number>(n).fill(NaN);
    for (let i = 0; i < n; i++) {
      const theta = this.motion.angle(now, i, b.starts[i]!);
      if (thetas[i] !== theta) changed = true;
      thetas[i] = theta;
      this.lastThetas[i] = theta;
    }
    this.placed = { key, thetas };
    // At rest with the camera still (the showcase is on and nothing moves): the meshes are where they were.
    if (!changed) return;
    // the view's frame as a matrix: its columns are east, north and the direction to the camera, in the globe's frame
    this.vE.set(e[0], e[1], e[2]);
    this.vN.set(nn[0], nn[1], nn[2]);
    this.vC.set(c[0], c[1], c[2]);
    this.basisM.makeBasis(this.vE, this.vN, this.vC);
    const { A } = bandFrame();
    this.axis.set(A[0], A[1], A[2]);
    for (let i = 0; i < n; i++) {
      const mesh = b.meshes[i]!;
      const theta = thetas[i]!;
      const hidden = lineHidden(theta, b.layout.lines[i]!, d);
      mesh.visible = !hidden;
      if (hidden) continue;
      this.tmp.makeRotationAxis(this.axis, theta);
      mesh.matrix.multiplyMatrices(this.basisM, this.tmp);
      mesh.matrixWorldNeedsUpdate = true;
    }
  }

  state(): CaptionState {
    const b = this.built;
    return {
      font: b?.font ?? this.opts.font,
      wanted: this.opts.font,
      capCells: this.capCells,
      built: b !== null,
      phase: this.motion.phase,
      lines: (b?.layout.lines ?? []).map((l, i) => ({
        text: l.text,
        theta: this.lastThetas[i] ?? 0,
        visible: b?.meshes[i]?.visible ?? false,
        halfSpanDeg: (l.halfSpan * 180) / Math.PI,
        lambdaDeg: (l.lambda * 180) / Math.PI,
      })),
      capR: b?.layout.capR ?? 0,
      texture: this.texSizes,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.token++;
    this.release();
    this.material.dispose();
    this.built = null;
  }

  /** Take the lines out of the scene and free what they hold (geometry, texture, the per-line material). */
  private release(): void {
    for (const m of this.built?.meshes ?? []) this.scene.remove(m);
    for (const g of this.geometries) g.dispose();
    for (const t of this.textures) t.dispose();
    for (const m of this.materials) m.dispose();
    this.geometries = [];
    this.textures = [];
    this.materials = [];
    this.texSizes = [];
    this.placed = null;
    this.allHidden = false;
  }

  /* ------------------------------ building ------------------------------ */

  private async build(font: CaptionFont): Promise<void> {
    const token = ++this.token;
    try {
      await this.buildLines(font, token);
    } catch {
      // Anything the browser refuses (a 2D context, a texture): the caption is not there, quietly, and it asks for no frames.
      if (token === this.token && !this.disposed) {
        this.release();
        this.built = null;
        this.failed = true;
      }
    }
  }

  private async buildLines(font: CaptionFont, token: number): Promise<void> {
    const spec = CAPTION_FONTS[font];
    if (spec.url && typeof FontFace !== "undefined" && typeof document !== "undefined") await loadFace(spec.family, spec.url, spec.weight);
    if (this.disposed || token !== this.token) return;
    this.failed = false;
    const texts = this.opts.phrases.map((p) => (spec.upper ? p.trim().toLocaleUpperCase("en") : p.trim())).filter((p) => p.length > 0);
    if (texts.length === 0) return;
    // The sheets first (they can throw): a rebuild replaces the lines only once the new ones are made.
    const sheets = font === "bitmap" ? this.bitmapSheets(texts) : this.canvasSheets(font, texts);
    const widths = sheets.map((s) => s.widthEm);
    let capR: number = CAPTION.capR;
    if (font === "bitmap" && this.sizing) {
      // One pixel of the face is a whole number of art cells at the middle of the face (the map's own labels are drawn so), the largest that fits.
      const { cell, r } = this.sizing;
      for (let k = Math.max(1, Math.round((CAPTION.capR * r) / cell / FONT_CAP)); k >= 1; k--) {
        const candidate = (FONT_CAP * k * cell) / r;
        const l = layoutCaption(texts, widths, spec.capEm, spec.boxCaps, candidate);
        capR = candidate;
        if (Math.abs(l.capR - candidate) < 1e-9) break;
      }
    }
    const layout = layoutCaption(texts, widths, spec.capEm, spec.boxCaps, capR);
    this.release();
    this.built = null;
    const meshes: Mesh[] = [];
    layout.lines.forEach((line, i) => {
      const sheet = sheets[i]!;
      const tex = new CanvasTexture(sheet.canvas);
      tex.generateMipmaps = true;
      tex.minFilter = LinearMipmapLinearFilter;
      tex.magFilter = LinearFilter;
      tex.anisotropy = this.opts.maxAnisotropy;
      this.textures.push(tex);
      this.texSizes.push({ width: sheet.canvas.width, height: sheet.canvas.height });
      const bm = bandMesh(line, bandColumns(line), 2);
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(bm.positions, 3));
      g.setAttribute("uv", new BufferAttribute(bm.uvs, 2));
      g.setIndex(new BufferAttribute(bm.indices, 1));
      this.geometries.push(g);
      // one material per line (its own texture) over the shared shader
      const mat = this.material.clone();
      mat.uniforms = { uMap: { value: tex }, uInk: this.material.uniforms.uInk!, uBack: this.material.uniforms.uBack! };
      this.materials.push(mat);
      const mesh = new Mesh(g, mat);
      mesh.matrixAutoUpdate = false;
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.renderOrder = 7; // after the globe's layers (the markers are 5, the outline 6): in front of them, behind nothing
      this.scene.add(mesh);
      meshes.push(mesh);
    });
    const starts = layout.lines.map((l) => entranceStart(l));
    this.motion.setStarts(starts);
    this.built = { font, layout, meshes, starts, sizeKey: this.sizeKey(font) };
    if (this.want && this.reduced) this.motion.settle(true);
    this.opts.onChange();
  }

  /** One canvas per line in a face of the page: keyline (red) then fill (green), at `CAPTION.texCap` texels a cap height. */
  private canvasSheets(font: CaptionFont, texts: readonly string[]): { canvas: HTMLCanvasElement; widthEm: number }[] {
    const spec = CAPTION_FONTS[font];
    const emPx = CAPTION.texCap / spec.capEm;
    const face = `${spec.weight} ${emPx}px "${spec.family}", system-ui, sans-serif`;
    const outlinePx = CAPTION.outline * CAPTION.texCap;
    const pad = Math.ceil(outlinePx * 2 + 4);
    const probe = document.createElement("canvas").getContext("2d");
    if (probe) probe.font = face;
    return texts.map((text) => {
      if (!probe) throw new Error("no 2D context");
      const advance = probe.measureText(text).width + spec.tracking * emPx * text.length;
      const w = Math.ceil(advance + 2 * pad);
      const h = Math.ceil(spec.boxCaps * CAPTION.texCap);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const c = canvas.getContext("2d");
      if (!c) throw new Error("no 2D context");
      c.font = face;
      c.textBaseline = "alphabetic";
      c.textAlign = "left";
      c.lineJoin = "round";
      c.miterLimit = 2;
      const letterSpacing = (c as unknown as { letterSpacing?: string });
      if ("letterSpacing" in c) letterSpacing.letterSpacing = `${spec.tracking * emPx}px`;
      const baseline = h / 2 + CAPTION.texCap / 2;
      c.lineWidth = outlinePx * 2;
      c.strokeStyle = "rgb(255 0 0)";
      c.strokeText(text, pad, baseline);
      c.fillStyle = "rgb(0 255 0)";
      c.fillText(text, pad, baseline);
      return { canvas, widthEm: w / emPx };
    });
  }

  /** The repo's own pixel font, each of its pixels a square of a whole number of texels. */
  private bitmapSheets(texts: readonly string[]): { canvas: HTMLCanvasElement; widthEm: number }[] {
    const spec = CAPTION_FONTS.bitmap;
    const k = Math.max(2, Math.round(CAPTION.texCap / FONT_CAP));
    const emPx = 10 * k;
    const padPx = 3; // font pixels: room for the keyline
    const rows = Math.ceil(spec.boxCaps * FONT_CAP);
    const baseline = Math.floor((rows + FONT_CAP) / 2);
    return texts.map((text) => {
      const m = measureText(text);
      const wPx = m.w + 2 * padPx;
      const canvas = document.createElement("canvas");
      canvas.width = wPx * k;
      canvas.height = rows * k;
      const c = canvas.getContext("2d");
      if (!c) throw new Error("no 2D context");
      c.scale(k, k);
      // a stroke is a pixel of the face and a little more: at one art cell a pixel the sampling would otherwise drop the thinnest strokes
      const e = CAPTION.bitmapBold;
      c.fillStyle = "rgb(255 0 0)";
      forEachInk(text, padPx, baseline, (x, y) => c.fillRect(x - 1 - e, y - 1 - e, 3 + 2 * e, 3 + 2 * e));
      c.fillStyle = "rgb(0 255 0)";
      forEachInk(text, padPx, baseline, (x, y) => c.fillRect(x - e, y - e, 1 + 2 * e, 1 + 2 * e));
      return { canvas, widthEm: (wPx * k) / emPx };
    });
  }
}
