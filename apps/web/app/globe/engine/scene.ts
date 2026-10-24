import type { Polylines } from "@catalyst/geodata";
import {
  BufferAttribute,
  BufferGeometry,
  LineLoop,
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LineSegments,
  Float32BufferAttribute,
  Mesh,
  Points,
  RedFormat,
  RepeatWrapping,
  UnsignedByteType,
  type PerspectiveCamera,
  Scene,
  SphereGeometry,
  type ShaderMaterial,
} from "three";
import type { GlobePlace, GlobeRoute } from "../types";
import type { GlobeTheme, Rgb } from "./colors";
import { FadeArray, clockStep } from "./fade";
import { borderLevel, bordersWanted } from "./palette";
import type { ViewBasis } from "./geo";
import { zoomToRadiusPx } from "./geo";
import { LAND_H, LAND_W, landMask } from "./land";
import { GRATICULE_STEP_DEG, graticuleSegments, polylinesToSegments } from "./geometry";
import { OCCLUDER_RADIUS, atmosphereMaterial, beamMaterial, cityMaterial, mistMaterial, lineMaterial, occluderMaterial, silhouetteMaterial } from "./materials";
import { RouteLayer } from "./route-layer";
import { SKY_STATE, viewToGalactic } from "./sky";
import { SkyLayer } from "./sky-layer";
import { routeLift } from "./view";
import { TUNING } from "./tuning";


/** How much of the ink the filled land has (the rest is the page's colour): near the ink, as the letters' metal is. */
const LAND_SHARE = 0.86;
/** The mist: the glow is `glowPx` buffer pixels thick (kept between the least and most it may stand off the surface), and the beams (`prepareBeams`): how many, how long (radii). */
const BEAMS = { count: 20, lenMin: 0.22, lenMax: 0.6, glowPx: 4, minShell: 0.004, maxShell: 0.06 };
const BEAM_SEED = 0x51ed;
/** The most lights (places) the planet shows at the chord. */
const CITY_LIGHTS = 16;

function segmentGeometry(positions: Float32Array): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(positions, 3));
  return g;
}

/**
 * Everything drawn: sky, disc, graticule, borders, coastlines, routes, markers, horizon outline.
 * Owns its GL-side resources (`dispose` frees them all). Knows nothing about input, DOM or scheduling.
 */
export class GlobeScene {
  readonly scene = new Scene();
  readonly routes: RouteLayer;
  /** The Milky Way and the stars behind the earth (engine/sky-layer.ts), or null when the page switched them off (`applySkyFlags`). */
  readonly sky: SkyLayer | null;

  private geometries: BufferGeometry[] = [];
  private materials: ShaderMaterial[] = [];
  private occluder = occluderMaterial();
  private city = cityMaterial();
  private atmosphere = atmosphereMaterial();
  private mist = mistMaterial();
  private beams = beamMaterial();
  private beamMesh: Mesh | null = null;
  private mistMesh: Mesh | null = null;
  private atmosphereMesh: Mesh | null = null;
  private atmosphereNow = 0;
  private cityNow = 0;
  private coastData: Polylines | null = null;
  private landTex: DataTexture | null = null;
  private landNow = 0;
  private landFill: Rgb = [0, 0, 0];
  private graticule = lineMaterial(1, 3);
  private borders = lineMaterial(1);
  private bordersLines: LineSegments | null = null;
  private ramp: readonly Rgb[] = [];
  private borderLevelNow = -1;
  /** The borders are ON or OFF (decided from the zoom with a hysteresis), and their tone runs to it by time: a timed fade, never a resting grey. */
  private borderFade = new FadeArray(1);
  private bordersOn = false;
  private bordersSeen = false;
  private lastClock = 0;
  private coast = lineMaterial(1);
  private silhouette = silhouetteMaterial();

