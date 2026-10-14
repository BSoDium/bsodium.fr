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

/** Where the camera starts when the page gives no view: no tilt, centred on the point (lon 0, lat 0). Inside the caption's band by construction. */
export const START_VIEW = { lon: 0, lat: 0 } as const;

/** `cubic-bezier` control points of the app's standard easing (`--ease-standard`). */
export const INSET_EASE = [0.2, 0, 0, 1] as const;

/**
 * The caption (engine/caption.ts, engine/caption-layer.ts; docs/web-architecture.md, "Orbiting type"): the home screen's call to action, lines of
 * outlined serif type that FLOAT over the planet on a shell well above its surface, each on a real parallel of the globe (so each has that
 * parallel's tilt and curvature in the camera's orientation), thick (extruded towards the planet in the outline's colour), centred on the central
 * meridian, stacked one under the other. Drawn crisp at the device's resolution in a second canvas that is still depth-tested against the
 * planet (the art-pixel pass is not an option: an outlined serif is unreadable at its cell size).
 *
 * Sizes in planet radii (1 = the sphere's radius), angles in degrees. Everything that can be tuned by eye is here.
 */
export const CAPTION = {
  /** The shell the letters' FRONT face is on: floating, clearly above the surface (the orbit). The extrusion goes down towards the planet from it. */
  radius: 1.25,
  /**
   * Cap height of EVERY row, in planet radii: one size for the rows that take turns and for the call to action (the hierarchy is the weight and
   * the face, not the size). Four rows are in view at once; the whole block shrinks together when a row would not fit the chord of its parallel
   * (`fitScale`).
   */
  capR: 0.084,
  /**
   * The words are set in capitals (the caption's drawing only: the page's text and the accessible text are as the app wrote them) and tracked:
   * `tracking` is added to each face's own letter spacing (ems of the face). Capitals set tight read as a block; a little air reads as a line.
   */
  upper: true,
  tracking: { serif: 0.05, mono: 0.03, script: 0.02 },
  /**
   * Where the rows sit (engine/caption.ts `rowLatitudes`): on FIXED parallels, centred on the equator and uniformly spaced, `stepCaps` cap heights
   * from one baseline to the next; nothing recomputes them per camera tilt. A row spans at most `hardSpanDeg` of its parallel and no farther than
   * `visibleFraction` of the shell's horizon from the view's axis for any camera inside the band (the whole block is shrunk, statically, when
   * one would not fit: `fitScale`; the shell's radius is what is raised first).
   */
  rows: { stepCaps: 1.7 },
  /** A row's half width on the screen is at most this share of the planet's silhouette radius: the words stay over the planet, off the page's own text. */
  maxHalfWidth: 1.04,
  hardSpanDeg: 160,
  visibleFraction: 0.85,
  /** The least scale the whole block is shrunk to. */
  minScale: 0.2,
  /** The smallest cap height a letter may have, CSS px. */
  minCapPx: 12,
  /**
   * The camera latitude the caption needs: it is shown only while |latitude| is inside `deg` of the equator. Before it comes back (the idle
   * delay, a return to rest) a camera outside the band glides its LATITUDE ONLY (never the longitude, the zoom is the page's) to the nearest
   * edge in `snapMs`, ease-out, and only then does the entrance start; a camera that leaves the band under the caption (a flight) fades it,
   * and the caption is back `hysteresisDeg` inside. `snapTo`: the nearest edge of the band (`edge`) or the equator (`equator`). The page opens
   * at `START_VIEW` (no tilt, centred on lon 0, lat 0: the equator is a horizontal line through the disc's middle).
   */
  band: { deg: 10, snapMs: 800, hysteresisDeg: 1.5, snapTo: "edge" as "edge" | "equator" },
  /**
   * The rows that take turns: a phrase set stays `dwellMs`, then goes (each row round the orbit and behind the limb in `exitMs`, `exitStaggerMs`
   * after the row above) and the next one comes in from random sides, row by row `enter.staggerMs` apart. The first incoming row starts as the
   * first outgoing one has left (`exitMs`: the ease-in keeps a row on the face until its very end), not once the LAST has gone: the rows above
   * are never both empty at once.
   */
  cycle: { dwellMs: 5500, exitMs: 480, exitStaggerMs: 140 },
  /** The thickness of the letters, in planet radii (towards the planet from the front face), and the number of slices stacked to make it. */
  depth: 0.016,
  slices: 28,
  /**
   * The entrance: each line starts hidden behind the planet (`fromDeg` of longitude from the central meridian at least, and as far as its parallel
   * needs to be hidden), on a side of its own drawn at random per entrance (west or east along its parallel), travels round the sphere to its
   * place with `easeOutExpo`, `ms` in all, line i starting `staggerMs` after line i - 1 (on load, `loadDelayMs` later still: the page's own
   * fade-in goes first). Leaving is quick: it goes on behind the planet the same way in `leaveMs`.
   */
  enter: { fromDeg: 100, ms: 900, staggerMs: 450, loadDelayMs: 250 },
  /**
   * Leaving. The interaction's exit is a FADE of the caption's canvas (`fadeMs`, a CSS opacity transition on the compositor: no geometry and
   * no texture while it runs, the lines keep following the camera); the orbit exit (the lines go on round behind the planet the same way,
   * `leaveMs`, ease-in) stays available for a caption whose words change (`CaptionLayer.hide(now, "orbit")`).
   */
  fadeMs: 180,
  leaveMs: 200,
  /** The outline's width, in cap heights: drawn OUTSIDE the glyph, so the face keeps its whole area (the inside is the face's colour). */
  outline: 0.04,
  /**
   * Colours, from the globe's own palette (engine/colors.ts): the face is the page colour tinted towards the ink (`faceMix`, per scheme: a dark
   * page needs more of the ink for the face to read), the outline the coastline's tone pushed `outlineMix` of the way to the ink, the extrusion
   * `sideMix` of the way from the face to the outline (a tone of its own, between the two). Greys only.
   */
  colors: { faceMix: { light: 0.03, dark: 0.26 }, outlineMix: { light: 0.6, dark: 0.45 }, sideMix: { light: 0.3, dark: 0.7 } },
  /** Sampling: the shader looks `lodBias` levels sharper than the screen asks (negative: sharper). Texture: texels in a cap height. */
  lodBias: -0.5,
  texCap: 96,
  /**
   * The dimming behind the words: a faint "reverse shadow" in the PAGE's colour that lowers the globe's own linework (coastlines, graticule,
   * borders) where the words sit, drawn in the caption's canvas between the planet and the letters (so only over the planet: the ring, the labels
   * and the page are never touched) and gone with the words (it follows their entrance, swap and fade). `mode`: `ellipse` one soft ellipse
   * about the whole block (a screen-space falloff, one quad), `bands` one soft band per row on its own parallel (it follows the row round the
   * orbit), `none`. `alpha` is the strength at the middle (per scheme: a dark page's linework is dimmer to start with), `reach` how far past the
   * block's ink the falloff goes to zero (a fraction of the block's half size), `bandReach` the same for a band, in the row's own half height.
   */
  dim: {
    mode: "ellipse" as "ellipse" | "bands" | "none",
    alpha: { light: 0.55, dark: 0.55 },
    reach: 0.55,
    bandReach: 1.9,
  },
} as const;

