/**
 * The orbiting type as a DOM layer: one `<canvas>` (2D) in a transparent, `aria-hidden`, `pointer-events: none` wrapper inside the globe's stage,
 * above the WebGL canvas and below the labels, the street map's overlay and the hero. The maths is engine/orbit.ts and engine/ring.ts;
 * docs/web-architecture.md, "Orbiting type".
 *
 * Why a 2D canvas over the pixel buffer, and not DOM text or the pixel buffer itself:
 * - Not the pixel buffer. The globe is drawn at the art-pixel grid and scaled up with nearest neighbour; type that must be CRISP (the caption
 *   is the home screen's call to action) is drawn at the device's resolution, in a layer above it, as the labels are (engine/label-text.ts).
 * - Not DOM text. About 200 glyphs, each with its own 3D matrix, would be 200 style writes a frame and 200 elements for a crawler, a text search
 *   and a screen reader to skip; a canvas is one element with no text in the page (and it cannot be selected, which is what is wanted).
 *
 * Cost model. Nothing runs while the type is not shown (`alpha` 0: the wrapper is hidden, no timer, no listener but the page's visibility). While
 * shown it draws on the frames the globe draws anyway (the camera moved: the type goes with the planet in the same frame) and on its own
 * clock, at most one frame per `RING.frameMs`; never under reduced motion (a static composition) nor in a hidden tab. A frame is a clear of the
 * bounding box and about 200 `drawImage`s of an atlas cell with an affine each, computed from the projection (engine/orbit.ts): no layout, no text
 * measurement, no DOM read. The atlases (one cell per character, upright, at the device's resolution, in the page's own two faces) are built
 * ONCE per font load, theme, device ratio and size class; a theme change rebuilds them. The canvas is sized to the type's bounding box.
 *
 * Fades are the wrapper's CSS `opacity` (compositor only): the caller's value (the showcase fade of engine/fade.ts times the zoom regime).
 */
import type { GlobeTheme } from "./colors";
import { BAND_CELL, bandPhase, CAP_HEIGHT_EM, GlyphSet, layoutBand, placeBand, placeRing, RING_CELL, ringPhase, type BandLayout, type OrbitCam } from "./orbit";
import { ringLayout, type RingLayout } from "./ring";
import { roleColor } from "./palette";
import { RING } from "./tuning";

export interface OrbitFrame {
  /** Where the planet's centre is on the container, CSS px, and its silhouette's radius (the clip of the far side). */
  cx: number;
  cy: number;
  r: number;
  /** The camera's distance (planet radius 1) and focal length, CSS px: the globe's own perspective. */
  d: number;
  f: number;
  /** 0..1: how present the type is. */
  alpha: number;
  /** The container's size, CSS px (the canvas never goes beyond it). */
  width: number;
  height: number;
}

export interface OrbitState {
  shown: boolean;
  alpha: number;
  /** The ring: times the line goes round, its glyphs on the screen, the em in planet radii, the tracking. */
  repeats: number;
  length: number;
  letters: number;
  tracking: number;
  ringGlyphs: number;
  ringEm: number;
  /** The band: its glyphs on the screen, its em in planet radii, its lines. */
  bandGlyphs: number;
  bandEm: number;
  bandLines: number;
  /** Fonts the atlases were drawn with are the real ones. */
  fonts: boolean;
  looping: boolean;
  /** The clock's turns now, degrees (ring, band). */
  ringDeg: number;
  bandDeg: number;
  frames: number;
  lastMs: number;
  totalMs: number;
  canvas: { width: number; height: number; left: number; top: number; dpr: number };
  /** Extent of the glyph centres of the ring and the band on the container, CSS px. */
  ringBounds: { minX: number; maxX: number; minY: number; maxY: number };
  bandBounds: { minX: number; maxX: number; minY: number; maxY: number };
}

/** The ring's atlas: em in CSS px at which a letter is drawn (its cell is `RING_CELL` ems). */
const RING_ATLAS_EM = 24;
const FALLBACK_MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
const FALLBACK_DISPLAY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface Atlas {
  canvas: HTMLCanvasElement;
  /** The keyline's cells (the same layout, the stroke only, in the page colour), drawn for every glyph BEFORE any fill so no glyph's keyline cuts its neighbour; null for the ring. */
  outline: HTMLCanvasElement | null;
  /** Character code -> column. */
  col: Map<number, number>;
  /** The cell in device px and the em in device px. */
  cellW: number;
  cellH: number;
  em: number;
  /** The cell in em, as drawn (the device cell over the em: a whole number of device pixels). */
  wEm: number;
  hEm: number;
}