  constructor(data: {
    places: readonly GlobePlace[];
    routes: readonly GlobeRoute[];
    coastlines: Polylines;
    borders: Polylines;
  }) {
    this.materials.push(this.occluder, this.city, this.atmosphere, this.mist, this.beams, this.graticule, this.borders, this.coast, this.silhouette);
    this.coastData = data.coastlines;

    const disc = new SphereGeometry(OCCLUDER_RADIUS, 96, 48);
    this.geometries.push(disc);
    this.add(new Mesh(disc, this.occluder), 0);

    // Each layer is drawn in a fixed order (renderOrder) over the disc: grid, borders, coast, routes, horizon outline,
    // markers (last, so nothing can draw over a marker).
    // the atmosphere shell (the cinematic interlude's: hidden, and not drawn at all, outside it)
    const shell = new SphereGeometry(1, 96, 48); // (scaled to a few art pixels over the limb each frame: `frameAtmosphere`)
    this.geometries.push(shell);
    this.atmosphereMesh = new Mesh(shell, this.atmosphere);
    this.atmosphereMesh.visible = false;
    this.atmosphereMesh.frustumCulled = false;
    this.atmosphereMesh.scale.setScalar(1.03);
    this.add(this.atmosphereMesh, 0.5);
    // and the mist on the ground itself, over the lines (a hair above the surface, which the lines are drawn on)
    const skin = new SphereGeometry(1.004, 96, 48);
    this.geometries.push(skin);
    this.mistMesh = new Mesh(skin, this.mist);
    this.mistMesh.visible = false;
    this.mistMesh.frustumCulled = false;
    this.add(this.mistMesh, 5);

    this.add(new LineSegments(this.track(segmentGeometry(graticuleSegments(GRATICULE_STEP_DEG, 3))), this.graticule), 1);
    this.bordersLines = new LineSegments(this.track(segmentGeometry(polylinesToSegments(data.borders, 1))), this.borders);
    this.add(this.bordersLines, 2);
    this.add(new LineSegments(this.track(segmentGeometry(polylinesToSegments(data.coastlines, 1))), this.coast), 3);

    // the places' lights: a dot for each of the owner's places, one for those within two degrees of another (a city and its districts are one light), a few
    const lights: number[] = [];
    const taken = new Set<string>();
    for (const pl of data.places) {
      const key = `${Math.round(pl.lon / 2)},${Math.round(pl.lat / 2)}`;
      if (taken.has(key) || lights.length >= CITY_LIGHTS * 3) continue;
      taken.add(key);
      const cl = Math.cos((pl.lat * Math.PI) / 180);
      const lam = (pl.lon * Math.PI) / 180;
      lights.push(1.003 * cl * Math.sin(lam), 1.003 * Math.sin((pl.lat * Math.PI) / 180), 1.003 * cl * Math.cos(lam));
    }
    if (lights.length) {
      const cityPoints = new Points(this.track(segmentGeometry(new Float32Array(lights))), this.city);
      cityPoints.frustumCulled = false;
      this.add(cityPoints as unknown as Mesh, 7);
    }
    this.routes = new RouteLayer(this.scene, data.routes);
    this.sky = SKY_STATE.enabled ? new SkyLayer(this.scene) : null;

    const N = 360;
    const angle = new Float32Array(N);
    for (let i = 0; i < N; i++) angle[i] = (i / N) * Math.PI * 2;
    const ring = this.track(new BufferGeometry());
    ring.setAttribute("position", new BufferAttribute(new Float32Array(N * 3), 3));
    ring.setAttribute("aAngle", new BufferAttribute(angle, 1));
    const outline = new LineLoop(ring, this.silhouette);
    outline.frustumCulled = false;
    this.add(outline, 6);
  }

  private track(g: BufferGeometry): BufferGeometry {
    this.geometries.push(g);
    return g;
  }

  private add(object: Mesh | LineSegments | LineLoop, renderOrder: number) {
    object.renderOrder = renderOrder;
    this.scene.add(object);
  }

