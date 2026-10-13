/**
 * Standalone Three.js globe: pixelated, monochrome, on-demand rendering.
 *
 * - Pixelation: the drawing buffer is `cssSize / pixelSize` and the canvas is upscaled with
 *   `image-rendering: pixelated`. Lines are 1 buffer pixel wide, antialiasing is off.
 * - A depth-writing disc hides the graticule, borders and coastlines on the far hemisphere. Markers and routes are
 *   not depth-tested against it (a depth test cuts the off-centre pixels of a sprite or a stroke on a tilted
 *   surface): markers are placed and shown or hidden as a whole on the CPU (`visibility.ts`), routes are hidden
 *   by an analytic test on the line itself (see materials.ts).
 * - Frames are only scheduled when something changed or animates (`requestRender` / `tick`). While the tab is
 *   hidden or the GL context is lost nothing is scheduled; the first frame after recovery repaints.
 * - Imperative and framework-free: React only owns the lifecycle (see ../globe-canvas.tsx).
 */
import { ColorManagement, Color, PerspectiveCamera, WebGLRenderer } from "three";
import type { Polylines } from "@catalyst/geodata";
import type { GlobePlace, GlobeRoute } from "../types";
import type { GlobeTheme } from "./colors";
import { attachControls, type ControlsHost, type PointerKind } from "./controls";
import { watchDevicePixelRatio } from "./dpr";
import { groupFitZoom, radiusFitZoom } from "./framing";
import {
  DEG,
  FOV_DEG,
  clamp,
  fitZoom,
  silhouetteRadiusPx,
  normalizeLon,
  projectLonLat,
  viewBasis,
  zoomCorrection,
  zoomToRadiusPx,
  type ScreenPoint,
  type ViewBasis,
  type ViewState,
} from "./geo";
import { isRouteStop, routesForPlace } from "./geometry";
import { clampInset, fadeMask, freeWidth, insetShiftBuf } from "./inset";
import {
  createFlight,
  cubicBezier,
  isStill,
  releaseVelocity,
  sampleFlight,
  STILL,
  stepInertia,
  type DragSample,
  type Flight,
  type Velocity,
} from "./motion";
import { snapBox } from "./group-square";
import { IdleSpin, SPIN, spinBlock, spinFrameDue, type SpinContext } from "./idle-spin";
import { liftFor } from "./lift";
import { newLodCamera, setLodCamera, type LodTree } from "./lod-tree";
import { NodeScreen } from "./node-screen";
import { CaptionLayer } from "./caption-layer";
import { type CaptionFont, SHOWCASE_STATE } from "./caption";
import { CAP_HEIGHT_EM, ringAlpha, ringFloorZoom, RING_STATE } from "./ring";
import { RingLayer } from "./ring-layer";
import { GlobeScene } from "./scene";
import { INSET_EASE, RING, SKY, TUNING } from "./tuning";
import { fromViewState } from "./view";
import { markerShown } from "./visibility";
import { perfEnd, perfStart } from "./perf";

// Our ShaderMaterials write raw sRGB values and there is no lighting, so skip Three's linear-sRGB conversion;
// otherwise ink and background drift away from the CSS colours.
ColorManagement.enabled = false;

const MARKER_RADIUS = 1;
const easeInset = cubicBezier(...INSET_EASE);

export interface RendererOptions {
  /** Positioned, overflow-hidden element the canvas is appended to; its size is the globe's size. */
  container: HTMLElement;
  places: readonly GlobePlace[];
  routes: readonly GlobeRoute[];
  /** The semantic-zoom hierarchy (places and groups): decides, per frame, which markers and squares are drawn. Shared with the street overlay. */
  lod: LodTree;
  coastlines: Polylines;
  borders: Polylines;
  theme: GlobeTheme;
  reducedMotion: boolean;
  /** Initial zoom limit (see `setZoomLimit`); default the Three.js globe's maximum. */
  zoomLimit?: number;
  /** CSS px covered by UI on the right edge of the container at start; the globe centres on the rest. */
  insetRight: number;
  /** Called synchronously after every drawn frame (labels and view reporting hang off it). */
  onFrame(): void;
  /** True while a label is still gliding to its place (engine/label-track.ts): the frame loop keeps running until it is false, and not a frame longer. */
  labelsAnimating?(): boolean;
  /** The node under the point (its box and label, engine/hit-area.ts), or null. */
  pickLabel(x: number, y: number, kind: PointerKind): string | null;
  /**
   * Replaces picking altogether (markers and labels) when it returns a value other than `undefined`; `null` = nothing.
   * The handover uses it while the street map's overlay is the visible one.
   */
  pickOverride?(x: number, y: number, kind: PointerKind): string | null | undefined;
  onSelect(slug: string): void;
  /** A group's square (or label) was clicked: the handover flies the camera to frame its circle. */
  onSelectGroup(slug: string): void;
  /** The pointer is over a group (its slug) or not (null): highlight only. */
  onHover?(slug: string | null): void;
  /** The GL context was lost (true) or restored (false). */
  onContextChange(lost: boolean): void;
  /**
   * The line that goes round the planet in the zoomed-out regime (engine/ring.ts `ringText`). Absent or empty, or `RING_STATE.enabled` false
   * (`?no-ring`): no ring, and the lowest zoom is the whole-globe fit.
   */
  ringText?: string;
  /** The lines of the caption that wraps the planet (engine/caption.ts), and the face they are set in; absent or empty: no caption. */
  captionPhrases?: readonly string[];
  captionFont?: CaptionFont;
  /** CSS px of the container's bottom that the app covers at start (`GlobeProps.coverBottom`); the planet is lifted clear of them as far as there is room. */
  coverBottom?: number;
  /** The home screen starts at rest: the caption is in and the boxes and labels are out from the first frame (`GlobeProps.showcase`). */
  showcase?: boolean;
}

export interface StartView {
  lon: number;
  lat: number;
  /** In [0, 1] (`GlobeViewState` zoom); null = the select zoom. */
  zoom01: number | null;
  /** Street-scale levels beyond `zoom01` = 1 (`GlobeViewState.street`). */
  street?: number;
  /** Frame the circle of this radius (km) around the view centre instead (`GlobeFitView`); `zoom01` is ignored. */
  fitRadiusKm?: number;
}

export interface FlyOptions {
  /**
   * Allow the target to be above the current zoom limit (the street map is on its way): the flight then waits at the
   * limit, its clock paused, until the limit is lifted, instead of being cut short.
   */
  beyondLimit?: boolean;
}

export class GlobeRenderer {
  readonly canvas: HTMLCanvasElement;