const rgbCss = (c: readonly [number, number, number]) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;

export class OrbitLayer {
  readonly root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private text: string;
  private phrases: readonly string[];
  private ringLayoutNow: RingLayout = { repeats: 1, emPerR: 0.04, tracking: 0.14 };
  private bandLayout: BandLayout = { em: RING.band.emR, lines: [] };
  private theme: GlobeTheme;
  private reduced: boolean;
  private hidden = typeof document !== "undefined" && document.hidden;
  private monoFamily = FALLBACK_MONO;
  private displayFamily = FALLBACK_DISPLAY;
  private fontsReady = false;
  private ring = new GlyphSet();
  private band = new GlyphSet();

  private frame: OrbitFrame | null = null;
  private shown = false;
  private raf = 0;
  private clock = 0;
  private lastAt = 0;
  private drawnAt = 0;
  private frames = 0;
  private lastMs = 0;
  private totalMs = 0;
  private opacityNow = -1;
  private ringAtlas: Atlas | null = null;
  private bandAtlas: Atlas | null = null;
  private atlasDpr = 0;
  private bandAtlasEm = 0;
  private codesRing: number[];
  private allocW = 0;
  private allocH = 0;
  private cssLeft = 0;
  private cssTop = 0;
  private dpr = 1;
  private disposed = false;