  applyTheme(t: GlobeTheme) {
    // The disc is the ocean: exactly the page colour, so the far side stays hidden without a visible body.
    this.occluder.uniforms.uColor!.value.setRGB(...t.background);
    // the land the interlude fills: the ink, taken a little towards the page (a fill of the full ink is the loudest thing on the page), and the borders over it the page's
    this.landFill = [0, 1, 2].map((i) => t.background[i]! + (t.ink[i]! - t.background[i]!) * LAND_SHARE) as unknown as Rgb;
    this.occluder.uniforms.uFill!.value.setRGB(...this.landFill);
    this.borders.uniforms.uAlt!.value.setRGB(...t.background);
    // the accent, as the page has it in this scheme (app.css `--palette-blue`; the lighter step on the dark page)
    if (t.scheme === "dark") this.city.uniforms.uColor!.value.setRGB(0.29, 0.64, 0.96);
    else this.city.uniforms.uColor!.value.setRGB(0, 0.47, 0.84);
    // The mist is MONOCHROME and quiet: a grey, a step from the page's colour towards its ink (no accent), at a low density. The glow above the limb is that grey; the
    // veil on the ground is the page's own colour with a trace of ink, so it covers the lines without painting anything.
    const bg = t.background;
    const mixTo = (k: number) => [0, 1, 2].map((i) => bg[i]! + (t.ink[i]! - bg[i]!) * k) as [number, number, number];
    this.atmosphere.uniforms.uColor!.value.setRGB(...mixTo(0.55));
    this.mist.uniforms.uColor!.value.setRGB(...mixTo(0.12));
    this.beams.uniforms.uColor!.value.setRGB(...mixTo(0.55));
    this.atmosphere.uniforms.uCover!.value = t.scheme === "dark" ? 0.55 : 0.45;
    this.mist.uniforms.uCover!.value = t.scheme === "dark" ? 0.4 : 0.32;
    this.beams.uniforms.uCover!.value = t.scheme === "dark" ? 0.3 : 0.26;
    this.graticule.uniforms.uColor!.value.setRGB(...t.grid);
    this.ramp = t.ramp;
    this.borderLevelNow = -1;
    this.coast.uniforms.uColor!.value.setRGB(...t.coast);
    this.silhouette.uniforms.uColor!.value.setRGB(...t.outline);
    this.routes.applyTheme(t);
    this.sky?.applyTheme(t);
  }

  /**
   * Make the land mask now (engine/land.ts: a few milliseconds and 2 MB; the interlude is planned, so it is done before it begins and not in the frame
   * that starts it). Idempotent.
   */
  prepareLand() {
    if (this.landTex || !this.coastData) return;
    const tex = new DataTexture(landMask(this.coastData), LAND_W, LAND_H, RedFormat, UnsignedByteType);
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearFilter;
    tex.wrapS = RepeatWrapping;
    tex.wrapT = ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.unpackAlignment = 1;
    tex.needsUpdate = true;
    this.landTex = tex;
    this.occluder.uniforms.uLandMap!.value = tex;
  }

  /** The sun's direction in the earth's frame (the planet's light; the letters have the same one in the camera's frame). */
  setSun(x: number, y: number, z: number) {
    this.atmosphere.uniforms.uSun!.value = [x, y, z];
    this.occluder.uniforms.uSun!.value = [x, y, z];
    this.city.uniforms.uSun!.value = [x, y, z];
  }