/**
 * The ring of type (engine/ring.ts, engine/ring-layer.ts; docs/web-architecture.md, "Ring of type"): one short line of the site's identity, set in
 * the map's monospace on a flat circle concentric with the planet's disc (the circle of its silhouette, a little larger), tops of the letters
 * outward, running clockwise and turning slowly on its own clock. It exists only in the zoomed-OUT regime below the whole-globe fit and fades
 * out as the camera comes in, so it is gone at the fit: the boxes and the labels of the world view never compete with it.
 *
 * Sizes in CSS px or as named. Everything that can be tuned by eye is here.
 */
export const RING = {
  /**
   * The gap between the planet's silhouette and the BASELINE of the letters, as a fraction of the silhouette's radius (0.06: 17 px at the lowest
   * zoom on a 1440 x 900 screen). The letters' tops point outward from there.
   */
  gap: 0.06,
  /** Turning speed, degrees a second, on the ring's own clock. The globe's idle rotation is 0.2 (`SPIN.degPerSec`); the ring turns at 3. */
  degPerSec: 3,
  /** `1`: clockwise, the way the text reads (the letters move along the line); `-1` the other way. */
  direction: 1,
  /** Where the line starts when the ring appears: degrees clockwise from twelve o'clock. */
  startDeg: 0,
  /**
   * The type: the weight, the tracking (em added to the monospace's 0.6 em advance; the nav's `.nav-link` is 0.14), and the em size (CSS px) the
   * letters have at the lowest zoom. The line goes round a WHOLE number of times (`ringLayout`): the count is the one whose letters, at the
   * nominal tracking, come nearest `targetEmPx`, then the em is allowed to move by `emSlack` (a fraction) and the tracking takes the rest up, so
   * the seam closes evenly at any size. The type then scales with the planet (the ring is an object of the planet's), so a closed ring stays closed.
   */
  type: { weight: 500, tracking: 0.14, advanceEm: 0.6, targetEmPx: 11, emSlack: 0.15 },
  /** Between the phrases (and after the last, which closes the loop). */
  separator: " \u00b7 ",
  /**
   * Zoom range. `floorBelowFit`: the lowest zoom is at least this many zoom levels below the whole-globe fit (0.5 levels = the globe 0.71 times its fit
   * size), and lower still when the ring does not fit the free area with `fitMargin` of it left empty (never on a screen with a 4:3 or wider
   * shape). `fade`: the ring's strength by the way from the fit (0) to the lowest zoom (1): gone up to `from`, full from `to`, a smoothstep
   * between, quantised to palette tones.
   */
  zoom: { floorBelowFit: 0.5, fitMargin: 0.12, fade: { from: 0.08, to: 0.6 } },
  /** Palette role (engine/palette.ts) of the letters: not louder than the coastline (`coast`), so a coast is never outshone. */
  tone: "coast",
  /** At most one frame every `frameMs` (30 fps: the ring is slow, the pixels it moves a frame are under one) and no step longer than `maxStepMs` (a stalled frame must not jump). */
  frameMs: 32,
  maxStepMs: 100,
  /** Largest device pixel ratio the ring's canvas is drawn at (the type is crisp at 2; a phone's 3 would cost 2.25 times the pixels). */
  maxDpr: 2,
} as const;