  constructor(host: HTMLElement, text: string, phrases: readonly string[], theme: GlobeTheme, reduced: boolean) {
    this.text = text;
    this.phrases = phrases;
    this.codesRing = [...new Set([...text].map((c) => c.charCodeAt(0)).filter((c) => c !== 32))];
    this.theme = theme;
    this.reduced = reduced;
    this.root = document.createElement("div");
    this.root.setAttribute("aria-hidden", "true");
    this.root.dataset.orbitLayer = "";
    Object.assign(this.root.style, { position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none", visibility: "hidden", opacity: "0" } satisfies Partial<CSSStyleDeclaration>);
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = 0; // no pixels until the type is shown
    Object.assign(this.canvas.style, { position: "absolute", left: "0", top: "0", display: "block", pointerEvents: "none" } satisfies Partial<CSSStyleDeclaration>);
    this.root.append(this.canvas);
    this.ctx = this.canvas.getContext("2d", { alpha: true });
    host.append(this.root);
    const cs = getComputedStyle(host);
    const mono = cs.getPropertyValue("--font-meta").trim() || cs.getPropertyValue("--font-mono").trim();
    if (mono) this.monoFamily = mono;
    const display = cs.getPropertyValue("--font-display").trim();
    if (display) this.displayFamily = display;
    document.addEventListener("visibilitychange", this.onVisibility);
    this.loadFonts();
  }

  /** Whether the type is on the screen now (the renderer skips the camera maths while it is not). */
  get isShown(): boolean {
    return this.shown;
  }

  /** The ring's line has the letters it was built with; for checks. */
  get letters(): number {
    return this.text.replace(/ /g, "").length;
  }

  /**
   * The silhouette's radius at the lowest zoom (CSS px): how the ring's line closes (`ringLayout`) and how big the band's atlas must be follow from
   * it, and only change with the viewport.
   */
  setLayout(rFloorPx: number): void {
    const next = ringLayout(this.text.length, rFloorPx);
    const cur = this.ringLayoutNow;
    const same = next.repeats === cur.repeats && next.emPerR === cur.emPerR && next.tracking === cur.tracking;
    // The band's atlas follows the em it is drawn at (at the planet's size at the fit, 1.41 times the floor's, with room).
    const want = Math.min(160, Math.max(36, Math.ceil(RING.band.emR * rFloorPx * 1.5)));
    const atlasChanged = want !== this.bandAtlasEm;
    this.ringLayoutNow = next;
    if (atlasChanged) {
      this.bandAtlasEm = want;
      this.bandAtlas = null;
    }
    if (!same || atlasChanged) this.redraw();
  }

  setTheme(theme: GlobeTheme): void {
    this.theme = theme;
    this.ringAtlas = null;
    this.bandAtlas = null;
    this.redraw();
  }

  setReduced(on: boolean): void {
    if (on === this.reduced) return;
    this.reduced = on;
    if (on) this.stopLoop();
    this.redraw();
  }

  /** `mask-image` of the container's inset fade (the panel's edge), or null. */
  setMask(mask: string | null): void {
    this.root.style.maskImage = mask ?? "";
    this.root.style.setProperty("-webkit-mask-image", mask ?? "");
  }

  /** Where the planet is now and how present the type is. Draws at once when it is shown (the camera moved: the type goes with the planet in the same frame). */
  update(frame: OrbitFrame): void {
    if (this.disposed) return;
    this.frame = frame;
    if (frame.alpha <= 0) {
      if (this.shown) this.hide();
      return;
    }
    this.setOpacity(frame.alpha);
    this.draw(performance.now(), false);
    this.wake();
  }

  state(): OrbitState {
    const f = this.frame;
    return {
      shown: this.shown,
      alpha: f?.alpha ?? 0,
      repeats: this.ringLayoutNow.repeats,
      length: this.text.length,
      letters: this.letters,
      tracking: this.ringLayoutNow.tracking,
      ringGlyphs: this.ring.count,
      ringEm: this.ringLayoutNow.emPerR,
      bandGlyphs: this.band.count,
      bandEm: this.bandLayout.em,
      bandLines: this.bandLayout.lines.length,
      fonts: this.fontsReady,
      looping: this.raf !== 0,
      ringDeg: (ringPhase(this.clock) * 180) / Math.PI,
      bandDeg: (bandPhase(this.clock) * 180) / Math.PI,
      frames: this.frames,
      lastMs: this.lastMs,
      totalMs: this.totalMs,
      canvas: { width: this.allocW, height: this.allocH, left: this.cssLeft, top: this.cssTop, dpr: this.dpr },
      ringBounds: { minX: this.ring.minX, maxX: this.ring.maxX, minY: this.ring.minY, maxY: this.ring.maxY },
      bandBounds: { minX: this.band.minX, maxX: this.band.maxX, minY: this.band.minY, maxY: this.band.maxY },
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopLoop();
    document.removeEventListener("visibilitychange", this.onVisibility);
    document.fonts?.removeEventListener?.("loadingdone", this.onFonts);
    this.root.remove();
    this.canvas.width = 0;
    this.ringAtlas = this.bandAtlas = null;
  }

  /* ------------------------------ fonts ------------------------------ */

  /** The two faces are the page's own (self-hosted, swapped in): the atlases and the band's advances are made once they are real. */
  private loadFonts(): void {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts) {
      this.fontsReady = true;
      return;
    }
    const ring = `${RING.type.weight} 20px ${this.monoFamily}`;
    const band = `${RING.band.weight} 40px ${this.displayFamily}`;
    fonts.addEventListener?.("loadingdone", this.onFonts);
    void Promise.all([fonts.load(ring), fonts.load(band)]).then(this.onFonts, this.onFonts);
  }

  private onFonts = () => {
    if (this.disposed) return;
    const fonts = document.fonts;
    const ready = !fonts || (fonts.check(`${RING.type.weight} 20px ${this.monoFamily}`) && fonts.check(`${RING.band.weight} 40px ${this.displayFamily}`));
    // A face that arrived changes the glyphs' shapes and the band's advances: the atlases and the layout are made again.
    if (ready === this.fontsReady && this.ringAtlas) return;
    this.fontsReady = ready;
    this.ringAtlas = null;
    this.bandAtlas = null;
    this.bandLayout = { em: RING.band.emR, lines: [] };
    this.redraw();
  };

  /* ------------------------------ clock ------------------------------ */

  private onVisibility = () => {
    this.hidden = document.hidden;
    if (this.hidden) this.stopLoop();
    else {
      this.lastAt = performance.now(); // the time spent hidden is not turned
      this.wake();
    }
  };

  private wantsLoop(): boolean {
    return this.shown && !this.reduced && !this.hidden && !this.disposed;
  }

  private wake(): void {
    if (this.raf || !this.wantsLoop()) return;
    this.lastAt = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private stopLoop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private loop = (now: number) => {
    this.raf = 0;
    if (!this.wantsLoop()) return;
    if (now - this.drawnAt >= RING.frameMs - 2) this.draw(now, true);
    this.raf = requestAnimationFrame(this.loop);
  };

  /* ------------------------------ drawing ------------------------------ */

  private setOpacity(alpha: number): void {
    // quantised to 1/64: a fade is some 12 distinct writes, a still layer none
    const q = Math.round(alpha * 64) / 64;
    if (q === this.opacityNow) return;
    this.opacityNow = q;
    this.root.style.opacity = String(q);
  }

  private hide(): void {
    this.shown = false;
    this.root.style.visibility = "hidden";
    this.root.style.opacity = "0";
    this.opacityNow = 0;
    this.stopLoop();
    // Release the pixels: a hidden layer costs nothing but a small element.
    if (this.allocW || this.allocH) {
      this.canvas.width = 0;
      this.canvas.height = 0;
      this.allocW = this.allocH = 0;
    }
  }

  /** One atlas: every character of `codes`, upright, in the face and colours given, on cells of `cell` ems, `emCss` CSS px a em at the device's resolution. */
  private makeAtlas(codes: readonly number[], font: string, emCss: number, dpr: number, cell: { w: number; h: number }, fill: string, outline: { color: string; em: number } | null): Atlas | null {
    const em = Math.max(1, Math.round(emCss * dpr));
    const cellW = Math.ceil(cell.w * em);
    const cellH = Math.ceil(cell.h * em);
    const sheet = (): { canvas: HTMLCanvasElement; c: CanvasRenderingContext2D } | null => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, cellW * codes.length);
      canvas.height = cellH;
      const c = canvas.getContext("2d");
      if (!c) return null;
      c.font = font.replace("{em}", `${em}px`);
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      c.lineJoin = "round";
      c.miterLimit = 2;
      return { canvas, c };
    };
    const fillSheet = sheet();
    const lineSheet = outline ? sheet() : null;
    if (!fillSheet || (outline && !lineSheet)) return null;
    const col = new Map<number, number>();
    codes.forEach((code, i) => {
      col.set(code, i);
      const x = i * cellW + cellW / 2;
      // The capitals stand centred on the cell: the baseline is half a cap height under its middle.
      const y = cellH / 2 + (CAP_HEIGHT_EM / 2) * em;
      const ch = String.fromCharCode(code);
      if (outline && lineSheet) {
        lineSheet.c.lineWidth = outline.em * em * 2;
        lineSheet.c.strokeStyle = outline.color;
        lineSheet.c.strokeText(ch, x, y);
      }
      fillSheet.c.fillStyle = fill;
      fillSheet.c.fillText(ch, x, y);
    });
    return { canvas: fillSheet.canvas, outline: lineSheet?.canvas ?? null, col, cellW, cellH, em, wEm: cellW / em, hEm: cellH / em };
  }

  private ensureAtlases(dpr: number): boolean {
    if (dpr !== this.atlasDpr) {
      this.atlasDpr = dpr;
      this.ringAtlas = null;
      this.bandAtlas = null;
    }
    if (!this.ringAtlas) {
      const ink = roleColor(this.theme.ramp, RING.tone);
      this.ringAtlas = this.makeAtlas(this.codesRing, `${RING.type.weight} {em} ${this.monoFamily}`, RING_ATLAS_EM, dpr, RING_CELL, rgbCss(ink), null);
    }
    if (!this.bandAtlas) {
      const codes = new Set<number>();
      for (const p of this.phrases) for (const ch of p.trim().toLocaleUpperCase("en")) codes.add(ch.charCodeAt(0));
      for (const ch of RING.band.separator) if (ch !== " ") codes.add(ch.charCodeAt(0));
      const list = [...codes].filter((c) => c !== 32);
      const emCss = this.bandAtlasEm || 64;
      this.bandAtlas = this.makeAtlas(list, `${RING.band.weight} {em} ${this.displayFamily}`, emCss, dpr, BAND_CELL, rgbCss(this.theme.ink), { color: rgbCss(this.theme.background), em: RING.band.outlineEm });
      this.bandLayout = { em: RING.band.emR, lines: [] };
    }
    return !!this.ringAtlas && !!this.bandAtlas;
  }

  /** The band is laid out from the real advances of the face (one measurement of each character, when the atlas is made). */
  private ensureBand(): void {
    if (this.bandLayout.lines.length > 0 || this.phrases.length === 0) return;
    const c = document.createElement("canvas").getContext("2d");
    if (!c) return;
    const ref = 100;
    c.font = `${RING.band.weight} ${ref}px ${this.displayFamily}`;
    const cache = new Map<string, number>();
    const advance = (ch: string) => {
      let v = cache.get(ch);
      if (v === undefined) {
        v = c.measureText(ch).width / ref + RING.band.tracking;
        cache.set(ch, v);
      }
      return v;
    };
    this.bandLayout = layoutBand(this.phrases, advance);
  }

  /** Something the drawing depends on changed (a face arrived, the theme, the size): draw again, also when the type is not on the screen yet (a face that arrives at rest). */
  private redraw(): void {
    const fr = this.frame;
    if (this.disposed || !fr || fr.alpha <= 0) return;
    this.setOpacity(fr.alpha);
    this.draw(performance.now(), false);
    this.wake();
  }

  /** `turn`: advance the layer's own clock by the time since the last frame (the loop); a camera frame draws it where it is. */
  private draw(now: number, turn: boolean): void {
    const t0 = performance.now();
    this.paint(now, turn);
    this.lastMs = performance.now() - t0;
    this.totalMs += this.lastMs;
  }

  private paint(now: number, turn: boolean): void {
    const fr = this.frame;
    const ctx = this.ctx;
    if (!fr || !ctx) return;
    if (fr.alpha <= 0 || !this.fontsReady) {
      if (this.shown) this.hide();
      return;
    }
    if (turn || !this.reduced) {
      // The clock runs while the type is on and moving; a stalled frame cannot jump it.
      const dt = Math.min(now - this.lastAt, RING.maxStepMs);
      if (!this.reduced && dt > 0) this.clock += dt;
      this.lastAt = now;
    }
    this.drawnAt = now;
    const dpr = Math.min(window.devicePixelRatio || 1, RING.maxDpr);
    if (!this.ensureAtlases(dpr)) return;
    this.ensureBand();
    const ringAtlas = this.ringAtlas!;
    const bandAtlas = this.bandAtlas!;
    this.frames++;

    const cam: OrbitCam = { d: fr.d, f: fr.f, cx: fr.cx, cy: fr.cy };
    const ring = this.ring;
    const band = this.band;
    placeRing(ring, { text: this.text, repeats: this.ringLayoutNow.repeats, emR: this.ringLayoutNow.emPerR, phase: this.ringPhaseNow(), cam });
    placeBand(band, this.bandLayout, bandPhase(this.clock), cam);

    // The bounding box of everything that is drawn, with the size of a glyph on each side.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const g of [ring, band]) {
      if (g.count === 0) continue;
      const pad = g.maxEmPx * 1.1;
      minX = Math.min(minX, g.minX - pad);
      maxX = Math.max(maxX, g.maxX + pad);
      minY = Math.min(minY, g.minY - pad);
      maxY = Math.max(maxY, g.maxY + pad);
    }
    if (!(maxX > minX)) return;
    const left = Math.max(0, Math.floor(minX));
    const top = Math.max(0, Math.floor(minY));
    const right = Math.min(fr.width, Math.ceil(maxX));
    const bottom = Math.min(fr.height, Math.ceil(maxY));
    const w = Math.max(1, right - left);
    const h = Math.max(1, bottom - top);
    // The backing store is grown in steps and shrunk when it is twice what is needed, or 1.35 times on the layer's own clock frames (nothing is
    // moving then: a resize clears and reallocates it, and a smaller store is less to clear and composite every frame for as long as it turns).
    const needW = Math.ceil(w * dpr);
    const needH = Math.ceil(h * dpr);
    const slack = turn ? 1.35 : 2;
    if (needW > this.allocW || needH > this.allocH || needW * slack < this.allocW || needH * slack < this.allocH || dpr !== this.dpr) {
      this.allocW = Math.min(Math.ceil(fr.width * dpr), Math.ceil(needW * 1.15 + 16));
      this.allocH = Math.min(Math.ceil(fr.height * dpr), Math.ceil(needH * 1.15 + 16));
      this.dpr = dpr;
      this.canvas.width = this.allocW;
      this.canvas.height = this.allocH;
      this.canvas.style.width = `${this.allocW / dpr}px`;
      this.canvas.style.height = `${this.allocH / dpr}px`;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }
    if (left !== this.cssLeft || top !== this.cssTop || !this.shown) {
      this.cssLeft = left;
      this.cssTop = top;
      this.canvas.style.transform = `translate(${left}px, ${top}px)`;
    }
    if (!this.shown) {
      this.shown = true;
      this.root.style.visibility = "";
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, this.allocW, this.allocH);
    const ox = -left;
    const oy = -top;
    // The planet's disc, in this canvas' device px: what the far side is clipped by.
    const discX = (fr.cx + ox) * dpr;
    const discY = (fr.cy + oy) * dpr;
    const discR = (fr.r + 1) * dpr;

    // 1. the far arc of the ring: dimmed, and only where the planet does not stand in front of it.
    this.drawSet(ctx, ring, ringAtlas, dpr, ox, oy, 1, { x: discX, y: discY, r: discR }, RING.farAlpha);
    // 2. the band: in front of the planet's face; the few glyphs that touch the limb are clipped by the disc like the far arc.
    this.drawSet(ctx, band, bandAtlas, dpr, ox, oy, 0, null, 1);
    this.drawSet(ctx, band, bandAtlas, dpr, ox, oy, 1, { x: discX, y: discY, r: discR }, 1);
    // 3. the near arc of the ring, over all of it.
    this.drawSet(ctx, ring, ringAtlas, dpr, ox, oy, 0, null, 1);
    ctx.globalAlpha = 1;
  }