  /**
   * Make the beams now: a place on the land for each (a few ms for the coarse mask; the interlude is planned, so not in the frame that starts it). Idempotent. A fixed
   * seed, so the same lights rise in the same places each time.
   */
  prepareBeams() {
    if (this.beamMesh || !this.coastData) return;
    const mask = landMask(this.coastData, 512, 256);
    let seed = BEAM_SEED;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pos: number[] = [];
    const info: number[] = [];
    const idx: number[] = [];
    for (let n = 0, tries = 0; n < BEAMS.count && tries < 4000; tries++) {
      const lon = (rnd() * 2 - 1) * Math.PI;
      const lat = Math.asin(rnd() * 2 - 1);
      if (Math.abs(lat) > 1.2) continue; // (not the ice caps)
      const col = Math.min(511, Math.floor(((lon / Math.PI + 1) / 2) * 512));
      const row = Math.min(255, Math.floor(((lat / (Math.PI / 2) + 1) / 2) * 256));
      if (mask[row * 512 + col] !== 255) continue;
      const len = BEAMS.lenMin + rnd() * (BEAMS.lenMax - BEAMS.lenMin);
      const sd = rnd();
      const x = Math.cos(lat) * Math.sin(lon);
      const y = Math.sin(lat);
      const z = Math.cos(lat) * Math.cos(lon);
      const o = n * 4;
      for (const [t, side] of [[0, -1], [0, 1], [1, -1], [1, 1]] as const) {
        pos.push(x, y, z);
        info.push(t, side, len, sd);
      }
      idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
      n++;
    }
    const g = this.track(new BufferGeometry());
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("aBeam", new Float32BufferAttribute(info, 4));
    g.setIndex(idx);
    this.beamMesh = new Mesh(g, this.beams);
    this.beamMesh.visible = false;
    this.beamMesh.frustumCulled = false;
    this.add(this.beamMesh, 4);
  }

  /**
   * The mist, 0 (none: nothing of it is drawn) to 1: a thin grey glow just over the limb, a veil on the ground thickening to the horizon, and the faint beams from the
   * land. Drawn for the length of the interlude only.
   */
  setAtmosphere(k: number) {
    const x = Math.min(1, Math.max(0, k));
    if (Math.abs(x - this.atmosphereNow) < 0.01 && !(x === 0 && this.atmosphereNow !== 0)) return;
    if (x > 0 && !this.beamMesh) this.prepareBeams();
    this.atmosphereNow = x;
    this.atmosphere.uniforms.uAmt!.value = x;
    this.mist.uniforms.uAmt!.value = x;
    this.beams.uniforms.uAmt!.value = x;
    if (this.atmosphereMesh) this.atmosphereMesh.visible = x > 0;
    if (this.mistMesh) this.mistMesh.visible = x > 0;
    if (this.beamMesh) this.beamMesh.visible = x > 0;
  }

  /**
   * What the mist needs each frame it is there: the glow's shell is made `thicknessPx` drawing-buffer pixels thick at the limb (whatever the distance: the shell is
   * `thicknessPx * sqrt(d^2 - 1) / focalPx` over the surface, a radial offset at the limb being seen foreshortened by exactly that), the size of a pixel for the beams'
   * width, and the clock for their swell.
   */
  frameAtmosphere(d: number, focalPx: number, bufW: number, bufH: number, nowMs: number) {
    if (this.atmosphereNow <= 0) return;
    const over = Math.min(BEAMS.maxShell, Math.max(BEAMS.minShell, (BEAMS.glowPx * Math.sqrt(Math.max(1e-4, d * d - 1))) / Math.max(1, focalPx)));
    const shell = 1 + over;
    this.atmosphere.uniforms.uShell!.value = shell;
    this.atmosphereMesh?.scale.setScalar(shell);
    this.beams.uniforms.uPixel!.value = [2 / bufW, 2 / bufH];
    this.beams.uniforms.uTime!.value = nowMs / 1000;
  }

  /** The places' lights, 0 (out) to 1: they come up through the dither. */
  setCity(k: number) {
    const x = Math.min(1, Math.max(0, k));
    if (Math.abs(x - this.cityNow) < 0.01 && !(x === 0 && this.cityNow !== 0)) return;
    this.cityNow = x;
    this.city.uniforms.uCity!.value = x;
  }

  /**
   * The continents are filled with the ink, 0 (not at all) to 1: the borders go to the page's colour over it so that they stay seen, the coastlines
   * (the ink's own tone) are the fill's edge. A change of a hundredth or more is written.
   */
  setLand(k: number) {
    const x = Math.min(1, Math.max(0, k));
    if (x > 0 && !this.landTex) this.prepareLand();
    if (Math.abs(x - this.landNow) < 0.01 && !(x === 0 && this.landNow !== 0)) return;
    this.landNow = x;
    this.occluder.uniforms.uLand!.value = x;
    this.borders.uniforms.uAltAmt!.value = x;
  }

