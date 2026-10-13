/** Tuned constants (see docs/renderer-decision.md for how they were chosen). */
/**
 * THE art pixel: the size in CSS px of one cell of the pixel grid that the globe, the street map and the pixel text all
 * draw on (one constant, shared by both renderers and the labels). Desktop 2.5 (was 3), phones 2: a modest increase in
 * resolution, so the pixel effect is a little less visible and the type has more rows (docs/web-architecture.md, "Art
 * pixel size"). Change THIS to tune it; `pixelSize` below keeps it a whole number of device pixels.
 */
export const ART_PIXEL: { desktop: number; phone: number; phoneBelow: number } = { desktop: 2.5, phone: 2, phoneBelow: 520 };

/** Checks only: `?art-px=N` (or sessionStorage "art-px") overrides the desktop art pixel, on pages in debug mode. Call before the renderers are built. */
export function applyDebugArtPixel(): void {
  try {
    const debug = new URLSearchParams(location.search).has("globe-debug") || sessionStorage.getItem("globe-debug") === "1";
    if (!debug) return;
    const q = new URLSearchParams(location.search).get("art-px") ?? sessionStorage.getItem("art-px");
    const n = Number(q);
    if (q && Number.isFinite(n) && n >= 1 && n <= 6) {
      ART_PIXEL.desktop = n;
      ART_PIXEL.phone = Math.min(ART_PIXEL.phone, n);
    }
  } catch {
    // no storage: keep the default
  }
}

export const TUNING = {
  /**
   * Size of one art pixel in CSS px, as a function of the smaller viewport side and the device pixel ratio ONLY (nothing
   * measured at runtime moves it: no frame-time feedback, no module state): `ART_PIXEL`, rounded to a whole number of
   * device pixels, because otherwise nearest-neighbour upscaling shimmers
   * (2.5 is 5 device px at DPR 2 but 2.5 at DPR 1: ties go DOWN, so DPR 1 gets 2 CSS px, never a coarser 3; Android's
   * 2.625 and Windows' 1.25 and 1.5 get the nearest whole device size).
   */
  pixelSize(minSide: number, dpr: number): number {
    const base = minSide < ART_PIXEL.phoneBelow ? ART_PIXEL.phone : ART_PIXEL.desktop;
    return Math.max(1, Math.round(base * dpr - 1e-9)) / dpr;
  },
  /**
   * Country borders are ON from `on` (internal globe zoom) and OFF below, with a hysteresis of `band` each side; the fade between the two
   * states is a timed tone ramp through the palette's grey levels (`FADE_MS`), not a function of zoom. The middle of the old ramp (3.0 to
   * 3.5); the street cut is at 3.7, so the borders are at their coast level well before it.
   */
  borderZoom: { on: 3.25, band: 0.05 },
  maxZoom: 6.5,
  /** Street map's maximum MapLibre zoom (STREET_TUNING.maxZoom); the unified camera's range ends there. */
  streetMapMaxZoom: 17.5,
  /** Latitude clamp for the view centre. */
  maxLat: 82,
  /** The globe's lifted route arcs flatten onto the ground between these (internal) zooms, ahead of the handover's dissolve (`routeLift`). */
  routeFlat: { start: 2.5, end: 3.3 },
  /** Zoom used when rotating to a selected place (never zooms out). */
  selectZoom: 3.2,
  /** Route draw-on animation duration, ms. */
  routeDrawMs: 2200,
  /**
   * A marker is hidden, as a whole, once its centre is closer than this to the globe's silhouette, in art pixels
   * (the half-size of the largest marker, so a drawn marker never overhangs the limb).
   */
  markerLimbClearance: 4,
  /** Pick radius in CSS px per pointer type. */
  pickRadius: { mouse: 12, touch: 22 },
  /**
   * Duration (ms) of the globe's re-centring when the right inset appears or disappears. Mirrors `--duration-slow`
   * (the detail panel's slide), together with `INSET_EASE`; `app/lib/tokens.test.ts` keeps them in sync.
   */
  insetMs: 360,
  /** Fraction of the smaller side left empty around the whole globe at minimum zoom. */
  fitMargin: 0.12,
  /** Inertia time constant in ms and the fling speed cap in px per ms. */
  inertiaMs: 320,
  maxFlingPxPerMs: 2.2,
} as const;

/**
 * The skybox (engine/sky.ts, engine/sky-layer.ts; docs/web-architecture.md "Skybox", docs/design-tokens.md "Sky"): the Milky Way and a sparse
 * star field behind the earth, a few palette levels BELOW the graticule (`faint`), faded to the page colour towards the earth's silhouette.
 * Angles in degrees, radii in earth radii on screen (1 = the silhouette), tones as palette levels (`skyTop`), densities as fractions.
 */