  private ringPhaseNow(): number {
    // The line starts centred on its first phrase (the name) at the near point: half the name's glyphs before the origin.
    const M = this.text.length * Math.max(1, this.ringLayoutNow.repeats);
    const lead = this.firstPhraseLength() / 2;
    return ringPhase(this.clock) - (lead * 2 * Math.PI) / M;
  }

  private firstPhraseLength(): number {
    const sep = RING.separator;
    const i = this.text.indexOf(sep);
    return i < 0 ? this.text.length : i;
  }

  /** The glyphs of `set` whose `back` flag is `back`, through the atlas; `clip` removes the planet's disc from where they are drawn. */
  private drawSet(ctx: CanvasRenderingContext2D, set: GlyphSet, atlas: Atlas, dpr: number, ox: number, oy: number, back: 0 | 1, clip: { x: number; y: number; r: number } | null, alpha: number): void {
    if (set.count === 0) return;
    let any = false;
    for (let i = 0; i < set.count && !any; i++) any = set.back[i] === back;
    if (!any) return;
    if (clip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.allocW, this.allocH);
      ctx.arc(clip.x, clip.y, clip.r, 0, Math.PI * 2, true);
      ctx.clip("evenodd");
    }
    ctx.globalAlpha = alpha;
    const sx = atlas.cellW;
    const sy = atlas.cellH;
    const wEm = atlas.wEm;
    const hEm = atlas.hEm;
    // The keylines first, then the letters: a letter is never cut by the keyline of the next one.
    for (const sheet of [atlas.outline, atlas.canvas]) {
      if (!sheet) continue;
      for (let i = 0; i < set.count; i++) {
        if (set.back[i] !== back) continue;
        const col = atlas.col.get(set.code[i]!);
        if (col === undefined) continue;
        // The matrix maps ems to canvas px: (a, b) the glyph's right, (c, d) its down; the cell is drawn centred on the origin, in ems.
        ctx.setTransform(set.a[i]! * dpr, set.b[i]! * dpr, set.c[i]! * dpr, set.d[i]! * dpr, (set.x[i]! + ox) * dpr, (set.y[i]! + oy) * dpr);
        ctx.drawImage(sheet, col * sx, 0, sx, sy, -wEm / 2, -hEm / 2, wEm, hEm);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (clip) ctx.restore();
  }
}
