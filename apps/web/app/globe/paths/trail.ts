/**
 * The colour of the paths: PLANE TRAILS (docs/paths.md, "Trails"). Every leg is a trail that runs from its origin (the tail) to its
 * destination (the head) along ONE gradient shared by all routes: a saturated blue at the tail that turns into a darker, more saturated
 * violet at the head (in the dark scheme, a lighter violet). One gradient, not a colour per trip: the map reads as one set of paths.
 *
 * One table for both renderers, pure (no WebGL, no DOM): the globe's shader and the street map's pixel pass read the SAME list of solid
 * colours (`trailColors`), so a trail looks the same on both sides of the hand-over (the pass matches the globe's pixels to the nearest
 * entry of its palette, so the entries must be the colours the globe draws, and they are).
 *
 * There are `TRAIL_BANDS` bands from the tail to the head (a mix of the blue and the violet, quantised: a pixel-art gradient, no smooth
 * ramp), then the LIT head colour (the selected place's legs: the full strength along the whole length) and the SPARK (the bright dot at
 * the head). Steps of the ladders (docs/design-tokens.md "Palettes"), light scheme / dark scheme:
 *
 *   tail  blue 500 / blue 500       the saturated blue the trail starts in
 *   head  violet 700 / violet 400   the faint legs' head; 3:1 or more against the page in both schemes (asserted in trail.test.ts)
 *   lit   violet 800 / violet 200   the whole length of a selected leg
 *   spark violet 900 / violet 50    the dot at the head: the extreme of the ladder on the side that contrasts with the page
 *
 * Colour is never the only carrier: the mode keeps its pattern (road solid, rail dashed with ticks, ferry and flight dotted, ...) and the
 * Journeys list says the same in words.
 */
// (No import from lib/: nothing under globe/ reaches the rest of the app, globe/layering.test.ts. lib/palette.ts has the maths for the tests.)
type PaletteName = "blue" | "green" | "ocre" | "violet";
type PaletteStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
const hexToRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** A solid mix in sRGB: `share` of `a`, the rest `b` (as `color-mix(in srgb)` does). */
const mixHex = (a: string, b: string, share: number): string => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return `#${x.map((v, i) => Math.round(v * share + y[i]! * (1 - share)).toString(16).padStart(2, "0")).join("")}`;
};

export type TrailRgb = readonly [number, number, number];

/** Hex of the ladder, the values of `--palette-<hue>-<step>` in app.css (a test compares them, so they cannot drift). */
export const PALETTE_HEX: Record<PaletteName, Partial<Record<PaletteStep, string>>> = {
  blue: { 50: "#f1f8ff", 100: "#e3f0ff", 200: "#cae2ff", 300: "#a4cfff", 400: "#70b4ff", 500: "#0a93ff", 600: "#0076d4", 700: "#0067b8", 800: "#005093", 900: "#073b6b" },
  green: { 50: "#f1faf2", 100: "#e2f4e5", 200: "#c7eacd", 300: "#a4daae", 400: "#7ac38a", 500: "#3ea95e", 600: "#238644", 700: "#23793e", 800: "#1a5f30", 900: "#154623" },
  ocre: { 50: "#fbf6ee", 100: "#f8eddd", 200: "#f2dcbd", 300: "#e6c594", 400: "#d2a865", 500: "#bd8514", 600: "#9a6b01", 700: "#875d01", 800: "#6a4801", 900: "#4e3505" },
  violet: { 50: "#faf4ff", 100: "#f6e9ff", 200: "#eed4ff", 300: "#e2b7fd", 400: "#cd94ef", 500: "#b769e2", 600: "#9651bc", 700: "#8346a4", 800: "#673682", 900: "#4b285f" },
};

/** The one trail palette (kept as a list: the renderers index their colour table by palette). */
export const TRAIL_PALETTES = ["trail"] as const;
export const PALETTE_COUNT = TRAIL_PALETTES.length;

/** Every route takes the one palette. */
export const paletteOf = (_order: number): number => 0;

