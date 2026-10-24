/**
 * The land's own picture (`surfaceMaterial`, engine/materials.ts: NASA's Blue Marble as a dot matrix, denser where the ground is darker, `public/media/earth-grey.png`) is a layer
 * for the UNZOOMED views: whole at the page's resting view and for the whole of the range below the country borders, and thinning out (fewer dots, from `from` to `to`, the zoom of
 * the unified camera) only over the last stretch before the borders come on (`TUNING.borderZoom`), which take its place. At rest it is a little under its full strength (`rest`);
 * the interlude brings it to its whole (`landShare`, 0..1, the caption's own easing).
 */
export const SURFACE = {
  url: "/media/earth-grey.png",
  /** How far from the page's colour its tones are at the page's resting view (1: whole); the interlude brings it to 1. */
  rest: 0.8,
  from: 2.2,
  to: 3.2,
} as const;

/** How much of the land's picture is there at `zoom`: 1 up to `from`, thinning smoothly to 0 at `to` (taken out in the dither, 0..1). */
export function surfaceFade(zoom: number): number {
  const t = Math.min(1, Math.max(0, (zoom - SURFACE.from) / (SURFACE.to - SURFACE.from)));
  return 1 - t * t * (3 - 2 * t);
}

/** How strong its tones are, 0..1: `rest` at the page's own view, 1 for the interlude (`landShare`, 0..1, the caption's own easing). */
export function surfaceStrength(landShare: number): number {
  return SURFACE.rest + (1 - SURFACE.rest) * Math.min(1, Math.max(0, landShare));
}