export const SKY = {
  /**
   * The earth rotation angle at load (GMST, degrees): the right ascension of the Greenwich meridian. It is a fixed number so the sky is the
   * same on every visit; it is the ONLY thing that places the sky relative to the earth. The idle rotation adds to it (renderer `era`), a
   * camera orbit does not. Chosen so the opening view (lon 15, lat 28) has the band crossing the wings of the globe on a slant.
   */
  eraDeg: 70,
  /** Seed of every random choice of the sky (noise lattice, star positions, tiers and keep ranks). */
  seed: 0x5ca1ab1e,
  /** The baked band map in galactic coordinates: `cols` over longitude 0..360, `rows` over latitude +-`bMaxDeg` (zero beyond). */
  map: { cols: 256, rows: 64, bMaxDeg: 45 },
  band: {
    /** Brightest value the map reaches (0..1 of the top tone): the galactic centre. */
    gain: 0.9,
    /** The band's brightness and thickness fall off from the galactic centre with this width (degrees of galactic longitude). */
    centreSpreadDeg: 55,
    /** Half-thickness (1 sigma, degrees of galactic latitude) at the anticentre and at the galactic centre. */
    thicknessDeg: { edge: 5.5, core: 10 },
    /** Brightness at the anticentre and at the galactic centre (0..1 of `gain`). */
    brightness: { edge: 0.5, core: 1 },
    /** The nuclear bulge: an extra blob on the galactic centre. */
    bulge: { sigmaDeg: 7, share: 0.5 },
    /** The Great Rift: a dust lane along the band, wavy, from galactic longitude `fromDeg` to `toDeg`. */
    rift: { fromDeg: -25, toDeg: 80, widthDeg: 2.6, depth: 0.8, waveDeg: 1.8, wavePeriodDeg: 55 },
    /** Coarse value noise (octaves: frequency per radian, weight): mottling, and dust breaks where it dips below `breakBelow`. */
    noise: { octaves: [[7, 0.6], [15, 0.3], [34, 0.1]] as const, floor: 0.5, breakBelow: 0.34, breakDepth: 0.75 },
  },
  stars: {
    count: 20000,
    /** Star density along the band relative to the sky away from it (1 = no preference): "slightly more of them along the band". */
    bandBoost: 1.8,
    /**
     * The shares of the stars at the three star tones, faintest first: palette levels 1 and `skyTop` (the band's two tones) and the
     * graticule's `faint` level, the brightest anything in the sky gets (`starTop`, a cap: the boxes, labels and the graticule's own
     * dots are never outshone). A heavy tail: many faint, some middling, a few brighter (each tier about 2 times rarer than the one
     * below). Sums to 1. Owner (2026-10-08): "not super bright, just a bit brighter", to add noise to the band and to the open sky.
     */
    tierShares: [0.6, 0.28, 0.12] as const,
  },
  /**
   * The sky is dimmed, never removed, towards the earth: it is drawn right up to the silhouette (`from` 1) at `limb` of its strength (a
   * slight dimming, enough that the horizon outline, a quiet ring of its own, keeps its contrast) and eases up to its full
   * strength at `to` earth radii from the centre of the globe (smoothstep). The band's brightness is scaled by it before the dither, and
   * a star is kept while the factor exceeds its fixed random rank (a thinning of the field, never a dimmer star).
   */
  fade: { from: 1, to: 1.55, limb: 0.55 },
  /** The sky is on while the farthest corner of the picture is more than `rho` radii from the globe's centre (off when it comes within `rho - band`, on again at `rho + band`): a binary state with a hysteresis, its fade runs by time. */
  onRho: { rho: 1.75, band: 0.05 },
} as const;

/**
 * The lift (engine/lift.ts): while the landing hero covers the bottom of the page the planet's centre goes up so that the planet clears it as far as
 * the room above allows. `gapPx`: air kept between the planet's lowest point and what covers it; `marginPx`: the least room kept above the highest
 * thing (the planet, or the ring when it is shown). The tween is the inset's (`TUNING.insetMs`, `INSET_EASE`).
 */
export const LIFT = { gapPx: 14, marginPx: 14 } as const;

/** `cubic-bezier` control points of the app's standard easing (`--ease-standard`). */
export const INSET_EASE = [0.2, 0, 0, 1] as const;