  private gl: WebGLRenderer;
  private globe: GlobeScene;
  private camera = new PerspectiveCamera(FOV_DEG, 1, 0.05, 20);
  private view: ViewState = { lon: 15, lat: 28, zoom: 0 };
  private width = 1;
  private height = 1;
  private bufW = 1;
  private bufH = 1;
  private canvasLeft = 0;
  private canvasTop = 0;
  /** Lowest zoom the camera may go to: the whole-globe `fit`, or (with the ring) the zoom at which the ring fits, below it. */
  private minZoom = 1;
  /** The zoom at which the whole globe fits the free area (`TUNING.fitMargin`): the 0 of `GlobeViewState.zoom`, the world view of the idle rotation, the floor of programmatic framing. */
  private fit = 1;
  /** The ring of type, when there is one (engine/ring-layer.ts: a flat circle of text round the disc, unchanged by the showcase). */
  private ring: RingLayer | null = null;
  /** The caption: lines wrapped on a sphere in the globe's own scene (engine/caption-layer.ts), when the showcase is on this page. */
  private caption: CaptionLayer | null = null;
  /**
   * The showcase: the home screen is at rest, so the boxes and labels are out (`LodTree.setSuppressed`) and the caption is in. `showcaseOn` is
   * what is wanted now; `showcaseActive` whether this page has a showcase at all (a ring, and not a debug page without `?showcase`).
   */
  private showcaseOn = false;
  private showcaseActive = false;
  /** A press began while the showcase was on: its tap is not a click on a box nobody could see (cleared a moment after the press ends). */
  private inertPress = false;
  /** CSS px of the container's bottom the app covers (the hero), the lift it asks for now, and the animated lift (see `setCover`). */
  private cover = 0;
  private liftTarget = 0;
  private lift = 0;
  private liftAnim: { from: number; to: number; start: number } | null = null;
  /** The lift in whole buffer pixels, like `shiftBuf`. */
  private liftBuf = 0;
  private liftKey = "";
  /** Highest zoom reachable now (the globe's maximum unless the street map is available); see `setZoomLimit`. */
  private zoomLimit: number = TUNING.maxZoom;
  /** Skip drawing the Three.js scene (the street map covers it); the camera, flights and `onFrame` still run. */
  private suspended = false;
  private flightLast = 0;
  private pixel = 3;
  /** Current (animated) and target inset, CSS px; see `setInset`. */
  private inset: number;
  private insetTarget: number;
  private insetAnim: { from: number; to: number; start: number } | null = null;
  /** Projection-centre shift (buffer px) derived from `inset`. */
  private shiftBuf = 0;
  private containerMask: string | null = null;
  private reduced: boolean;
  private disposed = false;
  /** False until the container has a real size; nothing is drawn or clamped before that. */
  private sized = false;
  private start: StartView | null;
  private theme: GlobeTheme;
  private lost = false;
  private hidden = document.hidden;
  private dirty = false;
  private raf = 0;
  private frames = 0;
  private ticks = 0;
  private lastRenderMs = 0;
  private loseExt: WEBGL_lose_context | null = null;
  private cleanups: (() => void)[] = [];

  private places: readonly GlobePlace[];
  private routes: readonly GlobeRoute[];
  private placeBySlug = new Map<string, GlobePlace>();
  private selected: string | null = null;
  private focused: string | null = null;
  private hovered = -1;
  private drawnBoxes = 0;
  /** Semantic zoom: what is drawn this frame, and where (per node index; see `syncNodes`). */
  private lod: LodTree;
  private lodCam = newLodCamera();
  private selIdx = -1;
  private focIdx = -1;
  readonly nodeScreen: NodeScreen;
  private flight: Flight | null = null;
  private flightBeyond = false;
  private velocity: Velocity = STILL;
  private inertiaLast = 0;
  /** Idle rotation of the unzoomed world view (engine/idle-spin.ts): the clock and velocity, the timer that wakes the frame loop for the idle delay, the pointers held down. */
  private spin = new IdleSpin(performance.now());
  private spinTimer = 0;
  /** Something other than the rotation's own frame chain asked for the pending frame (so it is drawn whatever `SPIN.minFrameMs` says), and when the last one was drawn. */
  private forced = false;
  private lastTickAt = 0;
  private pressed = new Set<number>();
  /**
   * The earth rotation angle (degrees, engine/sky.ts): where the sky is relative to the earth-fixed frame the view is expressed in. A camera orbit
   * leaves it alone (the stars turn with the view); the idle rotation adds to it what it takes off the view's longitude (the stars stay put on screen).
   */
  private era: number = SKY.eraDeg;