  /** Whether the borders' fade has not reached its end: the frame loop must keep going. */
  get animating(): boolean {
    return this.borderFade.moving || (this.sky?.animating ?? false);
  }

  /** The borders' fade now (0..1) and whether they are wanted (checks). */
  borderState() {
    return { value: this.borderFade.value(0), on: this.bordersOn };
  }

  /** Run the borders' and the sky's fades to their end (checks). */
  settleBorders() {
    this.borderFade.settle();
    this.sky?.settle();
  }

  /**
   * Per-frame sky: the view-to-galactic matrix of this camera at the earth rotation angle `era`, and where the earth's silhouette is in
   * the buffer. Call after the camera's matrices are current. `bufW`, `bufH` and `shiftBuf` are the drawing buffer and the inset's shift (buffer px).
   */
  syncSky(camera: PerspectiveCamera, basis: ViewBasis, era: number, buf: { w: number; h: number; shift: number; lift?: number }, now: number, instant: boolean) {
    this.sky?.sync({ viewToGal: viewToGalactic(basis, era), projInv: camera.projectionMatrixInverse, d: basis.d, bufW: buf.w, bufH: buf.h, shiftBuf: buf.shift, liftBuf: buf.lift ?? 0 }, now, instant);
  }

  /** The keys of the legs that stay at this zoom (`RouteLayer.setThinning`), null: all. */
  kept: ReadonlySet<string> | null = null;

  /** Per-frame uniforms that depend on the camera. `now` is the clock (ms) the border fade runs on; `instant`: reduced motion. */
  syncCamera(basis: ViewBasis, zoom: number, pixel: number, now: number, instant: boolean, lat = 0, view = 0) {
    this.routes.setLift(routeLift(zoom));
    this.routes.setScale(pixel, zoomToRadiusPx(zoom));
    // the Web Mercator zoom with the scale the centre has on the globe (the unified zoom less log2 of the secant of the latitude)
    this.kept = this.routes.setThinning(zoom + Math.log2(Math.max(0.05, Math.cos((lat * Math.PI) / 180))), pixel, view);
    // Borders: on from the zoom `TUNING.borderZoom` (a hysteresis), off below. The fade is a timed TONE (a line is always solid): the faintest
    // grey level stepping up through the palette to the coast level (the coastline's, `borderLevel`) over `FADE_MS`, whatever the camera does, so the globe
    // at rest never shows a half-faded border. Never a dither: a low-coverage dither on 1px lines reads as noise instead of a fade.
    this.bordersOn = bordersWanted(this.bordersOn, zoom, TUNING.borderZoom);
    if (!this.bordersSeen) {
      this.bordersSeen = true; // the first frame starts in its state
      this.borderFade.snap(0, this.bordersOn);
    } else this.borderFade.set(0, this.bordersOn);
    if (this.borderFade.moving) this.borderFade.step(clockStep(this.lastClock, now), instant);
    this.lastClock = now;
    this.setBorderLevel(borderLevel(this.borderFade.value(0), this.ramp.length));
    const u = this.silhouette.uniforms;
    u.uC!.value = basis.c;
    u.uE!.value = basis.east;
    u.uN!.value = basis.north;
    u.uInvD!.value = 1 / basis.d;
  }

  private setBorderLevel(level: number) {
    if (level === this.borderLevelNow || !this.bordersLines) return;
    this.borderLevelNow = level;
    this.bordersLines.visible = level > 0;
    if (level > 0) this.borders.uniforms.uColor!.value.setRGB(...this.ramp[level]!);
  }

  dispose() {
    this.landTex?.dispose();
    this.routes.dispose();
    this.sky?.dispose();
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.geometries = [];
    this.materials = [];
    this.scene.clear();
  }
}