/**
 * The orbiting type (engine/ring.ts, engine/orbit.ts, engine/orbit-layer.ts; docs/web-architecture.md, "Orbiting type"): two pieces of the site's
 * type that live in the planet's space and are seen through the globe's own perspective camera, over the planet and crisp (a layer above the pixel
 * buffer, not part of it). The RING (A) is one short line of the site's identity in the map's mono face that circles the planet in a tilted
 * plane; the BAND (B) is a heavy two-line caption of the display face that wraps a shell just above the surface and tells the visitor what to
 * do. They exist only in the zoomed-OUT regime below the whole-globe fit, while the home screen is at rest (`GlobeProps.showcase`).
 *
 * Sizes in planet radii (1 = the sphere's radius) unless a name says px. Everything that can be tuned by eye is here.
 */
export const RING = {
  /** The ring's baseline circle, as a fraction of the planet's radius above the surface: its radius is `1 + gap` planet radii. */
  gap: 0.22,
  /**
   * How the ring is tipped. `tiltDeg`: the plane is turned about the view's horizontal axis so that its top goes away from the viewer (0 = facing
   * the viewer, a flat circle; 90 = edge on). `rollDeg`: then turned about the view axis (counter-clockwise positive), so the orbit leans.
   */
  tiltDeg: 72,
  rollDeg: -8,
  /** Turning speed, degrees a second, on the ring's own clock; `direction` -1 slides the line to the left on the near arc, against the globe's own turn and the way it reads, like a ticker. */
  degPerSec: 3,
  direction: -1,
  /** Where the line starts: degrees counter-clockwise from the near point, so the name starts at the front. */
  startDeg: 0,
  /**
   * The type of the ring: the weight, the tracking (em added to the monospace's 0.6 em advance), and the em size (CSS px) the letters have at the
   * lowest zoom. The line goes round a WHOLE number of times (`ringLayout`): the count is the one whose letters, at the nominal tracking, come
   * nearest `targetEmPx`, then the em is allowed to move by `emSlack` and the tracking takes the rest up, so the seam closes evenly at any size.
   */
  type: { weight: 500, tracking: 0.14, advanceEm: 0.6, targetEmPx: 11, emSlack: 0.15 },
  /** Between the phrases (and after the last, which closes the loop). */
  separator: " \u00b7 ",
  /** Palette role (engine/palette.ts) of the ring's letters: the box's own tone at rest, over the page colour. */
  tone: "peak",
  /** Opacity of the glyphs on the far side of the planet (seen outside the disc): a depth cue. */
  farAlpha: 0.5,
  /**
   * The band: a caption in the display face wrapped on a shell. `radius`: the shell, a little above the surface. `emR`: the em in planet radii (the
   * caps are 0.7 of it). `lines` lines `leading` em apart each go round the whole planet: line i has phrase `i mod n` at the front, so at the
   * start the phrases are one under the other and as the band slides they swap. `leanDeg`: the axis the lines go round is leaned towards the viewer
   * by this much (negative: away), which makes the lines arch, `riseDeg`: the lines are that much higher on the face than where the view's centre is;
   * `rollDeg`: and rolled (counter-clockwise positive). `minGapEm`: air kept at the seam
   * of a loop. `degPerSec`: slides to the left (against the globe's turn), on its own clock. `outlineEm`: the page-colour keyline round the letters
   * that keeps them readable over the coastlines.
   */
  band: {
    radius: 1.04,
    emR: 0.2,
    leading: 1.0,
    lines: 2,
    leanDeg: -18,
    riseDeg: 22,
    rollDeg: -9,
    minGapEm: 2,
    degPerSec: 4,
    startDeg: 0,
    weight: 800,
    /** Tracking of the heavy capitals, em added to every advance (the display face is set tight, as in the hero's name). */
    tracking: -0.02,
    outlineEm: 0.11,
    separator: " \u00b7 ",
  },
  /**
   * Zoom range. `floorBelowFit`: the lowest zoom is at least this many zoom levels below the whole-globe fit (0.5 levels = the globe 0.71 times its fit
   * size), and lower still when the ring does not fit the free area with `fitMargin` of it left empty. `fade`: the type's presence by the way from the
   * fit (0) to the lowest zoom (1): gone up to `from`, full from `to`, a smoothstep between.
   */
  zoom: { floorBelowFit: 0.5, fitMargin: 0.12, fade: { from: 0.08, to: 0.6 } },
  /** At most one frame every `frameMs` (30 fps: the type is slow, the pixels it moves a frame are under one) and no step longer than `maxStepMs` (a stalled frame must not jump). */
  frameMs: 32,
  maxStepMs: 100,
  /** Largest device pixel ratio the layer's canvas is drawn at (the type is crisp at 2; a phone's 3 would cost 2.25 times the pixels). */
  maxDpr: 2,
} as const;