  constructor(
    private opts: RendererOptions,
    start: StartView | null,
  ) {
    this.reduced = opts.reducedMotion;
    this.zoomLimit = opts.zoomLimit ?? TUNING.maxZoom;
    this.inset = this.insetTarget = Math.max(0, opts.insetRight);
    this.start = start;
    this.theme = opts.theme;
    this.places = opts.places;
    this.routes = opts.routes;
    this.lod = opts.lod;
    this.nodeScreen = new NodeScreen(opts.lod.size);
    for (const p of opts.places) this.placeBySlug.set(p.slug, p);

    this.gl = new WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    this.gl.setPixelRatio(1);
    this.canvas = this.gl.domElement;
    Object.assign(this.canvas.style, {
      position: "absolute",
      imageRendering: "pixelated",
      touchAction: "none",
      display: "block",
      outline: "none",
      cursor: "grab",
      // A canvas that has not drawn yet is opaque black (alpha: false): invisible until the first frame is on it (`renderNow`),
      // so no unfinished frame is ever presented, whatever the stage's own opacity does.
      opacity: "0",
    } satisfies Partial<CSSStyleDeclaration>);
    this.canvas.setAttribute("aria-hidden", "true");
    opts.container.append(this.canvas);

    this.globe = new GlobeScene(opts);
    if (opts.ringText && RING_STATE.enabled) this.ring = new RingLayer(opts.container, opts.ringText, opts.theme, this.reduced);
    this.showcaseActive = !!this.ring && SHOWCASE_STATE.enabled;
    this.cover = Math.max(0, opts.coverBottom ?? 0);
    if (this.showcaseActive && opts.captionPhrases && opts.captionPhrases.length > 0) {
      this.caption = new CaptionLayer(this.globe.scene, {
        phrases: opts.captionPhrases,
        font: opts.captionFont ?? "jacquard",
        theme: opts.theme,
        reduced: this.reduced,
        maxAnisotropy: this.gl.capabilities.getMaxAnisotropy(),
        onChange: () => this.requestRender(),
      });
    }
    if (opts.showcase && this.showcaseActive) {
      // The home screen opens in its showcase: the boxes are out from the first frame (nothing fades), and the caption comes in with the first frame.
      this.showcaseOn = true;
      this.lod.setSuppressed(true);
      this.caption?.show(null);
    }
    this.setTheme(opts.theme);

    const ro = new ResizeObserver(() => this.resize(true));
    ro.observe(opts.container);
    this.cleanups.push(() => ro.disconnect());
    this.cleanups.push(watchDevicePixelRatio(() => this.resize(true)));
    this.listen(document, "visibilitychange", () => this.setHidden(document.hidden));
    // Any input anywhere on the page restarts the idle clock and stops the idle rotation (passive: nothing here may delay a gesture).
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "wheel", "touchstart", "keydown"]) {
      window.addEventListener(type, this.onInput, { passive: true, capture: true });
      this.cleanups.push(() => window.removeEventListener(type, this.onInput, { capture: true }));
    }
    this.cleanups.push(() => window.clearTimeout(this.spinTimer));
    this.listen(this.canvas, "webglcontextlost", () => this.onContextLost());
    this.listen(this.canvas, "webglcontextrestored", () => this.onContextRestored());
    this.cleanups.push(attachControls(this.canvas, opts.container, this.controlsHost()));

    this.resize(false);
    this.refreshMarkers();
    this.requestRender();
  }

  private listen<T extends EventTarget>(target: T, type: string, fn: () => void) {
    target.addEventListener(type, fn);
    this.cleanups.push(() => target.removeEventListener(type, fn));
  }

  /* ------------------------------ sizing ------------------------------ */

  private resize(redraw: boolean) {
    if (this.disposed) return;
    const w = this.opts.container.clientWidth;
    const h = this.opts.container.clientHeight;
    // Not laid out yet (or display: none): wait for the ResizeObserver instead of fitting a 1px globe.
    if (w < 1 || h < 1) return;
    this.width = w;
    this.height = h;
    const P = (this.pixel = TUNING.pixelSize(Math.min(w, h), window.devicePixelRatio || 1));
    this.bufW = Math.ceil(w / P);
    this.bufH = Math.ceil(h / P);
    this.gl.setSize(this.bufW, this.bufH, false);
    const cw = this.bufW * P;
    const ch = this.bufH * P;
    this.canvasLeft = -Math.round((cw - w) / 2);
    this.canvasTop = -Math.round((ch - h) / 2);
    Object.assign(this.canvas.style, {
      width: `${cw}px`,
      height: `${ch}px`,
      left: `${this.canvasLeft}px`,
      top: `${this.canvasTop}px`,
    });
    this.globe.routes.setPixelSize(this.bufW, this.bufH);
    this.applyInset();
    if (!this.sized) {
      this.sized = true;
      this.view = this.clampView(this.startView());
    } else {
      this.view = { ...this.view, zoom: clamp(this.view.zoom, this.minZoom, this.maxZoomAt(this.view.lat)) };
    }
    // Resizing clears the drawing buffer: repaint synchronously so there is no blank frame.
    if (redraw) this.renderNow();
  }

  /**
   * Everything that depends on the inset: the projection-centre shift, the minimum zoom (the whole globe fits
   * the free area) and the dissolving right edge. Cheap; called on resize and per tween frame.
   */
  private applyInset() {
    const { width: w, height: h, pixel: P } = this;
    const inset = clampInset(this.inset, w);
    this.shiftBuf = insetShiftBuf(inset, P);
    this.fit = fitZoom(freeWidth(w, inset), h, TUNING.fitMargin);
    this.minZoom = this.ring ? Math.min(this.fit, ringFloorZoom({ fit: this.fit, freeWidth: freeWidth(w, inset), height: h })) : this.fit;
    this.containerMask = fadeMask(w, inset);
    this.ring?.setMask(this.containerMask);
    this.layoutRing();
    // The lift follows the viewport and the lowest zoom: a change of those (not of the cover, which animates) applies at once.
    const key = `${w}x${h}@${this.minZoom.toFixed(4)}`;
    if (key !== this.liftKey) {
      this.liftKey = key;
      this.retargetLift(false);
    }
    this.liftBuf = Math.round(this.lift / P);
    const mask = fadeMask(w, inset, this.canvasLeft) ?? "";
    this.canvas.style.maskImage = mask;
    this.canvas.style.setProperty("-webkit-mask-image", mask);
  }

  /** The number of times the line goes round follows the viewport and the panel's SETTLED inset (not the animated one: the text must not reflow while the panel slides). */
  private ringLayoutKey = "";
  private layoutRing() {
    if (!this.ring) return;
    const { width: w, height: h } = this;
    const key = `${w}x${h}@${this.insetTarget}`;
    if (key === this.ringLayoutKey) return;
    this.ringLayoutKey = key;
    const free = freeWidth(w, clampInset(this.insetTarget, w));
    const fit = fitZoom(free, h, TUNING.fitMargin);
    const floor = Math.min(fit, ringFloorZoom({ fit, freeWidth: free, height: h }));
    this.ring.setLayout(silhouetteRadiusPx(floor, h));
    this.caption?.setSizing(this.pixel, silhouetteRadiusPx(floor, h));
  }

  /**
   * How far the planet's centre should be lifted for the cover now (engine/lift.ts): the planet at the lowest zoom (where the home screen
   * rests) clear of the cover as far as the room above allows, the ring's top included (the flat ring's outer edge, as `ringFloorZoom` has it).
   */
  private liftWanted(): number {
    // The lift belongs to the showcase: on a page without it (`?no-ring`, a debug page) the page is the one of before it.
    if (!this.showcaseActive || this.cover <= 0 || this.width < 1 || this.height < 1) return 0;
    const h = this.height;
    const rPx = silhouetteRadiusPx(this.minZoom, h);
    const t = RING.type.targetEmPx;
    const ringTop = rPx * (1 + RING.gap) + CAP_HEIGHT_EM * t * (1 + RING.type.emSlack) + t;
    return liftFor({ cover: this.cover, height: h, planetPx: rPx, reachTopPx: Math.max(rPx, ringTop) });
  }

  private retargetLift(animate: boolean) {
    const next = this.liftWanted();
    if (next === this.liftTarget) return;
    this.liftTarget = next;
    if (animate && this.sized && !this.reduced && Math.abs(next - this.lift) > 0.5) {
      this.liftAnim = { from: this.lift, to: next, start: performance.now() };
    } else {
      this.liftAnim = null;
      this.lift = next;
      this.liftBuf = Math.round(this.lift / this.pixel);
    }
    this.requestRender();
  }

  /**
   * UI covers the bottom `px` CSS px of the container (the landing hero at rest): the planet's centre goes up by what clears it, as far as the room
   * above allows (`liftFor`), eased like the inset (zero <-> non-zero), and back down when it goes. Reduced motion: at once.
   */
  setCover(px: number) {
    const next = Math.max(0, Number.isFinite(px) ? px : 0);
    if (next === this.cover) return;
    this.cover = next;
    this.noteChange();
    this.retargetLift(true);
  }

  /**
   * UI covers `px` CSS px of the container's right edge (the detail panel): centre the globe on the free area.
   * Appearing or disappearing (zero <-> non-zero) is eased like the panel's slide; any other change (a viewport
   * resize) and reduced motion apply at once.
   */
  setInset(px: number) {
    const next = Math.max(0, px);
    if (next === this.insetTarget) return;
    this.noteChange();
    const toggles = (this.insetTarget === 0) !== (next === 0);
    this.insetTarget = next;
    if (this.sized && toggles && !this.reduced) {
      this.insetAnim = { from: this.inset, to: next, start: performance.now() };
    } else {
      this.insetAnim = null;
      this.inset = next;
      if (this.sized) {
        this.applyInset();
        this.view = { ...this.view, zoom: clamp(this.view.zoom, this.minZoom, this.maxZoomAt(this.view.lat)) };
      }
    }
    this.requestRender();
  }

  /** Size of the area the globe is centred on (the container minus the inset), for label placement. */
  getVisibleSize() {
    return { width: freeWidth(this.width, this.inset), height: this.height };
  }

  /** `mask-image` for overlays that must dissolve with the canvas (container coordinates), or null. */
  getContainerMask() {
    return this.containerMask;
  }

  /** Where the camera starts, once the minimum zoom is known. */
  private startView(): ViewState {
    const s = this.start;
    // The home screen opens fully zoomed OUT (the lowest zoom: the fit when there is no ring): the ring and the caption are there from the first frame.
    // The world view is the whole-globe fit on a page without the showcase, as before it.
    if (!s) return { lon: 15, lat: 28, zoom: this.showcaseActive ? this.minZoom : this.fit };
    if (s.fitRadiusKm !== undefined) return { lon: s.lon, lat: s.lat, zoom: Math.max(this.fit, this.fitZoomFor(s.fitRadiusKm)) };
    if (s.zoom01 === null) return { lon: s.lon, lat: s.lat, zoom: TUNING.selectZoom };
    return fromViewState({ lon: s.lon, lat: s.lat, zoom: s.zoom01, street: s.street }, this.fit, TUNING.maxZoom);
  }

  /** The animated inset now (CSS px). */
  getInset() {
    return this.inset;
  }
  /** The inset the animation is heading for (CSS px): what framing a place for the panel must use. */
  getInsetTarget() {
    return this.insetTarget;
  }
  /**
   * Unified zoom at which the circle of `radiusKm` fits the free area once the inset has settled (unclamped above;
   * not below the whole-globe fit). See engine/framing.ts.
   */
  fitZoomFor(radiusKm: number): number {
    const z = radiusFitZoom(radiusKm, this.width, this.height, this.insetTarget);
    return Math.max(z, this.wholeFit());
  }
  /**
   * The zoom a flight to group `i` ends at: its circle (`viewRadiusKm`) fits the free area with `GROUP_FRAMING_MARGIN` of room,
   * which is far more than the box needs to open: its children are showing on arrival.
   */
  fitZoomForGroup(i: number): number {
    return Math.max(groupFitZoom(this.lod.radiusKm[i]!, this.width, this.height, this.insetTarget), this.wholeFit());
  }
  private wholeFit() {
    return fitZoom(freeWidth(this.width, clampInset(this.insetTarget, this.width)), this.height, TUNING.fitMargin);
  }
  isFlying() {
    return this.flight !== null;
  }

  /** The lowest zoom the camera may go to (below `getFitZoom()` by the ring's room when the ring is on). */
  getMinZoom() {
    return this.minZoom;
  }
  /** The whole-globe fit: the 0 of `GlobeViewState.zoom` (the zoomed-out regime of the ring below it reports 0 too). */
  getFitZoom() {
    return this.fit;
  }
  getView(): ViewState {
    return { ...this.view };
  }

  /* ------------------------------ camera API ------------------------------ */

  /** Highest internal zoom at a latitude: the zoom limit, and never past the street map's own maximum. */
  private maxZoomAt(lat: number): number {
    return Math.min(this.zoomLimit, TUNING.streetMapMaxZoom - zoomCorrection(lat));
  }

  private clampView(v: ViewState, beyondLimit = false): ViewState {
    const lat = clamp(v.lat, -TUNING.maxLat, TUNING.maxLat);
    const top = beyondLimit ? TUNING.streetMapMaxZoom - zoomCorrection(lat) : this.maxZoomAt(lat);
    return { lon: normalizeLon(v.lon), lat, zoom: clamp(v.zoom, this.minZoom, top) };
  }

  /**
   * Highest zoom reachable (default: the Three.js globe's maximum). The handover raises it to the street map's
   * maximum while a tile source works. Lowering it below the current zoom clamps the view at once.
   */
  setZoomLimit(zoom: number) {
    this.zoomLimit = zoom;
    this.noteChange();
    const next = this.clampView(this.view);
    if (next.zoom !== this.view.zoom) {
      this.view = next;
      this.requestRender();
    }
  }
  getZoomLimit() {
    return this.zoomLimit;
  }

  /** True while the Three.js scene is not being drawn. */
  setSuspended(on: boolean) {
    if (on === this.suspended) return;
    this.suspended = on;
    this.noteActivity();
    // A suspended canvas keeps its last frame, which is stale as soon as the camera moves: it must not show through the
    // street map's dissolving edge (the inset fade) or anywhere else. Made transparent here (NOT `visibility: hidden`: the
    // canvas is the pointer target at every scale and a hidden element gets no pointer events), shown again by the next drawn
    // frame (renderNow), never before: a canvas that never drew is black.
    if (on) this.canvas.style.opacity = "0";
    else this.requestRender();
  }
  isSuspended() {
    return this.suspended;
  }

  /** The view the Three.js scene is drawn with: the globe cannot go closer than its own maximum. */
  private drawView(): ViewState {
    return this.view.zoom > TUNING.maxZoom ? { ...this.view, zoom: TUNING.maxZoom } : this.view;
  }

  setView(v: Partial<ViewState>) {
    this.noteActivity();
    this.flight = null;
    this.velocity = STILL;
    this.view = this.clampView({ ...this.view, ...v });
    this.requestRender();
  }

  /** Animated camera move; a jump under reduced motion. */
  flyTo(v: Partial<ViewState>, o?: FlyOptions) {
    this.noteChange();
    const beyond = o?.beyondLimit === true;
    const to = this.clampView({ ...this.view, ...v }, beyond);
    if (this.reduced) {
      this.flight = null;
      this.velocity = STILL;
      this.view = this.clampView(to);
      this.requestRender();
      return;
    }
    this.velocity = STILL;
    this.flight = createFlight(this.view, to, performance.now(), this.height);
    this.flightBeyond = beyond;
    this.flightLast = performance.now();
    this.requestRender();
  }

  /** The target of the flight in progress, or null. */
  flightTarget(): ViewState | null {
    return this.flight ? { ...this.flight.to } : null;
  }

  setReducedMotion(on: boolean) {
    this.reduced = on;
    this.ring?.setReduced(on);
    this.caption?.setReduced(on);
    this.noteActivity();
    if (on) {
      if (this.flight) this.view = this.clampView(this.flight.to);
      this.flight = null;
      this.velocity = STILL;
      this.globe.routes.finishAll();
    }
    this.requestRender();
  }

  getTheme(): GlobeTheme {
    return this.theme;
  }

  setTheme(theme: GlobeTheme) {
    this.theme = theme;
    this.ring?.setTheme(theme);
    this.caption?.setTheme(theme);
    // Tones of the semantic zoom: group squares in map levels per kind (below the ink), a place marker the ink.
    this.lod.setTones(theme.ramp.length);
    this.gl.setClearColor(new Color(...theme.background), 1);
    this.globe.applyTheme(theme);
    this.requestRender();
  }

  /* ------------------------------ selection ------------------------------ */

  /** `animateRoute`: play the draw-on of the selected place's route (ignored under reduced motion). */
  setSelected(slug: string | null, animateRoute: boolean) {
    this.selected = slug;
    this.noteChange();
    this.selIdx = this.lod.indexOf(slug);
    this.selectRoute(slug, animateRoute);
  }

  setFocused(slug: string | null) {
    if (slug === this.focused) return;
    this.focused = slug;
    this.noteChange();
    this.focIdx = this.lod.indexOf(slug);
    this.refreshMarkers();
    this.requestRender();
  }

  /** Highlight (full ink) the node under the pointer. */
  setHovered(slug: string | null) {
    const next = this.lod.indexOf(slug);
    if (next === this.hovered) return;
    this.hovered = next;
    this.requestRender();
  }

  /** The routes through the selected place: the only ones drawn (engine/geometry.ts `routesForPlace`). */
  private selectedRoutes(): GlobeRoute[] {
    return routesForPlace(this.routes, this.selected ? this.placeBySlug.get(this.selected) : undefined);
  }

  private selectRoute(slug: string | null, animate: boolean) {
    const routes = this.selectedRoutes();
    this.globe.routes.show(new Set(routes.map((r) => r.id)), animate && !this.reduced && !!slug, performance.now());
    this.refreshMarkers();
    this.requestRender();
  }

  private refreshMarkers() {
    const stops = new Set<string>();
    for (const route of this.selectedRoutes()) for (const p of this.places) if (isRouteStop(route, p)) stops.add(p.slug);
    this.lod.setExtraForced([...stops].map((slug) => this.lod.indexOf(slug)));
  }

  /* ------------------------------ projection / picking ------------------------------ */

  /**
   * Where a place's marker is: the art-pixel cell (`col`, `row` in drawing-buffer pixels, row 0 at the top) its
   * centre falls in, and whether the marker is drawn at all. The ONE source for drawing, labels and picking.
   * Visible = front hemisphere and clear of the limb (`visibility.ts`), decided from the unsnapped centre.
   */
  private markerCell(lon: number, lat: number, basis: ViewBasis) {
    const P = this.pixel;
    const cw = this.bufW * P;
    const ch = this.bufH * P;
    const centreX = cw / 2 - this.shiftBuf * P;
    const centreY = ch / 2 - this.liftBuf * P;
    const p = projectLonLat(lon, lat, basis, cw, ch, MARKER_RADIUS, centreX, centreY);
    const shown = markerShown(p, basis, centreX, centreY, TUNING.markerLimbClearance * P);
    return { col: Math.floor(p.x / P), row: Math.floor(p.y / P), shown, facing: p.facing };
  }

  /** Where the globe model puts a place for the CURRENT view (not capped at the globe's maximum zoom, not snapped), container CSS px. */
  projectExact(lon: number, lat: number): { x: number; y: number } {
    const P = this.pixel;
    const cw = this.bufW * P;
    const ch = this.bufH * P;
    const p = projectLonLat(lon, lat, viewBasis(this.view, ch), cw, ch, MARKER_RADIUS, cw / 2 - this.shiftBuf * P, ch / 2 - this.liftBuf * P);
    return { x: p.x + this.canvasLeft, y: p.y + this.canvasTop };
  }

  /** Container CSS px of the art pixel the marker is drawn in (its centre), and whether it is drawn. */
  project(lon: number, lat: number): ScreenPoint {
    const P = this.pixel;
    const c = this.markerCell(lon, lat, viewBasis(this.drawView(), this.bufH * P));
    return {
      x: (c.col + 0.5) * P + this.canvasLeft,
      y: (c.row + 0.5) * P + this.canvasTop,
      visible: c.shown,
      facing: c.shown ? c.facing : 0,
    };
  }

  /** The art-pixel grid of the canvas: what the pixel-text overlay must match cell for cell (engine/pixel-labels.ts). */
  pixelGrid() {
    return { cols: this.bufW, rows: this.bufH, cell: this.pixel, left: this.canvasLeft, top: this.canvasTop };
  }

  /**
   * The camera of the declutter clusters for this frame: the unified view (NOT capped at the globe's maximum zoom) in the
   * canvas's own projection space (the one `syncNodes` projects the markers in), so the tree decides from exactly the cells
   * the markers are drawn in.
   */
  private lodCamera() {
    const P = this.pixel;
    const cw = this.bufW * P;
    const ch = this.bufH * P;
    setLodCamera(this.lodCam, this.view, { width: cw, height: ch, centreX: cw / 2 - this.shiftBuf * P, centreY: ch / 2 - this.liftBuf * P }, freeWidth(cw, this.inset), P);
    return this.lodCam;
  }

  /** A copy of the camera of the declutter clusters for the current view (measurement). */
  lodCameraNow() {
    return { ...this.lodCamera() };
  }

  /** The tree evaluated for the current camera (cached: free when a frame has just been drawn). */
  lodFrame(): LodTree {
    this.lod.update(this.lodCamera(), this.selIdx, this.focIdx, this.reduced);
    return this.lod;
  }

  /**
   * Per frame, before drawing: evaluate the detection boxes (engine/lod-tree.ts) and hand every DRAWN node its rectangle in
   * whole art cells (`snapBox`): a place and a group are the same kind of thing. The label layer draws them on the pixel
   * canvas, and picking reads these rectangles, so what is drawn, labelled and clickable cannot disagree. A node is drawn
   * whole or not at all: the tree counted only places that passed the whole-or-nothing visibility rule (`markerShown`).
   * O(drawn nodes): nothing else is touched or allocated.
   */
  private syncNodes() {
    const lod = this.lodFrame();
    lod.advance(performance.now());
    const P = this.pixel;
    const screen = this.nodeScreen;
    let boxes = 0;
    for (let k = 0; k < lod.count; k++) {
      const i = lod.visible[k]!;
      const r = snapBox(lod.boxX0[i]!, lod.boxY0[i]!, lod.boxX1[i]!, lod.boxY1[i]!, P);
      screen.bx0[i] = r.c0 * P + this.canvasLeft;
      screen.by0[i] = r.r0 * P + this.canvasTop;
      screen.bx1[i] = r.c1 * P + this.canvasLeft;
      screen.by1[i] = r.r1 * P + this.canvasTop;
      // the box as projected, for the labels (they move smoothly; the drawn box steps by cells)
      screen.fx0[i] = lod.boxX0[i]! + this.canvasLeft;
      screen.fy0[i] = lod.boxY0[i]! + this.canvasTop;
      screen.fx1[i] = lod.boxX1[i]! + this.canvasLeft;
      screen.fy1[i] = lod.boxY1[i]! + this.canvasTop;
      screen.x[i] = (screen.bx0[i]! + screen.bx1[i]!) / 2;
      screen.y[i] = (screen.by0[i]! + screen.by1[i]!) / 2;
      // Drawn = the node's places passed the visibility rule and its rectangle touches the buffer.
      const drawn = (lod.isGroup[i] ? lod.members[i]! > 0 : !!lod.shown[i]) && r.c1 > 0 && r.r1 > 0 && r.c0 < this.bufW && r.r0 < this.bufH;
      screen.shown[i] = drawn ? 1 : 0;
      screen.facing[i] = 1;
      if (drawn) boxes++;
    }
    this.drawnBoxes = boxes;
  }

  /** Ids of the routes drawn now: only those through the selected place (checks). */
  routesShown(): string[] {
    return this.globe.routes.shown();
  }

  /** The globe layers' timed state (checks): the borders' fade value now and whether it is going to / at the on state. */
  layerState() {
    return { borders: this.globe.borderState(), animating: this.globe.animating };
  }

  /** Run the borders' fade to its end (checks). */
  settleBorders() {
    this.globe.settleBorders();
  }

  /** The sky (checks): the earth rotation angle, its timed on/off value and whether it is drawn; null when switched off. */
  skyState() {
    const s = this.globe.sky?.state();
    return s ? { era: this.era, ...s } : null;
  }

  /** Set the earth rotation angle (checks): moves the sky relative to the earth. */
  setSkyEra(deg: number) {
    this.era = normalizeLon(deg);
    this.requestRender();
  }

  /** Rectangles drawn in the last frame: measurement. */
  drawnCounts() {
    return { markers: 0, groups: this.drawnBoxes };
  }

  /* ------------------------------ input ------------------------------ */

  private controlsHost(): ControlsHost {
    return {
      stopMotion: () => {
        this.flight = null;
        this.velocity = STILL;
      },
      panPixels: (dx, dy) => this.panPixels(dx, dy),
      zoomBy: (d) => this.setView({ zoom: this.view.zoom + d }),
      fling: (samples, now) => this.fling(samples, now),
      pickAt: (x, y, kind) => {
        if (this.inertPress || this.showcaseOn) return null;
        const over = this.opts.pickOverride?.(x, y, kind);
        return over !== undefined ? over : this.opts.pickLabel(x, y, kind);
      },
      hover: (slug) => {
        this.setHovered(slug);
        this.opts.onHover?.(slug);
      },
      select: (slug) => {
        const i = this.lod.indexOf(slug);
        if (i >= 0 && this.lod.isGroup[i]) this.opts.onSelectGroup(slug);
        else this.opts.onSelect(slug);
      },
    };
  }

  private panPixels(dx: number, dy: number) {
    const r = zoomToRadiusPx(this.view.zoom);
    const cosLat = Math.max(0.15, Math.cos(this.view.lat * DEG));
    this.setView({ lon: this.view.lon - dx / (r * cosLat) / DEG, lat: this.view.lat + dy / r / DEG });
  }

  private fling(samples: readonly DragSample[], now: number) {
    if (this.reduced) return;
    const v = releaseVelocity(samples, now, zoomToRadiusPx(this.view.zoom), this.view.lat, TUNING.maxFlingPxPerMs);
    if (!v) return;
    this.velocity = v;
    this.inertiaLast = performance.now();
    this.requestRender();
  }

  /* ------------------------------ frame scheduling ------------------------------ */

  /** True while a frame is pending (any animation, inertia or deferred render). */
  isAnimating() {
    return this.raf !== 0;
  }

  requestRender() {
    if (this.disposed) return;
    this.forced = true;
    if (this.hidden || this.lost) {
      this.dirty = true;
      return;
    }
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  /**
   * Another frame is wanted by a running animation. While the globe turns and the camera itself is not under way (a flight, inertia or the inset slide),
   * that animation is the boxes' own transitions that the turn causes (limb crossings), and its frames are paced like the turn's: not faster than `SPIN.minFrameMs`.
   */
  private keepGoing(cameraMoving: boolean) {
    if (this.spin.spinning && !cameraMoving) this.chainSpin();
    else this.requestRender();
  }

  /** Keep the idle rotation's frame chain going: the next frame is not forced (`requestRender` would), so `SPIN.minFrameMs` can skip it. */
  private chainSpin() {
    if (this.disposed || this.hidden || this.lost || this.raf) return;
    this.raf = requestAnimationFrame(this.tick);
  }

  private cancelFrame() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.noteActivity();
    if (hidden) {
      window.clearTimeout(this.spinTimer);
      this.spinTimer = 0;
      this.cancelFrame();
      this.dirty = true;
    } else if (this.dirty) {
      this.dirty = false;
      this.requestRender();
    }
  }

  private onContextLost() {
    this.lost = true;
    this.noteActivity();
    this.cancelFrame();
    this.dirty = true;
    this.opts.onContextChange(true);
  }

  private onContextRestored() {
    // Three re-initialises its GL state on restore and re-uploads geometry and programs lazily on the next render.
    // That reset also drops the clear colour, so it is set again.
    this.gl.setClearColor(new Color(...this.theme.background), 1);
    this.lost = false;
    this.noteActivity();
    this.opts.onContextChange(false);
    this.dirty = false;
    this.requestRender();
  }

  /** Advance animations; returns true if another frame is needed. */
  private advance(now: number): boolean {
    let more = false;
    if (this.insetAnim) {
      const a = this.insetAnim;
      const t = clamp((now - a.start) / TUNING.insetMs, 0, 1);
      this.inset = t >= 1 ? a.to : a.from + (a.to - a.from) * easeInset(t);
      this.applyInset();
      this.view = { ...this.view, zoom: clamp(this.view.zoom, this.minZoom, this.maxZoomAt(this.view.lat)) };
      if (t >= 1) this.insetAnim = null;
      else more = true;
    }
    if (this.liftAnim) {
      const a = this.liftAnim;
      const t = clamp((now - a.start) / TUNING.insetMs, 0, 1);
      this.lift = t >= 1 ? a.to : a.from + (a.to - a.from) * easeInset(t);
      this.liftBuf = Math.round(this.lift / this.pixel);
      if (t >= 1) this.liftAnim = null;
      else more = true;
    }
    if (this.flight) {
      const dt = now - this.flightLast;
      this.flightLast = now;
      const s = sampleFlight(this.flight, now, this.fit);
      const lat = clamp(s.view.lat, -TUNING.maxLat, TUNING.maxLat);
      if (this.flightBeyond && s.view.zoom > this.maxZoomAt(lat) + 1e-6) {
        // The street map is not available yet: hold at the limit and pause the flight's clock; it resumes from here.
        this.flight = { ...this.flight, start: this.flight.start + dt };
        this.view = this.clampView(s.view);
        more = true;
      } else {
        this.view = this.clampView(s.view, this.flightBeyond);
        if (s.done) this.flight = null;
        else more = true;
      }
    }
    if (!isStill(this.velocity)) {
      const dt = now - this.inertiaLast;
      this.inertiaLast = now;
      const step = stepInertia(this.velocity, dt, zoomToRadiusPx(this.view.zoom), TUNING.inertiaMs);
      this.view = this.clampView({ ...this.view, lon: this.view.lon + step.move.lon, lat: this.view.lat + step.move.lat });
      this.velocity = step.velocity;
      if (!isStill(this.velocity)) more = true;
    }
    if (this.globe.routes.advance(now, zoomToRadiusPx(this.view.zoom))) more = true;
    return more;
  }

  /* ------------------------------ idle rotation ------------------------------ */

  /** One object, refilled on each call: the pointer events that ask must not allocate. */
  private spinCtx: SpinContext = { reduced: false, hidden: false, lost: false, suspended: false, selected: false, focused: false, inset: 0, zoom: 0, minZoom: 0, busy: false };
  private spinContext(): SpinContext {
    const c = this.spinCtx;
    c.reduced = this.reduced;
    c.hidden = this.hidden;
    c.lost = this.lost;
    c.suspended = this.suspended;
    c.selected = this.selected !== null;
    c.focused = this.focused !== null;
    c.inset = this.insetTarget;
    c.zoom = this.view.zoom;
    c.minZoom = this.fit; // the world view is the whole-globe fit; the ring's regime below it is part of it
    c.busy = this.flight !== null || !isStill(this.velocity) || this.insetAnim !== null || this.liftAnim !== null || this.pressed.size > 0;
    return c;
  }

  /** The idle rotation is turning the globe now (a plain read: asked every camera frame, so it builds nothing, unlike `spinInfo`). */
  get spinning(): boolean {
    return this.spin.spinning;
  }

  /** Why the globe is not turning (checks), or null while it is allowed to. */
  spinInfo() {
    return { spinning: this.spin.spinning, phase: this.spin.phase, speed: this.spin.speed, blockedBy: spinBlock(this.spinContext()), timerArmed: this.spinTimer !== 0 };
  }

  /** An input, or a change that cannot let it go on (hidden, context lost, reduced motion, street): the globe stops turning now, with no coasting, and the idle clock restarts. */
  private noteActivity() {
    this.spin.activity(performance.now());
    this.armSpin();
  }

  /** A change that is not an input (a place selected or focused from the URL or the list, the inset, a flight, the zoom limit): the idle clock restarts and a turning globe coasts to rest. */
  private noteChange() {
    this.spin.settle(performance.now());
    this.armSpin();
  }

  private onInput = (e: Event) => {
    // A gesture ON the globe (the hero's own definition: a press or a wheel over the stage) ends the showcase at once: the boxes come back and the
    // press that began it is no click (nobody could see what was under it).
    if ((e.type === "pointerdown" || e.type === "wheel") && this.showcaseOn && e.target instanceof Node && this.opts.container.contains(e.target)) {
      this.inertPress = e.type === "pointerdown";
      this.dropShowcase();
    }
    if (e.type === "pointerup" || e.type === "pointercancel") {
      if (this.inertPress) window.setTimeout(() => (this.inertPress = false), 0);
    }
    if (e instanceof PointerEvent) {
      if (e.type === "pointerdown") this.pressed.add(e.pointerId);
      else if (e.type === "pointerup" || e.type === "pointercancel" || (e.pointerType === "mouse" && e.buttons === 0)) this.pressed.delete(e.pointerId);
    }
    this.noteActivity();
  };

  /**
   * While idle, wake the frame loop when the idle delay is over: a timer, not a frame, so a page at rest stays at zero frames. While
   * turning there is no timer: the frame chain itself (`tick`) carries on, one frame per display refresh.
   */
  private armSpin() {
    if (this.disposed || this.spin.spinning || this.spinTimer) return; // the pending timer looks again when it fires
    const wait = this.spin.wait(performance.now(), this.spinContext());
    if (wait !== null) this.spinTimer = window.setTimeout(this.onSpinTimer, wait);
  }

  private onSpinTimer = () => {
    this.spinTimer = 0;
    if (this.disposed) return;
    const wait = this.spin.wait(performance.now(), this.spinContext());
    if (wait === null) return;
    if (wait > 0) {
      this.spinTimer = window.setTimeout(this.onSpinTimer, wait);
      return;
    }
    this.requestRender(); // the tick starts the turn (`stepSpin`) and keeps the frame chain going
  };

  /** Once per tick: turn the globe by the idle rotation's step for now. Writes the view directly (`setView` would count as input). */
  private stepSpin(now: number) {
    const was = this.spin.spinning;
    const yaw = this.spin.step(now, this.spinContext());
    if (!was && this.spin.spinning) {
      // The pointer has not moved for the whole delay, but whatever was under it is about to slide away: drop the hover highlight.
      this.setHovered(null);
      this.opts.onHover?.(null);
    }
    if (yaw !== 0) {
      // The earth turns under a camera that stays where it is: the view's longitude goes down by what the earth's rotation angle goes up by,
      // so the camera's longitude in the inertial frame (view + era) and with it every star on the screen does not change.
      if (this.flight) {
        // A flight owns the view's position (it is sampled from its endpoints each frame): the coasting turns its start instead, so the camera keeps
        // coasting at first, the flight takes over as it proceeds, and it lands exactly on its target.
        this.flight = { ...this.flight, from: { ...this.flight.from, lon: this.flight.from.lon - yaw } };
      } else {
        this.view = { ...this.view, lon: normalizeLon(this.view.lon - yaw) };
      }
      this.era = normalizeLon(this.era + yaw);
    }
  }

  private tick = () => {
    this.raf = 0;
    if (this.disposed || this.hidden || this.lost) return;
    const now = performance.now();
    // The rotation's own frame chain follows the display (a frame per refresh) but not faster than `SPIN.minFrameMs`: a frame that nothing else asked for is skipped when it is too soon.
    if (!this.forced && this.spin.spinning && !spinFrameDue(now, this.lastTickAt)) {
      this.raf = requestAnimationFrame(this.tick);
      return;
    }
    this.forced = false;
    this.lastTickAt = now;
    const flying = this.flight !== null;
    const moving = this.advance(now);
    const fading = this.caption?.animating ?? false;
    if (moving) this.spin.settle(now); // a flight, inertia or the inset slide is camera motion: not idle (a turning globe coasts to rest)
    // The flight has just landed exactly on its target: whatever is left of the coasting is dropped, so the camera stays on it.
    if (flying && this.flight === null) this.spin.activity(now);
    this.stepSpin(now);
    this.renderNow();
    // A timed transition of the boxes or of the borders (engine/fade.ts) that has not reached its end keeps the loop going, camera or not.
    // While the street map owns the view the globe draws nothing and its transitions are not advanced here (the street engine runs the
    // boxes' own), so they must not keep this loop spinning.
    const more = moving || fading || (!this.suspended && (this.lod.animating || this.globe.animating || !!this.opts.labelsAnimating?.()));
    if (more) this.keepGoing(moving);
    else if (this.spin.spinning) this.chainSpin();
    else this.armSpin();
  };

  /** Synchronous render (also used by resize and by the measurement hooks). */
  renderNow() {
    if (this.disposed || this.lost || !this.sized) return;
    this.cancelFrame();
    if (this.suspended) {
      this.ticks++;
      this.syncRing();
      this.opts.onFrame();
      return;
    }
    const tp = perfStart();
    this.syncCamera();
    this.syncNodes();
    this.syncRing();
    perfEnd("three.sync", tp);
    // The whole buffer is drawn: a GL scissor limited to the free area saved nothing measurable (docs/web-architecture.md)
    // and left the area outside it stale, which the CSS edge-fade mask then revealed.
    const t0 = performance.now();
    this.gl.render(this.globe.scene, this.camera);
    this.lastRenderMs = performance.now() - t0;
    this.frames++;
    if (this.canvas.style.opacity === "0") this.canvas.style.opacity = "";
    perfEnd("three.render", t0);
    const t1 = perfStart();
    this.opts.onFrame();
    perfEnd("frame.callbacks", t1);
    // Whoever drew this frame (the tick, a resize, a check), the transitions run to their end, and the idle rotation's chain (cancelled above) goes on.
    if (this.lod.animating || this.globe.animating || (this.caption?.animating ?? false) || this.opts.labelsAnimating?.()) this.keepGoing(false);
    else if (this.spin.spinning) this.chainSpin();
  }

  /**
   * The ring goes where the planet is, in the same frame (a camera frame, drawn or suspended). Cheap when it is not shown: one comparison.
   * It runs on its own clock for the slow turn (engine/ring-layer.ts) and never asks for a frame of the globe.
   */
  private syncRing() {
    const ring = this.ring;
    if (!ring) return;
    const alpha = ringAlpha(this.view.zoom, this.fit, this.minZoom);
    if (alpha <= 0 && !ring.isShown) return;
    const P = this.pixel;
    const ch = this.bufH * P;
    ring.update({
      cx: (this.bufW * P) / 2 - this.shiftBuf * P + this.canvasLeft,
      cy: ch / 2 - this.liftBuf * P + this.canvasTop,
      r: silhouetteRadiusPx(this.view.zoom, ch),
      alpha,
      width: this.width,
      height: this.height,
    });
  }

  /** The ring's state (checks): shown, tone, glyphs, size of its canvas; null when there is none. */
  ringState() {
    const ring = this.ring;
    if (!ring) return null;
    const alpha = ringAlpha(this.view.zoom, this.fit, this.minZoom);
    return { ...ring.state(), zoomAlpha: alpha, fit: this.fit, floor: this.minZoom, silhouettePx: silhouetteRadiusPx(this.view.zoom, this.bufH * this.pixel) };
  }

  /** Checks and captures: hold the caption's entrance at `ms` after its start (null releases it) and draw. */
  pinCaption(ms: number | null) {
    this.caption?.pin(ms);
    this.requestRender();
  }

  /** Checks and captures: hold every caption line at `deg` degrees east of its place (null releases it). */
  pinCaptionAngle(deg: number | null) {
    this.caption?.pinAngle(deg);
    this.requestRender();
  }

  /** Whether there is a caption (the page has the showcase and the app gave it lines). */
  hasCaption(): boolean {
    return this.caption !== null;
  }

  /** The caption's state and the showcase's (checks): null when there is none. */
  captionState() {
    const c = this.caption;
    if (!c) return null;
    return { ...c.state(), showcase: this.showcaseOn, overlayHidden: this.lod.isSuppressed, animating: c.animating, zoom: this.view.zoom, fit: this.fit, floor: this.minZoom };
  }

  /* ------------------------------ showcase ------------------------------ */

  /**
   * The home screen is at rest (`GlobeProps.showcase`): every box and label fades out (the tree's targets go off: engine/lod-tree.ts
   * `setSuppressed`, inert by the pick rules) and the caption comes in, each line round from behind the planet (engine/caption.ts); the camera,
   * when it is not at the lowest zoom (the home screen's own composition), comes back to it. Off: the other way round, quickly. On a page without
   * the showcase (`?no-ring`, a debug page) this does nothing: the boxes stay.
   */
  setShowcase(on: boolean) {
    const want = on && this.showcaseActive;
    if (want === this.showcaseOn) return;
    this.showcaseOn = want;
    this.applyShowcase();
    if (want && this.view.zoom > this.minZoom + 0.02 && this.view.zoom <= this.fit + SPIN.unzoomedSlack && this.flight === null) this.flyTo({ zoom: this.minZoom });
  }

  /** The showcase ends on its own (a gesture on the globe): the same, without asking the app. */
  private dropShowcase() {
    if (!this.showcaseOn) return;
    this.showcaseOn = false;
    this.applyShowcase();
  }

  private applyShowcase() {
    this.lod.setSuppressed(this.showcaseOn);
    const now = performance.now();
    if (this.showcaseOn) this.caption?.show(now);
    else this.caption?.hide(now);
    this.requestRender();
  }

  private syncCamera() {
    const v = this.drawView();
    const b = viewBasis(v, this.bufH * this.pixel);
    const cam = this.camera;
    cam.fov = FOV_DEG;
    cam.aspect = this.bufW / this.bufH;
    cam.near = Math.max(0.02, b.d - 1.05);
    cam.far = b.d + 1.05;
    cam.position.set(b.c[0] * b.d, b.c[1] * b.d, b.c[2] * b.d);
    cam.up.set(b.north[0], b.north[1], b.north[2]);
    cam.lookAt(0, 0, 0);
    // Shift the projection centre left by `shiftBuf` pixels: render the window of a same-sized virtual frame
    // that starts `shiftBuf` pixels to the right.
    // and the same up by `liftBuf` (the window starts that many pixels lower in the virtual frame).
    if (this.shiftBuf || this.liftBuf) cam.setViewOffset(this.bufW, this.bufH, this.shiftBuf, this.liftBuf, this.bufW, this.bufH);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const now = performance.now();
    this.globe.syncCamera(b, v.zoom, this.pixel, now, this.reduced);
    this.caption?.sync(b, now);
    this.globe.syncSky(cam, b, this.era, { w: this.bufW, h: this.bufH, shift: this.shiftBuf, lift: this.liftBuf }, now, this.reduced);
  }

  /* ------------------------------ diagnostics ------------------------------ */

  /** Frames drawn since creation (suspended ticks are not frames). */
  frameCount() {
    return this.frames;
  }

  /** Camera ticks since creation, drawn or suspended. */
  tickCount() {
    return this.ticks + this.frames;
  }

  /** JS time of the last `WebGLRenderer.render` call, ms. */
  lastRenderJsMs() {
    return this.lastRenderMs;
  }

  /** Blocking 1px read: forces the driver to finish all queued GPU work (measurement only). */
  gpuSync() {
    const gl = this.gl.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  }


  /** Inset state for checks: current inset and centre shift. */
  insetInfo() {
    return { inset: this.inset, target: this.insetTarget, shiftBuf: this.shiftBuf, bufW: this.bufW, pixel: this.pixel, lift: this.lift, liftTarget: this.liftTarget, liftBuf: this.liftBuf, cover: this.cover };
  }

  /** Draw-call and triangle counts of the last frame (WebGLRenderer.info). */
  renderInfo() {
    const { calls, triangles, points, lines } = this.gl.info.render;
    return { calls, triangles, points, lines, geometries: this.gl.info.memory.geometries };
  }

  /** Simulate losing and restoring the GL context (test only). */
  loseContext(lose: boolean) {
    // A lost context returns null from getExtension, so the handle is kept from the loss call.
    this.loseExt ??= this.gl.getContext().getExtension("WEBGL_lose_context");
    if (lose) this.loseExt?.loseContext();
    else this.loseExt?.restoreContext();
  }

  /* ------------------------------ teardown ------------------------------ */

  /** Frees every GL resource, the listeners and the canvas. Safe to call twice. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelFrame();
    for (const c of this.cleanups) c();
    this.cleanups = [];
    this.ring?.dispose();
    this.ring = null;
    this.caption?.dispose();
    this.caption = null;
    this.globe.dispose();
    this.gl.dispose();
    this.gl.forceContextLoss();
    this.canvas.remove();
  }
}