/** Bands from tail to head. */
export const TRAIL_BANDS = 5;
/** Entries per palette in the colour list: the bands, the lit head, the spark. */
export const TRAIL_PER_PALETTE = TRAIL_BANDS + 2;
/** Entries in all: 4 palettes x (bands + lit + spark). */
export const TRAIL_ENTRIES = PALETTE_COUNT * TRAIL_PER_PALETTE;

export type TrailScheme = "light" | "dark";
/** A step of one hue's ladder. */
export type TrailStep = readonly [PaletteName, PaletteStep];
export interface TrailSteps {
  tail: TrailStep;
  head: TrailStep;
  lit: TrailStep;
  spark: TrailStep;
}
export const TRAIL_STEPS: Record<TrailScheme, TrailSteps> = {
  light: { tail: ["blue", 500], head: ["violet", 700], lit: ["violet", 800], spark: ["violet", 900] },
  dark: { tail: ["blue", 500], head: ["violet", 400], lit: ["violet", 200], spark: ["violet", 50] },
};

const hexOf = ([name, step]: TrailStep): string => PALETTE_HEX[name][step]!;
const rgb = (h: string): TrailRgb => {
  const [r, g, b] = hexToRgb(h);
  return [r / 255, g / 255, b / 255];
};

/** Index of an entry in the colour list. `band` 0..TRAIL_BANDS-1; `kind`: "lit" or "spark" instead of a band. */
export const trailIndex = (palette: number, band: number | "lit" | "spark"): number =>
  paletteOf(palette) * TRAIL_PER_PALETTE + (band === "lit" ? TRAIL_BANDS : band === "spark" ? TRAIL_BANDS + 1 : Math.max(0, Math.min(TRAIL_BANDS - 1, band)));

/** The band of a position along the leg (0 = origin, 1 = destination): the tail's band is 0 and the head's TRAIL_BANDS - 1. */
export const bandOf = (fraction: number): number => Math.max(0, Math.min(TRAIL_BANDS - 1, Math.floor(fraction * TRAIL_BANDS)));

/** The hex colours of the list for a scheme (see `trailIndex`): the bands from the tail's blue to the head's violet, the lit head, the spark. */
export function trailHex(scheme: TrailScheme): string[] {
  const s = TRAIL_STEPS[scheme];
  const out: string[] = [];
  for (let b = 0; b < TRAIL_BANDS; b++) out.push(mixHex(hexOf(s.head), hexOf(s.tail), b / (TRAIL_BANDS - 1)));
  out.push(hexOf(s.lit), hexOf(s.spark));
  return out;
}

/** The colours of the list for a scheme, 0..1 sRGB: what the globe's shader takes as uniforms and the street pass as palette entries. */
export const trailColors = (scheme: TrailScheme): TrailRgb[] => trailHex(scheme).map(rgb);

/** The scheme of a page colour: dark when its luminance is under a half. */
export const schemeOf = (background: TrailRgb): TrailScheme => (0.2126 * background[0] + 0.7152 * background[1] + 0.0722 * background[2] < 0.5 ? "dark" : "light");

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (c: TrailRgb) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
/** WCAG contrast ratio of two opaque colours (0..1 sRGB). */
export const trailContrast = (a: TrailRgb, b: TrailRgb): number => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

/**
 * The spark at the head of a leg, in art pixels counted back from the destination. The place's box (the detection box, with its plate) covers
 * the last cells of every leg that arrives at it, so the spark sits just OUTSIDE it: it starts `clear` cells back from the destination.
 * From there `line` cells of the line itself are drawn in the spark colour (even in the gap of a dash), and between `crossFrom` and
 * `crossTo` (counted from the start of the spark) a 3-cell wide bar crosses it (the two extra copies the rail's ticks use): a faint leg
 * gets a small plus, a selected one a 3 x 3 dot on a short stem. (On the street map the box is hollow and the spark is a circle at the
 * destination itself: a MapLibre layer cannot be offset by cells along a line.)
 */
export const SPARK = {
  faint: { clear: 3.5, line: 3, crossFrom: 1, crossTo: 2 },
  lit: { clear: 4.5, line: 4, crossFrom: 0, crossTo: 3 },
} as const;
